const { Supplier, PurchaseOrder } = require('../database/models');
const { E } = require('../middleware/errors');
const { paging, pageMeta, escapeRegex } = require('../middleware/pagination');
const { audit } = require('./audit');
const { scopeFilter } = require('../middleware/permissions');
const SCOPE_MAP = { stores: 'storeId' };
const storeFilter = (scopes, uid) => scopeFilter(scopes, uid, SCOPE_MAP);
const createStoreId = (scopes) => {
  if (scopes?.some((s) => s.kind === 'all')) return 'main';
  const stores = [...new Set((scopes || []).filter((s) => s.kind === 'stores').flatMap((s) => s.values || []))];
  if (stores.length !== 1) throw E.forbidden('A supplier must belong to exactly one store in your access scope.');
  return stores[0];
};

const OPEN = ['Draft', 'Ordered', 'Partially Received'];
const shape = (s) => ({ id: s._id, name: s.name, contactPerson: s.contactPerson, phone: s.phone, email: s.email, address: s.address, paymentTerms: s.paymentTerms, notes: s.notes, isActive: s.isActive, createdAt: s.createdAt });

async function list(ctx, q, scopes) {
  const { page, limit, skip } = paging(q);
  const filter = { isDeleted: false, ...storeFilter(scopes, ctx.user._id) };
  if (q.active !== undefined) filter.isActive = q.active;
  if (q.q) { const r = new RegExp(escapeRegex(q.q), 'i'); filter.$or = [{ name: r }, { contactPerson: r }, { phone: r }]; }
  const [rows, total] = await Promise.all([Supplier.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(), Supplier.countDocuments(filter)]);
  return { suppliers: rows.map(shape), pagination: pageMeta(total, page, limit) };
}
async function create(ctx, body, scopes) {
  const storeId = createStoreId(scopes);
  const s = await Supplier.create({ ...body, email: body.email || undefined, storeId });
  await audit(ctx, { action: 'supplier.created', module: 'suppliers', recordId: s._id, newValue: { name: s.name } });
  return { supplier: shape(s) };
}
async function update(ctx, id, body, scopes) {
  const s = await Supplier.findOne({ _id: id, isDeleted: false, ...storeFilter(scopes, ctx.user._id) });
  if (!s) throw E.notFound('Supplier not found.');
  const before = { name: s.name, isActive: s.isActive };
  Object.assign(s, { ...body, ...(body.email === '' ? { email: undefined } : {}) });
  await s.save();
  await audit(ctx, { action: 'supplier.updated', module: 'suppliers', recordId: id, oldValue: before, newValue: { name: s.name, isActive: s.isActive } });
  return { supplier: shape(s) };
}
async function remove(ctx, id, scopes) {
  const s = await Supplier.findOne({ _id: id, isDeleted: false, ...storeFilter(scopes, ctx.user._id) });
  if (!s) throw E.notFound('Supplier not found.');
  const open = await PurchaseOrder.countDocuments({ supplierId: id, storeId: s.storeId, status: { $in: OPEN } });
  if (open) throw E.conflict(`${open} purchase order${open === 1 ? ' is' : 's are'} still open with this supplier.`);
  await Supplier.updateOne({ _id: id, ...storeFilter(scopes, ctx.user._id) }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user._id, isActive: false } });
  await audit(ctx, { action: 'supplier.deleted', module: 'suppliers', recordId: id, oldValue: { name: s.name } });
  return {};
}
module.exports = { list, create, update, remove };
