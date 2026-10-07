// Phase 7 — returns & refunds. Business rules live in returnRules.js (pure, tested); this file loads data and writes it.
// Every state-changing operation first "touches" the order (returnRevision++) inside the transaction. Two people acting on the
// same order at once therefore conflict, one is retried, and it then sees the other's result -> no over-returning, no double refund.
const { Order, OrderItem, Payment, Customer, Return, Refund, Notification, Setting, nextNumber } = require('../database/models');
const { E } = require('../middleware/errors');
const { paging, pageMeta, escapeRegex } = require('../middleware/pagination');
const { scopeFilter } = require('../middleware/permissions');
const { withTx } = require('./tx');
const { audit } = require('./audit');
const { receiveReturnedItems } = require('./inventoryService');
const R = require('./returnRules');

const RETURN_SCOPE = { createdBy: 'createdBy', assignedTo: 'assignedTo', cities: 'city', stores: 'storeId' };
const ORDER_SCOPE = { createdBy: 'createdBy', assignedTo: 'assignedTo', cities: 'shippingAddress.city', stores: 'storeId' };
const EVENT = { Pending: 'Return Requested', Approved: 'Return Approved', Rejected: 'Return Declined', Received: 'Items Received', Refunded: 'Refund Issued', Cancelled: 'Return Cancelled' };
const pkr = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
const sum = (a, f) => a.reduce((n, x) => n + f(x), 0);

async function returnSettings() {
  const s = await Setting.findOne({ key: 'returns' }).lean();
  const d = Number(s && s.value && s.value.windowDays);
  return { windowDays: Number.isFinite(d) && d >= 1 && d <= 90 ? Math.floor(d) : R.DEFAULT_WINDOW_DAYS };
}

// ---------------- shaping ----------------
const lineOut = (l) => ({ orderItemId: l.orderItemId, name: l.name, sku: l.sku, sizeMl: l.sizeMl, unitPrice: l.unitPrice, quantity: l.quantity });
function shapeAdmin(r) {
  return {
    id: r._id, returnNumber: r.returnNumber, orderId: r.orderId, orderNumber: r.orderNumber, status: r.status, reason: r.reason, details: r.details,
    source: r.source, decisionNote: r.decisionNote, condition: r.condition, receivedAt: r.receivedAt, refundedAt: r.refundedAt, refundedAmount: r.refundedAmount || 0,
    customer: { name: r.customer && r.customer.name, phone: r.customer && r.customer.phone }, city: r.city,
    items: (r.items || []).map(lineOut), unitCount: sum(r.items || [], (i) => i.quantity), value: sum(r.items || [], (i) => i.unitPrice * i.quantity),
    timeline: (r.timeline || []).map((t) => ({ event: t.event, status: t.status, note: t.note, at: t.at })), createdAt: r.createdAt,
  };
}
// The shopper never sees staff ids, internal handling notes or cost data.
const shapeMine = (r) => ({
  returnNumber: r.returnNumber, orderNumber: r.orderNumber, status: r.status, reason: r.reason, details: r.details, decisionNote: r.decisionNote,
  items: (r.items || []).map((i) => ({ name: i.name, sizeMl: i.sizeMl, quantity: i.quantity })), refundedAmount: r.refundedAmount || 0,
  createdAt: r.createdAt, canCancel: ['Pending', 'Approved'].includes(r.status), timeline: (r.timeline || []).map((t) => ({ event: t.event, at: t.at })),
});

// Shared by the shopper and staff "can I return this?" screens.
function eligibility(order, orderItems, returns, cfg, opts = {}) {
  const remaining = R.remainingByItem(orderItems, returns);
  const can = R.returnability(order, remaining, { windowDays: cfg.windowDays, ignoreWindow: opts.ignoreWindow });
  const w = can.window || R.returnWindow(order, cfg.windowDays);
  return {
    eligible: can.ok, code: can.code, message: can.message,
    window: { deliveredAt: w.deliveredAt, deadline: w.deadline, windowDays: w.windowDays },
    lines: orderItems.map((oi) => ({ orderItemId: oi._id, name: oi.name, sku: oi.sku, sizeMl: oi.sizeMl, image: oi.image, unitPrice: oi.unitPrice, quantity: oi.quantity, remaining: remaining.get(String(oi._id)) || 0 })),
  };
}

// Keeps the order status in step with its returns (compare-and-set, same transaction).
async function syncOrderStatus(order, orderItems, returns, byUserId, session) {
  const next = R.deriveOrderStatus(order.status, sum(orderItems, (i) => i.quantity), returns);
  if (next === order.status) return order.status;
  const ok = await Order.findOneAndUpdate({ _id: order._id, status: order.status },
    { $set: { status: next }, $push: { timeline: { event: R.ORDER_EVENT[next] || next, status: next, by: byUserId } } }, { new: true, session });
  if (!ok) throw E.conflict('This order was just updated by someone else. Please refresh.');
  return next;
}
const lockOrder = (orderId, session) => Order.findOneAndUpdate({ _id: orderId }, { $inc: { returnRevision: 1 } }, { new: true, session });

