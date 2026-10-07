const { Coupon } = require('../database/models');
const { E, ApiError } = require('../middleware/errors');
const { paging, pageMeta, escapeRegex } = require('../middleware/pagination');
const { audit } = require('./audit');
const R = require('./couponRules');

const shape = (c, now = new Date()) => ({
  id: c._id, code: c.code, type: c.type, value: c.value, minOrder: c.minOrder || 0, maxDiscount: c.maxDiscount || null,
  firstOrderOnly: !!c.firstOrderOnly, usageLimit: c.usageLimit || null, perCustomerLimit: c.perCustomerLimit ?? 1, usedCount: c.usedCount || 0,
  startsAt: c.startsAt || null, expiresAt: c.expiresAt || null, isActive: !!c.isActive, isDeleted: !!c.isDeleted,
  status: R.couponStatus(c, now), createdAt: c.createdAt,
});
const keyFields = (c) => ({ code: c.code, type: c.type, value: c.value, minOrder: c.minOrder, maxDiscount: c.maxDiscount, usageLimit: c.usageLimit, perCustomerLimit: c.perCustomerLimit, startsAt: c.startsAt, expiresAt: c.expiresAt, isActive: c.isActive });
const invalid = (errs) => new ApiError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', errs);

async function list(q) {
  const { page, limit, skip } = paging(q);
  const now = new Date();
  const and = [{ isDeleted: !!q.trash }];
  if (q.q) and.push({ code: new RegExp(escapeRegex(q.q), 'i') });
  if (q.status && !q.trash) { const f = R.statusFilter(q.status, now); if (f) and.push(f); }
  const filter = { $and: and };
  const [rows, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);
  return { coupons: rows.map((c) => shape(c, now)), pagination: pageMeta(total, page, limit) };
}

async function get(id) {
  const c = await Coupon.findOne({ _id: id }).lean();
  if (!c) throw E.notFound('Coupon not found.');
  return { coupon: shape(c) };
}

async function create(ctx, body) {
  const data = R.normalizeInput(body);
  const errs = R.crossFieldErrors(data);
  if (errs.length) throw invalid(errs);
  const same = await Coupon.findOne({ code: data.code }).select('isDeleted').lean();
  if (same) throw E.conflict(same.isDeleted ? 'This code is in Trash. Restore it instead.' : 'A coupon with this code already exists.', [{ path: 'code', message: same.isDeleted ? 'Code is in Trash.' : 'Code already used.' }], 'DUPLICATE');
  const c = await Coupon.create(data);
  await audit(ctx, { action: 'coupon.created', module: 'coupons', recordId: c._id, newValue: keyFields(c) });
  return { coupon: shape(c) };
}

async function update(ctx, id, body) {
  const c = await Coupon.findOne({ _id: id, isDeleted: false });
  if (!c) throw E.notFound('Coupon not found.');
  const before = keyFields(c);
  const merged = { ...c.toObject(), ...body };
  const data = R.normalizeInput(merged);
  const errs = R.crossFieldErrors(data);
  if (data.code !== c.code && c.usedCount > 0) errs.push({ path: 'code', message: 'The code cannot be changed after the coupon has been used.' });
  if (errs.length) throw invalid(errs);
  if (data.code !== c.code) {
    const same = await Coupon.findOne({ code: data.code, _id: { $ne: c._id } }).select('isDeleted').lean();
    if (same) throw E.conflict('A coupon with this code already exists.', [{ path: 'code', message: same.isDeleted ? 'Code is in Trash.' : 'Code already used.' }], 'DUPLICATE');
  }
  for (const k of ['code', 'type', 'value', 'minOrder', 'maxDiscount', 'firstOrderOnly', 'usageLimit', 'perCustomerLimit', 'startsAt', 'expiresAt', 'isActive']) c.set(k, data[k]); // missing key -> cleared
  await c.save();
  await audit(ctx, { action: 'coupon.updated', module: 'coupons', recordId: id, oldValue: before, newValue: keyFields(c) });
  return { coupon: shape(c) };
}

async function setActive(ctx, id, isActive) {
  const c = await Coupon.findOne({ _id: id, isDeleted: false });
  if (!c) throw E.notFound('Coupon not found.');
  const was = c.isActive;
  c.isActive = !!isActive;
  await c.save();
  await audit(ctx, { action: 'coupon.active_changed', module: 'coupons', recordId: id, oldValue: { isActive: was }, newValue: { isActive: c.isActive, code: c.code } });
  return { coupon: shape(c) };
}

async function remove(ctx, id) {
  const c = await Coupon.findOne({ _id: id, isDeleted: false });
  if (!c) throw E.notFound('Coupon not found.');
  await Coupon.updateOne({ _id: id }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user._id, isActive: false } });
  await audit(ctx, { action: 'coupon.deleted', module: 'coupons', recordId: id, oldValue: { code: c.code } });
  return {};
}

// A restored coupon stays INACTIVE; the admin switches it on deliberately.
async function restore(ctx, id) {
  const c = await Coupon.findOne({ _id: id, isDeleted: true });
  if (!c) throw E.notFound('Coupon not found in Trash.');
  await Coupon.updateOne({ _id: id }, { $set: { isDeleted: false, isActive: false }, $unset: { deletedAt: 1, deletedBy: 1 } });
  await audit(ctx, { action: 'coupon.restored', module: 'coupons', recordId: id, newValue: { code: c.code } });
  const fresh = await Coupon.findById(id).lean();
  return { coupon: shape(fresh) };
}

module.exports = { list, get, create, update, setActive, remove, restore };
