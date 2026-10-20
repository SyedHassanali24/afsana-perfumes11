const { Customer, Order } = require('../database/models');
const { E } = require('../middleware/errors');
const { paging, pageMeta } = require('../middleware/pagination');
const { scopeFilter } = require('../middleware/permissions');
const { audit } = require('./audit');
const R = require('./customerRules');

const SCOPE_MAP = { cities: 'city' }; // a role limited to some cities sees only customers of those cities
const ID = /^[a-f\d]{24}$/i;
const nonEmpty = (o) => o && Object.keys(o).length > 0;
const baseParts = (scopes, uid) => { const s = scopeFilter(scopes, uid, SCOPE_MAP); return [{ isDeleted: false }, ...(nonEmpty(s) ? [s] : [])]; };

// GET list: search (name / email / phone), group filter, page. `counts` follow the search and scope but NOT the group filter, so the chips show every group.
async function list(q, scopes, uid, denied) {
  const { page, limit, skip } = paging(q);
  const parts = baseParts(scopes, uid);
  const searchOnly = R.filterParts({ q: q.q }, denied);
  const withGroup = R.filterParts({ q: q.q, segment: q.segment }, denied);
  const filter = { $and: [...parts, ...withGroup] };
  const [rows, total, groups] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Customer.countDocuments(filter),
    Customer.aggregate([{ $match: { $and: [...parts, ...searchOnly] } }, { $group: { _id: '$segment', n: { $sum: 1 } } }]),
  ]);
  const customers = rows.map((c) => { const { customer, hidden } = R.shapeCustomer(c, denied); return { ...customer, hidden }; });
  return { customers, counts: R.countsFromGroups(groups), pagination: pageMeta(total, page, limit) };
}

async function findScoped(id, scopes, uid) {
  if (!ID.test(String(id))) throw E.notFound('Customer not found.');
  const c = await Customer.findOne({ $and: [{ _id: id }, ...baseParts(scopes, uid)] }).lean();
  if (!c) throw E.notFound('Customer not found.');
  return c;
}

// GET one: profile + last 20 orders. The order rows carry no phone or address.
async function get(id, scopes, uid, denied) {
  const c = await findScoped(id, scopes, uid);
  const orders = await Order.find({ customerId: c._id }).select('orderNumber status total paymentStatus createdAt').sort({ createdAt: -1 }).limit(20).lean();
  const { customer, hidden } = R.shapeCustomer(c, denied);
  return { customer, orders, hidden };
}

// PATCH: staff notes and group only (name / phone / email belong to the shopper's own account).
async function update(ctx, id, body, scopes) {
  const before = await findScoped(id, scopes, ctx.user._id);
  const set = R.patchFrom(body);
  if (!nonEmpty(set)) throw E.badRequest('Nothing to change.');
  const after = await Customer.findByIdAndUpdate(id, { $set: set }, { new: true, runValidators: true }).lean();
  await audit(ctx, { action: 'customer.updated', module: 'customers', recordId: id, oldValue: { segment: before.segment, notes: before.notes || '' }, newValue: { segment: after.segment, notes: after.notes || '' } });
  const { customer, hidden } = R.shapeCustomer(after, ctx.perms.deniedFields);
  return { customer, hidden };
}
module.exports = { list, get, update };
