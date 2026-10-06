const { Order, OrderItem, Payment, Customer, Coupon, Product, ProductVariant, Setting, Notification, Cart, nextNumber } = require('../database/models');
const { E } = require('../middleware/errors');
const { paging: pg, pageMeta, escapeRegex } = require('../middleware/pagination');
const { scopeFilter } = require('../middleware/permissions');
const { effectivePrice, calcShipping, validateCoupon, calcDiscount, DEFAULT_SHIPPING } = require('./pricing');
const { reserveItems, releaseItems, commitItems, restockItems } = require('./inventoryService');
const { withTx } = require('./tx');
const { audit } = require('./audit');

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
async function placeOrder(input, cust) {
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
  const shipCfg = await shippingSettings();
  const shippingFee = calcShipping(subtotal, shipCfg);

  // 2. customer (guest checkout keyed by phone)
  const customer = cust ? cust.customer : await Customer.findOneAndUpdate({ phone: input.customer.phone, isDeleted: false },
    { $setOnInsert: { name: input.customer.name, phone: input.customer.phone, email: input.customer.email || undefined, city: input.shippingAddress.city } }, { upsert: true, new: true });

  // 3. coupon
  let coupon = null; let discount = 0; let shippingDiscount = 0;
  if (input.couponCode) {
    coupon = await Coupon.findOne({ code: input.couponCode.toUpperCase(), isDeleted: false });
    validateCoupon(coupon, { subtotal, customerId: customer._id, customerUses: coupon ? (coupon.usage || []).filter((u) => String(u.customerId) === String(customer._id)).length : 0, isFirstOrder: (customer.stats && customer.stats.ordersCount || 0) === 0 });
    ({ discount, shippingDiscount } = calcDiscount(coupon, lines, shippingFee));
  }
  const shipping = shippingFee - shippingDiscount;
  const total = subtotal - discount + shipping;
  const orderNumber = await nextNumber('order', 'AFS');

  // 4. atomic: reserve stock + write order. If any unit is gone the whole thing rolls back.
  const order = await withTx(async (session) => {
    await reserveItems(lines, session);
    if (coupon) {
      const used = await Coupon.findOneAndUpdate(
        { _id: coupon._id, $expr: { $or: [{ $not: ['$usageLimit'] }, { $lt: ['$usedCount', '$usageLimit'] }] } },
        { $inc: { usedCount: 1 }, $push: { usage: { customerId: customer._id } } }, { new: true, session });
      if (!used) throw E.badRequest('This coupon has reached its usage limit.');
    }
    const [o] = await Order.create([{
      orderNumber, customerId: customer._id, customer: input.customer, shippingAddress: input.shippingAddress,
      subtotal, shipping, discount, total, couponCode: coupon ? coupon.code : undefined,
      paymentMethod: input.paymentMethod, status: 'New', paymentStatus: 'Pending',
      timeline: [{ event: 'Order Placed', status: 'New' }],
    }], { session });
    await OrderItem.insertMany(lines.map(({ categoryId, ...l }) => ({ ...l, orderId: o._id, lineTotal: l.lineTotal })), { session });
    await Payment.create([{ orderId: o._id, method: input.paymentMethod, amount: total, status: 'Pending' }], { session });
    await Customer.updateOne({ _id: customer._id }, { $inc: { 'stats.ordersCount': 1 }, $set: { 'stats.lastOrderAt': new Date() } }, { session });
    return o;
  });
  if (cust) await Cart.deleteOne({ customerId: customer._id }).catch(() => {}); // saved cart is emptied once the order exists
  await Notification.create({ type: 'new_order', title: 'New order', body: `${orderNumber} · ${total}`, link: '/admin/orders', forPermission: 'orders.view' }).catch(() => {});
  return { orderNumber: order.orderNumber, total, subtotal, shipping, discount, status: order.status, paymentMethod: order.paymentMethod };
}

// ---------------- public tracking (order number + phone must both match) ----------------
async function trackOrder(orderNumber, phone) {
  const o = await Order.findOne({ orderNumber: orderNumber.toUpperCase(), 'customer.phone': phone }).select('orderNumber status timeline createdAt paymentStatus').lean();
  if (!o) throw E.notFound('We could not find an order with those details.');
  return { order: { orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, placedAt: o.createdAt, timeline: o.timeline.map((t) => ({ event: t.event, at: t.at })) } };
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
async function getMine(customerId, orderNumber) {
  const o = await Order.findOne({ customerId, orderNumber: orderNumber.toUpperCase() }).lean();
  if (!o) throw E.notFound('Order not found.');
  const items = await OrderItem.find({ orderId: o._id }).select('name sku sizeMl image unitPrice quantity lineTotal').lean(); // no costPrice
  return { order: {
    orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, placedAt: o.createdAt,
    subtotal: o.subtotal, shipping: o.shipping, discount: o.discount, total: o.total, couponCode: o.couponCode,
    shippingAddress: o.shippingAddress, items, timeline: (o.timeline || []).map((t) => ({ event: t.event, at: t.at })), // internal notes/staff ids stay server-side
  } };
}

// ---------------- admin ----------------
async function listOrders(q, scopes, uid) {
  const { page, limit, skip } = pg(q);
  const filter = { ...scopeFilter(scopes, uid, SCOPE_MAP) };
  if (q.status) filter.status = q.status;
  if (q.paymentStatus) filter.paymentStatus = q.paymentStatus;
  if (q.q) { const r = new RegExp(escapeRegex(q.q), 'i'); filter.$and = [{ $or: [{ orderNumber: r }, { 'customer.name': r }, { 'customer.phone': r }] }]; }
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
  return { order: { ...order, items, payments } };
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
    if (status === 'Cancelled') {
      if (order.stockCommitted) await restockItems(items, order, ctx, session); else await releaseItems(items, session);
    }
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
  await withTx(async (session) => {
    await Order.updateOne({ _id: id }, { $set: { paymentStatus } }, { session });
    await Payment.updateMany({ orderId: id }, { $set: { status: paymentStatus, reference, ...(paymentStatus === 'Paid' ? { receivedBy: ctx.user._id, receivedAt: new Date() } : {}) } }, { session });
    await audit(ctx, { action: 'payment.status_changed', module: 'payments', recordId: id, oldValue: old, newValue: paymentStatus }, session);
  });
}
module.exports = { TRANSITIONS, shippingSettings, placeOrder, trackOrder, listMine, getMine, listOrders, getOrder, changeStatus, addNote, setPayment };
