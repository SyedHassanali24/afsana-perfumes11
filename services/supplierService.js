const { Supplier, PurchaseOrder } = require('../database/models');
const { E } = require('../middleware/errors');
const { paging, pageMeta, escapeRegex } = require('../middleware/pagination');
const { audit } = require('./audit');

const OPEN = ['Draft', 'Ordered', 'Partially Received'];
const shape = (s) => ({ id: s._id, name: s.name, contactPerson: s.contactPerson, phone: s.phone, email: s.email, address: s.address, paymentTerms: s.paymentTerms, notes: s.notes, isActive: s.isActive, createdAt: s.createdAt });

async function list(q) {
  const { page, limit, skip } = paging(q);
  const filter = { isDeleted: false };
  if (q.active !== undefined) filter.isActive = q.active;
  if (q.q) { const r = new RegExp(escapeRegex(q.q), 'i'); filter.$or = [{ name: r }, { contactPerson: r }, { phone: r }]; }
  const [rows, total] = await Promise.all([Supplier.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(), Supplier.countDocuments(filter)]);
  return { suppliers: rows.map(shape), pagination: pageMeta(total, page, limit) };
}
async function create(ctx, body) {
  const s = await Supplier.create({ ...body, email: body.email || undefined });
  await audit(ctx, { action: 'supplier.created', module: 'suppliers', recordId: s._id, newValue: { name: s.name } });
  return { supplier: shape(s) };
}
async function update(ctx, id, body) {
  const s = await Supplier.findOne({ _id: id, isDeleted: false });
  if (!s) throw E.notFound('Supplier not found.');
  const before = { name: s.name, isActive: s.isActive };
  Object.assign(s, { ...body, ...(body.email === '' ? { email: undefined } : {}) });
  await s.save();
  await audit(ctx, { action: 'supplier.updated', module: 'suppliers', recordId: id, oldValue: before, newValue: { name: s.name, isActive: s.isActive } });
  return { supplier: shape(s) };
}
async function remove(ctx, id) {
  const s = await Supplier.findOne({ _id: id, isDeleted: false });
  if (!s) throw E.notFound('Supplier not found.');
  const open = await PurchaseOrder.countDocuments({ supplierId: id, status: { $in: OPEN } });
  if (open) throw E.conflict(`${open} purchase order${open === 1 ? ' is' : 's are'} still open with this supplier.`);
  await Supplier.updateOne({ _id: id }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user._id, isActive: false } });
  await audit(ctx, { action: 'supplier.deleted', module: 'suppliers', recordId: id, oldValue: { name: s.name } });
  return {};
}
module.exports = { list, create, update, remove };
