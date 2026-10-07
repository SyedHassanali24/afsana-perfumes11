const { Inventory, InventoryTransaction, ProductVariant, Notification } = require('../database/models');
const { E } = require('../middleware/errors');
const { withTx } = require('./tx');
const { audit } = require('./audit');

// Sorted order avoids deadlocks when two orders touch the same variants.
const sorted = (items) => [...items].sort((a, b) => String(a.variantId).localeCompare(String(b.variantId)));

async function reserveItems(items, session) {
  for (const it of sorted(items)) {
    const inv = await Inventory.reserve(it.variantId, it.quantity, { session });
    if (!inv) throw E.conflict('Some items are no longer available in the requested quantity.', { variantId: String(it.variantId) }, 'OUT_OF_STOCK');
  }
}
async function releaseItems(items, session) {
  for (const it of sorted(items)) await Inventory.release(it.variantId, it.quantity, { session });
}
// Shipped: reserved units physically leave. Logs an 'order' transaction per line.
async function commitItems(items, order, ctx, session) {
  for (const it of sorted(items)) {
    const inv = await Inventory.commit(it.variantId, it.quantity, { session });
    if (!inv) throw E.conflict('Stock record is inconsistent for this order.', { variantId: String(it.variantId) });
    await InventoryTransaction.create([{ variantId: it.variantId, productId: it.productId, type: 'order', delta: -it.quantity, before: inv.current + it.quantity, after: inv.current, ref: { kind: 'Order', id: order._id }, by: ctx.user._id }], { session });
  }
}
// Cancelling an already-shipped order puts units back on the shelf.
async function restockItems(items, order, ctx, session, type = 'order_cancel') {
  for (const it of sorted(items)) {
    const inv = await Inventory.findOneAndUpdate({ variantId: it.variantId }, { $inc: { current: it.quantity } }, { new: true, session });
    if (inv) await InventoryTransaction.create([{ variantId: it.variantId, productId: it.productId, type, delta: it.quantity, before: inv.current - it.quantity, after: inv.current, ref: { kind: 'Order', id: order._id }, by: ctx.user._id }], { session });
  }
}

// Goods coming back from a customer (Phase 7). Resellable units go back on the shelf; damaged ones never become sellable stock,
// they are only counted in `damaged` and logged (delta 0) so the history still shows what happened.
async function receiveReturnedItems(items, order, ctx, session, condition) {
  if (condition === 'Resellable') return restockItems(items, order, ctx, session, 'return');
  for (const it of sorted(items)) {
    const inv = await Inventory.findOneAndUpdate({ variantId: it.variantId }, { $inc: { damaged: it.quantity } }, { new: true, session });
    if (inv) await InventoryTransaction.create([{ variantId: it.variantId, productId: it.productId, type: 'return', delta: 0, before: inv.current, after: inv.current, reason: `Returned damaged (${it.quantity}) - not restocked`, ref: { kind: 'Order', id: order._id }, by: ctx.user._id }], { session });
  }
}

async function adjustStock(ctx, { variantId, type, quantity, reason }) {
  const result = await withTx(async (session) => {
    const variant = await ProductVariant.findOne({ _id: variantId, isDeleted: false }).session(session);
    if (!variant) throw E.notFound('Variant not found.');
    const delta = type === 'damaged' ? -quantity : quantity;
    const inc = type === 'damaged' ? { current: -quantity, damaged: quantity } : { current: quantity };
    // condition lives in the update: stock can never drop below units reserved for open orders
    const inv = await Inventory.findOneAndUpdate(
      { variantId, $expr: { $gte: [{ $add: ['$current', delta] }, '$reserved'] } },
      { $inc: inc }, { new: true, session });
    if (!inv) {
      if (!(await Inventory.exists({ variantId }).session(session))) throw E.notFound('No inventory record for this variant.');
      throw E.conflict('Cannot reduce stock below the units reserved for open orders.');
    }
    const before = inv.current - delta;
    await InventoryTransaction.create([{ variantId, productId: variant.productId, type, delta, before, after: inv.current, reason, by: ctx.user._id }], { session });
    await audit(ctx, { action: 'inventory.stock_changed', module: 'inventory', recordId: variantId, oldValue: { current: before }, newValue: { current: inv.current, type, reason } }, session);
    return inv;
  });
  if (result.current - result.reserved <= result.lowStockThreshold) {
    await Notification.create({ type: 'low_stock', title: 'Low stock', body: `Variant ${variantId} is at ${result.current - result.reserved} available`, link: '/admin/inventory', forPermission: 'inventory.view' });
  }
  return result;
}
module.exports = { reserveItems, releaseItems, commitItems, restockItems, receiveReturnedItems, adjustStock };