// ---------------- create (shopper or staff) ----------------
async function createReturn({ orderFilter, body, source, ctx, cfg }) {
  const found = await Order.findOne(orderFilter).select('_id').lean();
  if (!found) throw E.notFound('We could not find that order.');
  const returnNumber = await nextNumber('return', 'RET');
  const created = await withTx(async (session) => {
    const order = await lockOrder(found._id, session);
    const orderItems = await OrderItem.find({ orderId: order._id }).session(session).lean();
    const returns = await Return.find({ orderId: order._id }).session(session).lean();
    const remaining = R.remainingByItem(orderItems, returns);
    const can = R.returnability(order, remaining, { windowDays: cfg.windowDays, ignoreWindow: source === 'staff' }); // staff may accept a late return
    if (!can.ok) throw E.conflict(can.message, undefined, can.code);
    const bad = R.validateLines(body.items, remaining);
    if (bad) throw E.badRequest(bad);
    const by = new Map(orderItems.map((oi) => [String(oi._id), oi]));
    const items = body.items.map((l) => { const oi = by.get(String(l.orderItemId)); return { orderItemId: oi._id, productId: oi.productId, variantId: oi.variantId, name: oi.name, sku: oi.sku, sizeMl: oi.sizeMl, unitPrice: oi.unitPrice, quantity: l.quantity }; });
    const actor = ctx && ctx.user ? ctx.user._id : undefined;
    const [doc] = await Return.create([{
      returnNumber, orderId: order._id, orderNumber: order.orderNumber, customerId: order.customerId,
      customer: { name: order.customer && order.customer.name, phone: order.customer && order.customer.phone }, city: order.shippingAddress && order.shippingAddress.city,
      items, reason: body.reason, details: body.details || undefined, source, status: 'Pending',
      timeline: [{ event: EVENT.Pending, status: 'Pending', by: actor }], createdBy: actor, assignedTo: order.assignedTo,
    }], { session });
    await syncOrderStatus(order, orderItems, [...returns, doc.toObject()], actor, session);
    if (ctx && ctx.user) await audit(ctx, { action: 'return.created', module: 'returns', recordId: doc._id, newValue: { returnNumber, orderNumber: order.orderNumber, reason: body.reason, source } }, session);
    return doc;
  });
  await Notification.create({ type: 'return_request', title: 'New return request', body: `${created.returnNumber} · ${created.orderNumber}`, link: '/admin/returns', forPermission: 'returns.view' }).catch(() => {});
  return created;
}

// ---------------- shopper ----------------
async function eligibilityMine(customerId, orderNumber) {
  const order = await Order.findOne({ orderNumber: String(orderNumber).toUpperCase(), customerId }).lean();
  if (!order) throw E.notFound('Order not found.');
  const [orderItems, returns, cfg] = await Promise.all([OrderItem.find({ orderId: order._id }).sort({ _id: 1 }).lean(), Return.find({ orderId: order._id }).lean(), returnSettings()]);
  return eligibility(order, orderItems, returns, cfg);
}
async function createMine(customer, body) {
  const cfg = await returnSettings();
  const doc = await createReturn({ orderFilter: { orderNumber: body.orderNumber, customerId: customer._id }, body, source: 'customer', ctx: null, cfg });
  return { return: shapeMine(doc.toObject()) };
}
async function listMine(customerId, q) {
  const { page, limit, skip } = paging(q);
  const filter = { customerId, ...(q.orderNumber ? { orderNumber: q.orderNumber } : {}) };
  const [rows, total] = await Promise.all([Return.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Return.countDocuments(filter)]);
  return { returns: rows.map(shapeMine), pagination: pageMeta(total, page, limit) };
}
async function getMine(customerId, returnNumber) {
  const r = await Return.findOne({ returnNumber: String(returnNumber).toUpperCase(), customerId }).lean();
  if (!r) throw E.notFound('Return not found.');
  return { return: shapeMine(r) };
}
async function cancelMine(customer, returnNumber) {
  const pre = await Return.findOne({ returnNumber: String(returnNumber).toUpperCase(), customerId: customer._id }).select('orderId').lean();
  if (!pre) throw E.notFound('Return not found.');
  const updated = await withTx(async (session) => {
    const order = await lockOrder(pre.orderId, session);
    const cur = await Return.findOne({ _id: pre._id }).session(session);
    if (!R.canTransition(cur.status, 'Cancelled')) throw E.conflict(cur.status === 'Cancelled' ? 'This return is already cancelled.' : 'This return can no longer be cancelled. Please contact us.', undefined, 'NOT_CANCELLABLE');
    const upd = await Return.findOneAndUpdate({ _id: cur._id, status: cur.status }, { $set: { status: 'Cancelled' }, $push: { timeline: { event: EVENT.Cancelled, status: 'Cancelled' } } }, { new: true, session });
    if (!upd) throw E.conflict('This return was just updated. Please refresh.');
    const orderItems = await OrderItem.find({ orderId: order._id }).session(session).lean();
    const returns = await Return.find({ orderId: order._id }).session(session).lean();
    await syncOrderStatus(order, orderItems, returns, undefined, session);
    return upd;
  });
  return { return: shapeMine(updated.toObject()) };
}

