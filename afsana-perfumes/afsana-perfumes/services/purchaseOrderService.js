const { PurchaseOrder, Supplier, ProductVariant, Inventory, InventoryTransaction, nextNumber } = require('../database/models');
const { E } = require('../middleware/errors');
const { paging, pageMeta, escapeRegex } = require('../middleware/pagination');
const { withTx } = require('./tx');
const { audit } = require('./audit');
const { poStatusAfterReceive, canTransition, remainingQty, poTotal } = require('./poRules');

const hideCost = (ctx) => ctx.perms.deniedFields.has('product.costPrice');
// Cost columns follow the same field rule as product cost price.
const shape = (ctx, po) => {
  const hide = hideCost(ctx);
  return {
    id: po._id, poNumber: po.poNumber, status: po.status, expectedDate: po.expectedDate, createdAt: po.createdAt,
    supplier: po.supplierId && po.supplierId.name ? { id: po.supplierId._id, name: po.supplierId.name } : { id: po.supplierId },
    totalCost: hide ? undefined : po.totalCost,
    itemCount: po.items.length, unitsOrdered: po.items.reduce((n, i) => n + i.quantity, 0), unitsReceived: po.items.reduce((n, i) => n + (i.receivedQuantity || 0), 0),
    items: po.items.map((i) => ({
      variantId: i.variantId && i.variantId._id ? i.variantId._id : i.variantId, productId: i.productId && i.productId._id ? i.productId._id : i.productId,
      productName: i.productId && i.productId.name, sku: i.variantId && i.variantId.sku, label: i.variantId && i.variantId.label,
      quantity: i.quantity, receivedQuantity: i.receivedQuantity || 0, costPerUnit: hide ? undefined : i.costPerUnit,
    })),
  };
};
const load = (q) => q.populate('supplierId', 'name').populate('items.productId', 'name').populate('items.variantId', 'sku label');

async function list(ctx, q) {
  const { page, limit, skip } = paging(q);
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.supplierId) filter.supplierId = q.supplierId;
  if (q.q) filter.poNumber = new RegExp(escapeRegex(q.q), 'i');
  const [rows, total] = await Promise.all([load(PurchaseOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)).lean(), PurchaseOrder.countDocuments(filter)]);
  return { orders: rows.map((r) => shape(ctx, r)), pagination: pageMeta(total, page, limit) };
}
async function get(ctx, id) {
  const po = await load(PurchaseOrder.findById(id)).lean();
  if (!po) throw E.notFound('Purchase order not found.');
  return { order: shape(ctx, po) };
}

async function buildItems(items) {
  const ids = items.map((i) => String(i.variantId));
  if (new Set(ids).size !== ids.length) throw E.badRequest('Each size can only appear once. Combine the quantities instead.');
  const variants = await ProductVariant.find({ _id: { $in: ids }, isDeleted: false }).select('productId').lean();
  if (variants.length !== ids.length) throw E.badRequest('One of the selected products/sizes no longer exists.');
  const byId = new Map(variants.map((v) => [String(v._id), v]));
  return items.map((i) => ({ productId: byId.get(String(i.variantId)).productId, variantId: i.variantId, quantity: i.quantity, costPerUnit: i.costPerUnit, receivedQuantity: 0 }));
}
async function activeSupplier(id) {
  const s = await Supplier.findOne({ _id: id, isDeleted: false });
  if (!s) throw E.badRequest('Supplier not found.');
  if (!s.isActive) throw E.badRequest('This supplier is inactive.');
  return s;
}

async function create(ctx, body) {
  await activeSupplier(body.supplierId);
  const items = await buildItems(body.items);
  const poNumber = await nextNumber('po', 'PO');
  const po = await PurchaseOrder.create({ poNumber, supplierId: body.supplierId, items, totalCost: poTotal(items), expectedDate: body.expectedDate, status: 'Draft', createdBy: ctx.user._id });
  await audit(ctx, { action: 'purchase_order.created', module: 'purchaseOrders', recordId: po._id, newValue: { poNumber, total: po.totalCost } });
  return get(ctx, po._id);
}
async function update(ctx, id, body) {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw E.notFound('Purchase order not found.');
  if (po.status !== 'Draft') throw E.conflict('Only draft purchase orders can be edited.');
  if (body.supplierId) { await activeSupplier(body.supplierId); po.supplierId = body.supplierId; }
  if (body.items) { po.items = await buildItems(body.items); po.totalCost = poTotal(po.items); }
  if (body.expectedDate !== undefined) po.expectedDate = body.expectedDate || undefined;
  await po.save();
  await audit(ctx, { action: 'purchase_order.updated', module: 'purchaseOrders', recordId: id, newValue: { total: po.totalCost } });
  return get(ctx, id);
}

