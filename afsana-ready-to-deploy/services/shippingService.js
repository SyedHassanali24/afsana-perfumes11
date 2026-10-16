const { Courier, ShippingRate, Shipment, Order, Setting } = require('../database/models');
const { E } = require('../middleware/errors');
const { audit } = require('./audit');
const { scopeFilter } = require('../middleware/permissions');
const Rules = require('./shippingRules');

const SHIPMENT_STATUSES = Rules.SHIPMENT_STATUSES;
const safeCourier = (c) => ({ _id: c._id, name: c.name, trackingUrlTemplate: c.trackingUrlTemplate || '', apiStatus: c.apiStatus, isActive: c.isActive });
const safeRate = (r) => ({ _id: r._id, zone: r.zone || { name: '', cities: [] }, method: r.method || 'Standard', baseRate: r.baseRate || 0, freeAbove: r.freeAbove ?? null, estDays: r.estDays || '', isActive: r.isActive !== false });
async function listAdmin(scopes, uid) {
  const orderFilter = scopeFilter(scopes, uid, { cities: 'shippingAddress.city', stores: 'storeId', assignedTo: 'assignedTo', createdBy: 'createdBy' });
  const [couriers, rates, visibleOrders] = await Promise.all([
    Courier.find({}).sort({ name: 1 }).lean(), ShippingRate.find({}).sort({ 'zone.name': 1 }).lean(),
    Order.find(orderFilter).select('_id orderNumber customer.name shippingAddress.city').lean(),
  ]);
  const ids = visibleOrders.map(o => String(o._id));
  const shipments = ids.length ? await Shipment.find({ orderId: { $in: ids } }).sort({ updatedAt: -1 }).limit(100).populate('courierId', 'name trackingUrlTemplate').lean() : [];
  const orders = visibleOrders;
  const byOrder = new Map(orders.map(o => [String(o._id), o]));
  return { couriers: couriers.map(safeCourier), rates: rates.map(safeRate), shipments: shipments.map(s => ({ ...s, order: byOrder.get(String(s.orderId)) || null })) };
}
async function createCourier(ctx, body) {
  const courier = await Courier.create({ name: body.name.trim(), trackingUrlTemplate: body.trackingUrlTemplate || '', apiStatus: 'Manual', isActive: body.isActive !== false });
  await audit(ctx, { action: 'shipping.courier_created', module: 'shipping', recordId: courier._id, newValue: safeCourier(courier.toObject()) });
  return { courier: safeCourier(courier.toObject()) };
}
async function updateCourier(ctx, id, body) {
  const before = await Courier.findById(id); if (!before) throw E.notFound('Courier not found.');
  const courier = await Courier.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true });
  await audit(ctx, { action: 'shipping.courier_updated', module: 'shipping', recordId: id, oldValue: safeCourier(before.toObject()), newValue: safeCourier(courier.toObject()) });
  return { courier: safeCourier(courier.toObject()) };
}
async function createRate(ctx, body) {
  const rate = await ShippingRate.create({ zone: { name: body.zoneName.trim(), cities: body.cities }, method: body.method.trim(), baseRate: body.baseRate, freeAbove: body.freeAbove ?? null, estDays: body.estDays || '', isActive: body.isActive !== false });
  await audit(ctx, { action: 'shipping.rate_created', module: 'shipping', recordId: rate._id, newValue: safeRate(rate.toObject()) });
  return { rate: safeRate(rate.toObject()) };
}
async function updateRate(ctx, id, body) {
  const before = await ShippingRate.findById(id); if (!before) throw E.notFound('Shipping rate not found.');
  const patch = { ...body }; if (patch.zoneName !== undefined || patch.cities !== undefined) patch.zone = { name: patch.zoneName ?? before.zone?.name ?? '', cities: patch.cities ?? before.zone?.cities ?? [] };
  delete patch.zoneName; delete patch.cities;
  const rate = await ShippingRate.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  await audit(ctx, { action: 'shipping.rate_updated', module: 'shipping', recordId: id, oldValue: safeRate(before.toObject()), newValue: safeRate(rate.toObject()) });
  return { rate: safeRate(rate.toObject()) };
}

