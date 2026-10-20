// Pure rules for the staff Customers screen (no DB, no I/O), so tests/customerRules.test.js can run them.
const { escapeRegex } = require('../middleware/pagination');

const SEGMENTS = ['New', 'Repeat', 'VIP', 'Inactive'];
const isHidden = (denied, key) => Boolean(denied && (denied.has ? denied.has(key) : [...denied].includes(key)));

// Fields the admin search may look at. A role that may not SEE the phone must not be able to find customers BY phone either.
function searchFields(denied) {
  return isHidden(denied, 'customer.phone') ? ['name', 'email'] : ['name', 'email', 'phone'];
}
// -> array of Mongo conditions to $and together (search text + group). Empty when there is nothing to filter.
function filterParts({ q, segment } = {}, denied) {
  const parts = [];
  const text = String(q || '').trim();
  if (text) { const r = new RegExp(escapeRegex(text), 'i'); parts.push({ $or: searchFields(denied).map((f) => ({ [f]: r })) }); }
  if (segment && SEGMENTS.includes(segment)) parts.push({ segment });
  return parts;
}
// [{ _id: 'VIP', n: 2 }, ...] -> { New: 0, Repeat: 0, VIP: 2, Inactive: 0 } (unknown / missing groups are counted as New)
function countsFromGroups(rows) {
  const out = Object.fromEntries(SEGMENTS.map((s) => [s, 0]));
  for (const r of rows || []) out[SEGMENTS.includes(r._id) ? r._id : 'New'] += r.n || 0;
  return out;
}
// What a staff member may see of one customer. Phone / addresses are REMOVED (not blanked) when the role may not see them,
// and `hidden` says so, so the screen can show "Hidden" instead of an empty value.
function shapeCustomer(c, denied) {
  const hidden = { phone: isHidden(denied, 'customer.phone'), address: isHidden(denied, 'customer.address') };
  const out = {
    _id: c._id, name: c.name, email: c.email || '', city: c.city || '', segment: c.segment || 'New',
    stats: { ordersCount: (c.stats && c.stats.ordersCount) || 0, totalSpent: (c.stats && c.stats.totalSpent) || 0, lastOrderAt: (c.stats && c.stats.lastOrderAt) || null },
    loyaltyPoints: c.loyaltyPoints || 0, notes: c.notes || '', createdAt: c.createdAt,
  };
  if (!hidden.phone) out.phone = c.phone || '';
  if (!hidden.address) out.addresses = (c.addresses || []).map((a) => ({ ...a, ...(hidden.phone ? { phone: undefined } : {}) }));
  return { customer: out, hidden };
}
// PATCH body -> the $set to apply (only fields the body actually carries).
function patchFrom(body) {
  const set = {};
  if (body.segment !== undefined) set.segment = body.segment;
  if (body.notes !== undefined) set.notes = body.notes;
  return set;
}
module.exports = { SEGMENTS, searchFields, filterParts, countsFromGroups, shapeCustomer, patchFrom };
