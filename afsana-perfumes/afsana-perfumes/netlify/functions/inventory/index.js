const { createHandler } = require('../../../middleware/withApi');
const { paging, pageMeta, escapeRegex } = require('../../../middleware/pagination');
const { redact } = require('../../../middleware/redact');
const { Inventory, InventoryTransaction, Product } = require('../../../database/models');
const S = require('../../../validation/schemas');
const { adjustStock } = require('../../../services/inventoryService');

const stockStatus = (i) => { const a = i.current - i.reserved; return a <= 0 ? 'out' : a <= i.lowStockThreshold ? 'low' : 'ok'; };

const routes = [
  { method: 'GET', path: '/', permission: ['inventory', 'view'], query: S.inventoryQuery,
    async handler({ query, ctx }) {
      const { page, limit, skip } = paging(query);
      const filter = {};
      if (query.productId) filter.productId = query.productId;
      if (query.q) { const r = new RegExp(escapeRegex(query.q), 'i'); const ps = await Product.find({ isDeleted: false, $or: [{ name: r }, { sku: r }] }).select('_id').limit(200); filter.productId = { $in: ps.map((p) => p._id) }; }
      if (query.low) filter.$expr = { $lte: [{ $subtract: ['$current', '$reserved'] }, '$lowStockThreshold'] };
      const [rows, total] = await Promise.all([
        Inventory.find(filter).populate('variantId', 'sku label sizeMl').populate('productId', 'name slug').sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
        Inventory.countDocuments(filter),
      ]);
      const items = rows.map((i) => ({ id: i._id, variantId: i.variantId && i.variantId._id, productId: i.productId && i.productId._id, productName: i.productId && i.productId.name, sku: i.variantId && i.variantId.sku, label: i.variantId && i.variantId.label,
        current: i.current, reserved: i.reserved, available: i.current - i.reserved, damaged: i.damaged, incoming: i.incoming, lowStockThreshold: i.lowStockThreshold, status: stockStatus(i) }));
      return { items: redact(items, ctx.perms.deniedFields), pagination: pageMeta(total, page, limit) };
    } },
  { method: 'GET', path: '/history', permission: ['inventory', 'view'], query: S.historyQuery,
    async handler({ query }) {
      const { page, limit, skip } = paging(query);
      const filter = {}; if (query.variantId) filter.variantId = query.variantId; if (query.type) filter.type = query.type;
      const [rows, total] = await Promise.all([
        InventoryTransaction.find(filter).populate('variantId', 'sku label').populate('productId', 'name').populate('by', 'email').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        InventoryTransaction.countDocuments(filter),
      ]);
      return { history: rows.map((t) => ({ id: t._id, type: t.type, delta: t.delta, before: t.before, after: t.after, reason: t.reason, productName: t.productId && t.productId.name, sku: t.variantId && t.variantId.sku, by: t.by && t.by.email, at: t.createdAt })), pagination: pageMeta(total, page, limit) };
    } },
  { method: 'POST', path: '/adjust', permission: ['inventory', 'manageStock'], body: S.adjustBody, reauth: true,
    async handler({ body, ctx }) {
      const inv = await adjustStock(ctx, body);
      return { stock: { current: inv.current, reserved: inv.reserved, available: inv.current - inv.reserved, damaged: inv.damaged } };
    } },
];
exports.handler = createHandler('inventory', routes);