// Keeps the ORDER status in step with the SHIPMENT status. Every step goes through orderService.changeStatus (own transaction), so stock commit
// on Shipped, COD -> Paid on Delivered and restock on Returned behave exactly as when staff click the buttons in Orders.
// Needs the 'orders.changeStatus' permission; without it the shipment is still saved and the page says the order was left alone.
async function syncOrder(ctx, orderId, shipmentStatus) {
  const order = await Order.findById(orderId).select('status').lean();
  if (!order) return { changed: [], message: '' };
  const plan = Rules.orderStepsForShipment(order.status, shipmentStatus);
  if (!plan.steps.length) return { changed: [], message: plan.message };
  const orderScopes = ctx.perms.can('orders', 'changeStatus');
  if (!orderScopes) return { changed: [], message: `Shipment saved, but you do not have permission to change the order status. Someone with that permission must mark the order ${plan.steps[plan.steps.length - 1]}.` };
  const { changeStatus } = require('./orderService'); // lazy: orderService already requires this file
  const changed = [];
  for (const step of plan.steps) {
    try { await changeStatus(ctx, orderId, step, 'Updated automatically from the courier shipment', orderScopes); changed.push(step); }
    catch (e) { return { changed, message: `Shipment saved, but the order could not be moved to "${step}": ${e.message}` }; }
  }
  return { changed, message: '' };
}
async function createShipment(ctx, orderId, body, scopes) {
  const order = await Order.findOne({ _id: orderId, ...scopeFilter(scopes, ctx.user._id, { cities: 'shippingAddress.city', stores: 'storeId', assignedTo: 'assignedTo', createdBy: 'createdBy' }) }).lean();
  if (!order) throw E.notFound('Order not found.');
  if (!Rules.canCreateShipment(order.status)) throw E.conflict('Confirm and pack the order before creating a shipment.');
  const existing = await Shipment.findOne({ orderId }).lean();
  if (existing) throw E.conflict('A shipment already exists for this order. Update the existing shipment instead.');
  if (body.courierId && !await Courier.exists({ _id: body.courierId, isActive: true })) throw E.badRequest('Choose an active courier.');
  const shipment = await Shipment.create({ orderId, courierId: body.courierId || undefined, trackingNumber: body.trackingNumber || '', status: body.status || 'Pending', events: [{ status: body.status || 'Pending', note: body.note || 'Shipment created' }] });
  await audit(ctx, { action: 'shipping.shipment_created', module: 'shipping', recordId: shipment._id, newValue: { orderNumber: order.orderNumber, status: shipment.status, trackingNumber: shipment.trackingNumber } });
  const orderSync = shipment.status !== 'Pending' ? await syncOrder(ctx, orderId, shipment.status) : { changed: [], message: '' };
  return { shipment, orderSync };
}
async function updateShipment(ctx, id, body, scopes) {
  const shipment = await Shipment.findById(id); if (!shipment) throw E.notFound('Shipment not found.');
  const permittedOrder = await Order.exists({ _id: shipment.orderId, ...scopeFilter(scopes, ctx.user._id, { cities: 'shippingAddress.city', stores: 'storeId', assignedTo: 'assignedTo', createdBy: 'createdBy' }) });
  if (!permittedOrder) throw E.notFound('Shipment not found.');
  if (body.courierId && !await Courier.exists({ _id: body.courierId, isActive: true })) throw E.badRequest('Choose an active courier.');
  const oldStatus = shipment.status;
  for (const key of ['courierId', 'trackingNumber']) if (body[key] !== undefined) shipment[key] = body[key] || undefined;
  if (body.status && body.status !== oldStatus) {
    if (Rules.isShipmentTerminal(oldStatus)) throw E.conflict('A completed shipment cannot be changed. Contact an administrator if it needs correction.');
    shipment.status = body.status;
    shipment.events.push({ status: body.status, note: body.note || '', at: new Date() });
  } else if (body.note) shipment.events.push({ status: shipment.status, note: body.note, at: new Date() });
  await shipment.save();
  await audit(ctx, { action: 'shipping.shipment_updated', module: 'shipping', recordId: id, oldValue: { status: oldStatus }, newValue: { status: shipment.status, trackingNumber: shipment.trackingNumber } });
  const orderSync = shipment.status !== oldStatus ? await syncOrder(ctx, shipment.orderId, shipment.status) : { changed: [], message: '' };
  return { shipment, orderSync };
}
async function publicShipment(orderId) {
  const s = await Shipment.findOne({ orderId }).populate('courierId', 'name trackingUrlTemplate').lean();
  if (!s) return null;
  return { status: s.status, trackingNumber: s.trackingNumber || '', courier: s.courierId?.name || '', trackingUrl: Rules.trackingUrl(s.courierId, s.trackingNumber), events: (s.events || []).map(e => ({ status: e.status, note: e.note || '', at: e.at })) };
}
module.exports = { SHIPMENT_STATUSES, listAdmin, createCourier, updateCourier, createRate, updateRate, createShipment, updateShipment, publicShipment };