// ---------------- staff ----------------
async function list(ctx, q, scopes) {
  const { page, limit, skip } = paging(q);
  const scope = scopeFilter(scopes, ctx.user._id, RETURN_SCOPE);
  const filter = { ...scope };
  if (q.status) filter.status = q.status;
  if (q.q) { const r = new RegExp(escapeRegex(q.q), 'i'); filter.$and = [{ $or: [{ returnNumber: r }, { orderNumber: r }, { 'customer.name': r }, { 'customer.phone': r }] }]; }
  const [rows, total, counts] = await Promise.all([
    Return.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Return.countDocuments(filter),
    Return.aggregate([{ $match: scope }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  return { returns: rows.map(shapeAdmin), pagination: pageMeta(total, page, limit), counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) };
}
async function get(ctx, id, scopes) {
  const r = await Return.findOne({ _id: id, ...scopeFilter(scopes, ctx.user._id, RETURN_SCOPE) }).lean();
  if (!r) throw E.notFound('Return not found.');
  const order = await Order.findById(r.orderId).select('orderNumber status paymentMethod paymentStatus subtotal discount shipping total').lean();
  const orderItems = await OrderItem.find({ orderId: r.orderId }).sort({ _id: 1 }).lean();
  const returns = await Return.find({ orderId: r.orderId }).select('status items').lean();
  const allRefunds = await Refund.find({ orderId: r.orderId }).sort({ createdAt: 1 }).lean();
  const already = sum(allRefunds, (x) => x.amount);
  const refunds = ctx.perms.can('refunds', 'view') ? allRefunds : []; // amounts paid back are only listed for staff who may view refunds
  const others = returns.filter((x) => String(x._id) !== String(r._id)); // units used by the OTHER returns on this order
  const remaining = R.remainingByItem(orderItems, others);
  const canIssue = r.status === 'Received' && ['Paid', 'Partially Refunded'].includes(order.paymentStatus) && R.refundCap(order, already) > 0;
  return {
    return: shapeAdmin(r),
    order: order && { id: order._id, orderNumber: order.orderNumber, status: order.status, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, subtotal: order.subtotal, discount: order.discount, shipping: order.shipping, total: order.total },
    refund: { canIssue, alreadyRefunded: already, cap: R.refundCap(order, already), suggested: R.suggestedRefund(order, orderItems, r.items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity })), r.reason, remaining, already) },
    refunds: refunds.map((x) => ({ id: x._id, amount: x.amount, method: x.method, reference: x.reference, reason: x.reason, at: x.createdAt, returnId: x.returnId })),
  };
}
async function eligibilityStaff(ctx, orderNumber, scopes) {
  const order = await Order.findOne({ orderNumber: String(orderNumber).toUpperCase(), ...scopeFilter(scopes, ctx.user._id, ORDER_SCOPE) }).lean();
  if (!order) throw E.notFound('We could not find that order.');
  const [orderItems, returns, cfg] = await Promise.all([OrderItem.find({ orderId: order._id }).sort({ _id: 1 }).lean(), Return.find({ orderId: order._id }).lean(), returnSettings()]);
  return { orderNumber: order.orderNumber, customer: { name: order.customer && order.customer.name }, ...eligibility(order, orderItems, returns, cfg, { ignoreWindow: true }) };
}
async function createStaff(ctx, body, scopes) {
  const cfg = await returnSettings();
  const doc = await createReturn({ orderFilter: { orderNumber: body.orderNumber, ...scopeFilter(scopes, ctx.user._id, ORDER_SCOPE) }, body, source: 'staff', ctx, cfg });
  return { return: shapeAdmin(doc.toObject()) };
}

