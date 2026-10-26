const crypto = require('crypto');
const { Order, OrderItem, Payment, Customer, Coupon, Product, ProductVariant, Setting, Notification, Cart, nextNumber } = require('../database/models');
const { E } = require('../middleware/errors');
const { samePhone } = require('./phone');
const { paging: pg, pageMeta, escapeRegex } = require('../middleware/pagination');
const { scopeFilter } = require('../middleware/permissions');
const { effectivePrice, calcShipping, validateCoupon, calcDiscount, DEFAULT_SHIPPING } = require('./pricing');
const { reserveItems, releaseItems, commitItems, restockItems } = require('./inventoryService');
const { deliveryFor } = require('./shippingQuote');
const { publicShipment, staffShipment } = require('./shippingService');
const { withTx } = require('./tx');
const { audit } = require('./audit');
const R = require('./orderRules');

const SCOPE_MAP = { createdBy: 'createdBy', assignedTo: 'assignedTo', cities: 'shippingAddress.city', stores: 'storeId' };

const TRANSITIONS = {
  New: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Packed', 'Cancelled'],
  Processing: ['Packed', 'Cancelled'],
  Packed: ['Shipped', 'Cancelled'],
  Shipped: ['Out For Delivery', 'Delivered', 'Returned'],
  'Out For Delivery': ['Delivered', 'Returned'],
  // Phase 7: after delivery the order status is driven ONLY by the returns flow (services/returnService.js), so it can never
  // disagree with the Return records. Staff start a return from the Returns screen, not by editing the order status.
  Delivered: [], 'Return Requested': [],
  Cancelled: [], Returned: [], Refunded: [],
};
// (Return Requested / Returned / Refunded events are written by returnService, using returnRules.ORDER_EVENT)
const EVENT_NAME = { New: 'Order Placed', Confirmed: 'Order Confirmed', Packed: 'Order Packed', Shipped: 'Order Shipped', 'Out For Delivery': 'Out For Delivery', Delivered: 'Delivered', Cancelled: 'Cancelled', Returned: 'Returned', Refunded: 'Refunded' };

async function shippingSettings() {
  const s = await Setting.findOne({ key: 'shipping' }).lean();
  return { ...DEFAULT_SHIPPING, ...((s && s.value) || {}) };
}