// Draft -> Ordered: the stock is now "incoming".
async function markOrdered(ctx, id) {
  await withTx(async (session) => {
    const po = await PurchaseOrder.findById(id).session(session);
    if (!po) throw E.notFound('Purchase order not found.');
    if (!canTransition(po.status, 'Ordered')) throw E.conflict(`A ${po.status.toLowerCase()} purchase order can't be marked as ordered.`);
    for (const it of po.items) await Inventory.updateOne({ variantId: it.variantId }, { $inc: { incoming: it.quantity } }, { session });
    po.status = 'Ordered';
    await po.save({ session });
    await audit(ctx, { action: 'purchase_order.ordered', module: 'purchaseOrders', recordId: id, newValue: { poNumber: po.poNumber } }, session);
  });
  return get(ctx, id);
}

// Receiving adds real stock. Can be partial; several deliveries per PO are fine.
async function receive(ctx, id, body) {
  await withTx(async (session) => {
    const po = await PurchaseOrder.findById(id).session(session);
    if (!po) throw E.notFound('Purchase order not found.');
    if (!['Ordered', 'Partially Received'].includes(po.status)) throw E.conflict('Only ordered purchase orders can be received.');
    const lines = [];
    for (const r of body.items) {
      const it = po.items.find((x) => String(x.variantId) === String(r.variantId));
      if (!it) throw E.badRequest('That size is not on this purchase order.');
      const left = remainingQty(it);
      if (r.quantity > left) throw E.conflict(`Only ${left} more unit(s) are expected for this line.`, { variantId: String(r.variantId) });
      const inv = await Inventory.findOneAndUpdate({ variantId: it.variantId },
        [{ $set: { current: { $add: ['$current', r.quantity] }, incoming: { $max: [0, { $subtract: ['$incoming', r.quantity] }] } } }], { new: true, session });
      if (!inv) throw E.conflict('No inventory record for one of these sizes.');
      await InventoryTransaction.create([{ variantId: it.variantId, productId: it.productId, type: 'po_receive', delta: r.quantity, before: inv.current - r.quantity, after: inv.current, reason: `Received on ${po.poNumber}`, ref: { kind: 'PurchaseOrder', id: po._id }, by: ctx.user._id }], { session });
      it.receivedQuantity = (it.receivedQuantity || 0) + r.quantity;
      lines.push({ variantId: String(it.variantId), quantity: r.quantity });
    }
    po.status = poStatusAfterReceive(po.items);
    await po.save({ session });
    await audit(ctx, { action: 'purchase_order.received', module: 'purchaseOrders', recordId: id, newValue: { poNumber: po.poNumber, lines, status: po.status } }, session);
  });
  return get(ctx, id);
}

// Cancelling gives back the "incoming" units that were never received.
async function cancel(ctx, id) {
  await withTx(async (session) => {
    const po = await PurchaseOrder.findById(id).session(session);
    if (!po) throw E.notFound('Purchase order not found.');
    if (!canTransition(po.status, 'Cancelled')) throw E.conflict(`A ${po.status.toLowerCase()} purchase order can't be cancelled.`);
    if (po.status !== 'Draft') {
      for (const it of po.items) {
        const left = remainingQty(it);
        if (left > 0) await Inventory.updateOne({ variantId: it.variantId }, [{ $set: { incoming: { $max: [0, { $subtract: ['$incoming', left] }] } } }], { session });
      }
    }
    const was = po.status;
    po.status = 'Cancelled';
    await po.save({ session });
    await audit(ctx, { action: 'purchase_order.cancelled', module: 'purchaseOrders', recordId: id, oldValue: { status: was }, newValue: { poNumber: po.poNumber } }, session);
  });
  return get(ctx, id);
}

module.exports = { list, get, create, update, markOrdered, receive, cancel };