async function setStatus(ctx, id, { status, note, condition }, scopes) {
  const pre = await Return.findOne({ _id: id, ...scopeFilter(scopes, ctx.user._id, RETURN_SCOPE) }).select('orderId').lean();
  if (!pre) throw E.notFound('Return not found.');
  const out = await withTx(async (session) => {
    const order = await lockOrder(pre.orderId, session);
    const cur = await Return.findById(id).session(session);
    if (!R.canTransition(cur.status, status)) throw E.badRequest(`Cannot change a return from "${cur.status}" to "${status}".`);
    const set = { status, handledBy: ctx.user._id, ...(note ? { decisionNote: note } : {}) };
    if (status === 'Received') { set.condition = condition; set.receivedAt = new Date(); }
    const upd = await Return.findOneAndUpdate({ _id: id, status: cur.status }, { $set: set, $push: { timeline: { event: EVENT[status], status, note, by: ctx.user._id } } }, { new: true, session });
    if (!upd) throw E.conflict('This return was just updated by someone else. Please refresh.');
    if (status === 'Received') await receiveReturnedItems(upd.items, order, ctx, session, condition);
    const orderItems = await OrderItem.find({ orderId: order._id }).session(session).lean();
    const returns = await Return.find({ orderId: order._id }).session(session).lean();
    await syncOrderStatus(order, orderItems, returns, ctx.user._id, session);
    await audit(ctx, { action: `return.${status.toLowerCase()}`, module: 'returns', recordId: id, oldValue: cur.status, newValue: { status, condition, note } }, session);
    return upd;
  });
  return { return: shapeAdmin(out.toObject()) };
}

// High risk: money leaves the business. Route requires refunds.refund + the actor's password; this writes the audit row.
async function issueRefund(ctx, id, { amount, method, reference, reason }, scopes) {
  const pre = await Return.findOne({ _id: id, ...scopeFilter(scopes, ctx.user._id, RETURN_SCOPE) }).select('orderId').lean();
  if (!pre) throw E.notFound('Return not found.');
  const out = await withTx(async (session) => {
    const order = await lockOrder(pre.orderId, session);
    const cur = await Return.findById(id).session(session);
    if (cur.status === 'Refunded') throw E.conflict('This return has already been refunded.', undefined, 'ALREADY_REFUNDED');
    if (cur.status !== 'Received') throw E.conflict('A refund can be issued only after the items have been received back.', undefined, 'NOT_RECEIVED');
    if (!['Paid', 'Partially Refunded'].includes(order.paymentStatus)) throw E.conflict('This order has no confirmed payment to refund.', undefined, 'NOT_PAID');
    const prior = await Refund.find({ orderId: order._id }).select('amount').session(session).lean();
    const already = sum(prior, (x) => x.amount);
    const cap = R.refundCap(order, already);
    if (amount > cap) throw E.badRequest(`The most that can still be refunded on this order is ${pkr(cap)}.`);
    const upd = await Return.findOneAndUpdate({ _id: id, status: 'Received' },
      { $set: { status: 'Refunded', refundedAt: new Date(), refundedAmount: amount, handledBy: ctx.user._id }, $push: { timeline: { event: EVENT.Refunded, status: 'Refunded', note: reason, by: ctx.user._id } } }, { new: true, session });
    if (!upd) throw E.conflict('This return was just updated by someone else. Please refresh.');
    const [refund] = await Refund.create([{ orderId: order._id, orderNumber: order.orderNumber, returnId: id, customerId: order.customerId, amount, reason, method, reference: reference || undefined, approvedBy: ctx.user._id }], { session });
    const payStatus = R.paymentStatusAfterRefund(order.total, already + amount, order.paymentStatus);
    await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: payStatus } }, { session });
    await Payment.updateMany({ orderId: order._id }, { $set: { status: payStatus } }, { session });
    if (order.customerId) await Customer.updateOne({ _id: order.customerId }, [{ $set: { 'stats.totalSpent': { $max: [0, { $subtract: [{ $ifNull: ['$stats.totalSpent', 0] }, amount] }] } } }], { session });
    const orderItems = await OrderItem.find({ orderId: order._id }).session(session).lean();
    const returns = await Return.find({ orderId: order._id }).session(session).lean();
    await syncOrderStatus(order, orderItems, returns, ctx.user._id, session);
    await audit(ctx, { action: 'refund.issued', module: 'refunds', recordId: refund._id, oldValue: { paymentStatus: order.paymentStatus, refundedSoFar: already }, newValue: { amount, method, reference, returnNumber: cur.returnNumber, orderNumber: order.orderNumber, paymentStatus: payStatus } }, session);
    return upd;
  });
  return { return: shapeAdmin(out.toObject()) };
}

module.exports = { returnSettings, eligibilityMine, createMine, listMine, getMine, cancelMine, list, get, eligibilityStaff, createStaff, setStatus, issueRefund, shapeAdmin, shapeMine };