// ---------------- checkout ----------------
// `cust` = logged-in shopper context (optional). Guests are matched by phone; logged-in shoppers order on their own account.
async function placeOrder(input, cust, idempotencyKey) {
  const key = String(idempotencyKey || '').trim();
  if (key && !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) throw E.badRequest('Invalid Idempotency-Key.');
  // 1. merge duplicate lines, load real data from DB
  const qty = new Map();
  for (const it of input.items) qty.set(it.variantId, (qty.get(it.variantId) || 0) + it.quantity);
  const ids = [...qty.keys()];
  const variants = await ProductVariant.find({ _id: { $in: ids }, isActive: true, isDeleted: false }).lean();
  const products = await Product.find({ _id: { $in: variants.map((v) => v.productId) }, status: 'Active', isDeleted: false }).lean();
  const pById = new Map(products.map((p) => [String(p._id), p]));
  if (variants.length !== ids.length || variants.some((v) => !pById.has(String(v.productId)))) throw E.conflict('Some items are no longer available.', undefined, 'ITEM_UNAVAILABLE');

  const lines = variants.map((v) => {
    const p = pById.get(String(v.productId)); const quantity = qty.get(String(v._id)); const unitPrice = effectivePrice(v);
    return { variantId: v._id, productId: p._id, categoryId: p.categoryId, name: `${p.name} ${v.label || v.sizeMl + 'ml'}`, sku: v.sku, sizeMl: v.sizeMl, image: ((p.media || []).find((m) => m.kind === 'main') || (p.media || [])[0] || {}).url, unitPrice, costPrice: v.costPrice, quantity, lineTotal: unitPrice * quantity };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  // delivery fee follows the shipping address city (zone rate), or the Settings fee when the city has no zone: same rule as the cart quote
  const shippingFee = (await deliveryFor(input.shippingAddress && input.shippingAddress.city, subtotal)).fee;

  // 2. customer (guest checkout keyed by phone)
  let customer;
  if (cust) customer = cust.customer;
  else {
    try {
      customer = await Customer.findOneAndUpdate(
        { phone: input.customer.phone, storeId: 'main', isDeleted: false },
        { $setOnInsert: { name: input.customer.name, phone: input.customer.phone, email: input.customer.email || undefined, city: input.shippingAddress.city } },
        { upsert: true, new: true },
      );
    } catch (err) {
      if (err?.code !== 11000) throw err;
      customer = await Customer.findOne({ phone: input.customer.phone, storeId: 'main', isDeleted: false });
      if (!customer) throw err;
    }
  }

  const requestHash = key ? crypto.createHash('sha256').update(JSON.stringify({ customerId: String(customer._id), input })).digest('hex') : null;
  if (key) {
    const existing = await Order.findOne({ idempotencyKey: key }).select('orderNumber total subtotal shipping discount status paymentMethod idempotencyHash').lean();
    if (existing) {
      if (existing.idempotencyHash !== requestHash) throw E.conflict('This Idempotency-Key was already used for a different checkout.', undefined, 'IDEMPOTENCY_CONFLICT');
      return { orderNumber: existing.orderNumber, total: existing.total, subtotal: existing.subtotal, shipping: existing.shipping, discount: existing.discount, status: existing.status, paymentMethod: existing.paymentMethod };
    }
  }

  // 3. Reserve stock + re-read coupon rules inside the transaction so checkout uses one consistent snapshot.
  let coupon = null; let discount = 0; let shippingDiscount = 0; let shipping = shippingFee; let total = subtotal + shippingFee;
  const orderNumber = await nextNumber('order', 'AFS');

  // 4. atomic: reserve stock + write order. If any unit is gone the whole thing rolls back.
  let order;
  try {
    order = await withTx(async (session) => {
    const currentVariants = await ProductVariant.find({ _id: { $in: ids }, isActive: true, isDeleted: false }).session(session).lean();
    const currentProducts = await Product.find({ _id: { $in: currentVariants.map((v) => v.productId) }, status: 'Active', isDeleted: false }).session(session).lean();
    const currentProductIds = new Set(currentProducts.map((p) => String(p._id)));
    if (currentVariants.length !== ids.length || currentVariants.some((v) => !currentProductIds.has(String(v.productId)))) throw E.conflict('Some items are no longer available. Please refresh your cart.', undefined, 'ITEM_UNAVAILABLE');
    if (currentVariants.some((v) => effectivePrice(v) !== lines.find((l) => String(l.variantId) === String(v._id)).unitPrice)) throw E.conflict('A product price changed. Please refresh your cart before placing the order.', undefined, 'PRICE_CHANGED');
    await reserveItems(lines, session);

    const txCustomer = await Customer.findById(customer._id).session(session);
    if (!txCustomer) throw E.conflict('Customer record is no longer available.');

    if (input.couponCode) {
      coupon = await Coupon.findOne({ code: input.couponCode.toUpperCase(), isDeleted: false }).session(session);
      const customerUses = coupon ? (coupon.usage || []).filter((u) => String(u.customerId) === String(txCustomer._id)).length : 0;
      validateCoupon(coupon, { subtotal, customerId: txCustomer._id, customerUses, isFirstOrder: (txCustomer.stats && txCustomer.stats.ordersCount || 0) === 0 });
      ({ discount, shippingDiscount } = calcDiscount(coupon, lines, shippingFee));
      shipping = shippingFee - shippingDiscount;
      total = subtotal - discount + shipping;
    }

    if (coupon) {
      const used = await Coupon.findOneAndUpdate(
        { _id: coupon._id, $expr: { $and: [
          { $or: [{ $not: ['$usageLimit'] }, { $lt: ['$usedCount', '$usageLimit'] }] },
          { $or: [
            { $eq: [{ $ifNull: ['$perCustomerLimit', 0] }, 0] },
            { $lt: [
              { $size: { $filter: {
                input: { $ifNull: ['$usage', []] }, as: 'u',
                cond: { $eq: ['$$u.customerId', customer._id] },
              } } },
              '$perCustomerLimit',
            ] },
          ] },
        ] } },
        { $inc: { usedCount: 1 }, $push: { usage: { customerId: customer._id, orderId: orderNumber, at: new Date() } } }, { new: true, session });
      if (!used) throw E.badRequest('This coupon has reached its usage limit.');
    }
    const [o] = await Order.create([{
      orderNumber, customerId: customer._id, customer: input.customer, shippingAddress: input.shippingAddress,
      subtotal, shipping, discount, total, couponCode: coupon ? coupon.code : undefined,
      paymentMethod: input.paymentMethod, status: 'New', paymentStatus: 'Pending',
      timeline: [{ event: 'Order Placed', status: 'New' }],
      ...(key ? { idempotencyKey: key, idempotencyHash: requestHash } : {}),
    }], { session });
    await OrderItem.insertMany(lines.map(({ categoryId, ...l }) => ({ ...l, orderId: o._id, lineTotal: l.lineTotal })), { session });
    await Payment.create([{ orderId: o._id, method: input.paymentMethod, amount: total, status: 'Pending' }], { session });
    await Customer.updateOne({ _id: customer._id }, { $inc: { 'stats.ordersCount': 1 }, $set: { 'stats.lastOrderAt': new Date() } }, { session });
    return o;
    });
  } catch (err) {
    if (key && (err?.code === 11000 || err?.codeName === 'DuplicateKey')) {
      const existing = await Order.findOne({ idempotencyKey: key }).select('orderNumber total subtotal shipping discount status paymentMethod idempotencyHash').lean();
      if (existing) {
        if (existing.idempotencyHash !== requestHash) throw E.conflict('This Idempotency-Key was already used for a different checkout.', undefined, 'IDEMPOTENCY_CONFLICT');
        return { orderNumber: existing.orderNumber, total: existing.total, subtotal: existing.subtotal, shipping: existing.shipping, discount: existing.discount, status: existing.status, paymentMethod: existing.paymentMethod };
      }
    }
    throw err;
  }
  if (cust) await Cart.deleteOne({ customerId: customer._id }).catch(() => {}); // saved cart is emptied once the order exists
  if (order && order.orderNumber === orderNumber) await Notification.create({ type: 'new_order', title: 'New order', body: `${order.orderNumber} · ${order.total}`, link: '/admin/orders', forPermission: 'orders.view' }).catch(() => {});
  return { orderNumber: order.orderNumber, total, subtotal, shipping, discount, status: order.status, paymentMethod: order.paymentMethod };
}

// ---------------- public tracking (order number + phone must both match) ----------------
async function trackOrder(orderNumber, phone) {
  // The phone is compared by its digits (0300 1234567 = 03001234567 = +92 300 1234567), not as typed. Wrong number and unknown order give the same answer.
  const o = await Order.findOne({ orderNumber: orderNumber.toUpperCase() }).select('_id orderNumber status timeline createdAt paymentStatus customer.phone').lean();
  if (!o || !samePhone(o.customer && o.customer.phone, phone)) throw E.notFound('We could not find an order with those details.');
  return { order: { orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, placedAt: o.createdAt, timeline: o.timeline.map((t) => ({ event: t.event, at: t.at })), shipment: await publicShipment(o._id) } };
}

// ---------------- logged-in shopper: own orders only (filtered by customerId, never by URL alone) ----------------
async function listMine(customerId, q) {
  const { page, limit, skip } = pg(q);
  const [orders, total] = await Promise.all([
    Order.find({ customerId }).select('orderNumber status paymentStatus paymentMethod total createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments({ customerId }),
  ]);
  const items = orders.length ? await OrderItem.find({ orderId: { $in: orders.map((o) => o._id) } }).select('orderId image quantity').lean() : [];
  const by = new Map();
  for (const it of items) { const k = String(it.orderId); const e = by.get(k) || { count: 0, images: [] }; e.count += it.quantity; if (it.image && e.images.length < 3) e.images.push(it.image); by.set(k, e); }
  return {
    orders: orders.map((o) => ({ orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, total: o.total, placedAt: o.createdAt, itemCount: (by.get(String(o._id)) || {}).count || 0, images: (by.get(String(o._id)) || {}).images || [] })),
    pagination: pageMeta(total, page, limit),
  };
}
async function cancelMine(customerId, orderNumber) {
  return withTx(async (session) => {
    const order = await Order.findOne({ customerId, orderNumber: orderNumber.toUpperCase() }).session(session);
    if (!order) throw E.notFound('Order not found.');
    if (!R.canCustomerCancel(order.status)) throw E.conflict('This order can no longer be cancelled online. Please contact support if you need help.');

    // Compare-and-set prevents a simultaneous staff confirmation from racing with customer cancellation.
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, customerId, status: 'New' },
      { $set: { status: 'Cancelled', cancelledReason: 'Cancelled by customer' },
        $push: { timeline: { event: 'Cancelled by customer', status: 'Cancelled', note: 'Cancelled by customer' } } },
      { new: true, session },
    );
    if (!updated) throw E.conflict('This order was just updated. Refresh the page and try again.');
    const items = await OrderItem.find({ orderId: order._id }).session(session).lean();
    await releaseItems(items, session);
    return { orderNumber: updated.orderNumber, status: updated.status };
  });
}
async function getMine(customerId, orderNumber) {
  const o = await Order.findOne({ customerId, orderNumber: orderNumber.toUpperCase() }).lean();
  if (!o) throw E.notFound('Order not found.');
  const items = await OrderItem.find({ orderId: o._id }).select('variantId name sku sizeMl image unitPrice quantity lineTotal').lean(); // no costPrice
  return { order: {
    orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, placedAt: o.createdAt,
    subtotal: o.subtotal, shipping: o.shipping, discount: o.discount, total: o.total, couponCode: o.couponCode,
    shippingAddress: o.shippingAddress, items, timeline: (o.timeline || []).map((t) => ({ event: t.event, at: t.at })), // internal notes/staff ids stay server-side
    shipment: await publicShipment(o._id), // courier + tracking link, never staff notes
  } };
}

// ---------------- admin ----------------
async function listOrders(q, scopes, uid, denied) { // denied = ctx.perms.deniedFields (Set of field keys the role may not see)
  const { page, limit, skip } = pg(q);
  const filter = { ...scopeFilter(scopes, uid, SCOPE_MAP) };
  if (q.status) filter.status = q.status;
  if (q.paymentStatus) filter.paymentStatus = q.paymentStatus;
  if (q.q) { const r = new RegExp(escapeRegex(q.q), 'i'); filter.$and = [{ $or: R.searchFields(denied).map((f) => ({ [f]: r })) }]; }
  const [orders, total] = await Promise.all([
    Order.find(filter).select('orderNumber customer shippingAddress.city total paymentMethod paymentStatus status createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  return { orders, pagination: pageMeta(total, page, limit) };
}
async function getOrder(id, scopes, uid) {
  const order = await Order.findOne({ _id: id, ...scopeFilter(scopes, uid, SCOPE_MAP) }).lean();
  if (!order) throw E.notFound('Order not found.');
  const items = await OrderItem.find({ orderId: id }).lean();
  const payments = await Payment.find({ orderId: id }).lean();
  const shipment = await staffShipment(id);
  return { order: { ...order, items, payments, shipment } };
}

async function changeStatus(ctx, id, status, note, scopes) {
  const scoped = await Order.exists({ _id: id, ...scopeFilter(scopes, ctx.user._id, SCOPE_MAP) });
  if (!scoped) throw E.notFound('Order not found.');
  return withTx(async (session) => {
    const order = await Order.findById(id).session(session);
    if (!(TRANSITIONS[order.status] || []).includes(status)) throw E.badRequest(`Cannot change status from "${order.status}" to "${status}".`);
    // compare-and-set so two staff clicking at once cannot both apply effects
    const updated = await Order.findOneAndUpdate({ _id: id, status: order.status },
      { $set: { status, ...(status === 'Cancelled' && note ? { cancelledReason: note } : {}) }, $push: { timeline: { event: EVENT_NAME[status] || status, status, note, by: ctx.user._id } } }, { new: true, session });
    if (!updated) throw E.conflict('This order was just updated by someone else. Please refresh.');
    const items = await OrderItem.find({ orderId: id }).session(session).lean();

    if (status === 'Shipped' && !order.stockCommitted) { await commitItems(items, order, ctx, session); await Order.updateOne({ _id: id }, { $set: { stockCommitted: true } }, { session }); }
    const effect = R.stockEffect(status, order.stockCommitted); // Cancelled -> restock/release; Returned (parcel came back) -> restock
    if (effect === 'restock') await restockItems(items, order, ctx, session);
    else if (effect === 'restock_return') await restockItems(items, order, ctx, session, 'return');
    else if (effect === 'release') await releaseItems(items, session);
    if (status === 'Delivered') {
      if (order.paymentMethod === 'COD') { await Payment.updateMany({ orderId: id }, { $set: { status: 'Paid', receivedBy: ctx.user._id, receivedAt: new Date() } }, { session }); await Order.updateOne({ _id: id }, { $set: { paymentStatus: 'Paid' } }, { session }); }
      if (order.customerId && order.status !== 'Return Requested') await Customer.updateOne({ _id: order.customerId }, { $inc: { 'stats.totalSpent': order.total } }, { session });
    }
    await audit(ctx, { action: 'order.status_changed', module: 'orders', recordId: id, oldValue: order.status, newValue: status }, session);
    return updated;
  });
}
async function addNote(ctx, id, text, scopes) {
  const o = await Order.findOneAndUpdate({ _id: id, ...scopeFilter(scopes, ctx.user._id, SCOPE_MAP) }, { $push: { internalNotes: { text, by: ctx.user._id } } }, { new: true });
  if (!o) throw E.notFound('Order not found.');
  return o;
}
async function setPayment(ctx, id, { paymentStatus, reference }, scopes) {
  const o = await Order.findOne({ _id: id, ...scopeFilter(scopes, ctx.user._id, SCOPE_MAP) });
  if (!o) throw E.notFound('Order not found.');
  const old = o.paymentStatus;
  if (!R.canSetPayment(old, paymentStatus)) throw E.conflict(`Payment status cannot change from ${old} to ${paymentStatus}.`);
  await withTx(async (session) => {
    // compare-and-set against the exact status observed above: concurrent payment edits cannot overwrite each other.
    const locked = await Order.findOneAndUpdate(
      { _id: id, paymentStatus: old },
      { $set: { paymentStatus } },
      { new: true, session },
    );
    if (!locked) throw E.conflict('This order payment was just updated. Refresh and try again.');
    await Payment.updateMany({ orderId: id }, { $set: { status: paymentStatus, reference, ...(paymentStatus === 'Paid' ? { receivedBy: ctx.user._id, receivedAt: new Date() } : {}) } }, { session });
    await audit(ctx, { action: 'payment.status_changed', module: 'payments', recordId: id, oldValue: old, newValue: paymentStatus }, session);
  });
}
module.exports = { SCOPE_MAP, TRANSITIONS, shippingSettings, placeOrder, trackOrder, listMine, getMine, cancelMine, listOrders, getOrder, changeStatus, addNote, setPayment };
