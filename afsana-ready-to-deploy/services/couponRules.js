// Pure coupon rules for the admin Coupons screen (no DB, no npm deps -> unit-tested with `node --test`).
// Checkout rules (validity, usage limits, discount maths) live in services/pricing.js and are NOT changed here.

const TYPES = ['percentage', 'fixed', 'free_shipping'];
const STATUSES = ['Active', 'Scheduled', 'Expired', 'Used up', 'Inactive'];
const CODE_RE = /^[A-Z0-9_-]{3,30}$/;

const normalizeCode = (s) => String(s == null ? '' : s).trim().toUpperCase();
const has = (v) => v !== undefined && v !== null && v !== '';
const toDate = (v) => (v instanceof Date ? v : new Date(v));

// Keeps only real coupon fields and forces them into a consistent shape:
// free_shipping always has value 0; maxDiscount only exists on percentage coupons; blank optional fields become undefined.
function normalizeInput(c) {
  const type = c.type;
  const out = {
    code: normalizeCode(c.code),
    type,
    value: type === 'free_shipping' ? 0 : Number(c.value || 0),
    minOrder: Number(c.minOrder || 0),
    firstOrderOnly: !!c.firstOrderOnly,
    perCustomerLimit: has(c.perCustomerLimit) ? Number(c.perCustomerLimit) : 1,
    isActive: c.isActive === undefined ? true : !!c.isActive,
  };
  if (type === 'percentage' && has(c.maxDiscount)) out.maxDiscount = Number(c.maxDiscount);
  if (has(c.usageLimit)) out.usageLimit = Number(c.usageLimit);
  if (has(c.startsAt)) out.startsAt = toDate(c.startsAt);
  if (has(c.expiresAt)) out.expiresAt = toDate(c.expiresAt);
  return out;
}

// Returns [{ path, message }] (empty = valid). Works on the FULL coupon (after merging a patch into the saved one).
function crossFieldErrors(c) {
  const errs = [];
  const add = (path, message) => errs.push({ path, message });
  if (!CODE_RE.test(normalizeCode(c.code))) add('code', 'Use 3-30 letters, numbers, - or _ (no spaces).');
  if (!TYPES.includes(c.type)) add('type', 'Choose a coupon type.');
  const value = Number(c.value || 0);
  if (c.type === 'percentage' && !(Number.isInteger(value) && value >= 1 && value <= 100)) add('value', 'Percentage must be a whole number from 1 to 100.');
  if (c.type === 'fixed' && !(value > 0)) add('value', 'Enter the discount amount (more than 0).');
  if (c.type === 'percentage' && has(c.maxDiscount) && !(Number(c.maxDiscount) > 0)) add('maxDiscount', 'Max discount must be more than 0.');
  if (Number(c.minOrder || 0) < 0) add('minOrder', 'Minimum order cannot be negative.');
  if (has(c.usageLimit) && !(Number.isInteger(Number(c.usageLimit)) && Number(c.usageLimit) >= 1)) add('usageLimit', 'Usage limit must be a whole number, 1 or more.');
  if (has(c.perCustomerLimit) && !(Number.isInteger(Number(c.perCustomerLimit)) && Number(c.perCustomerLimit) >= 0)) add('perCustomerLimit', 'Per-customer limit must be a whole number (0 = no limit).');
  if (has(c.startsAt) && has(c.expiresAt) && !(toDate(c.expiresAt) > toDate(c.startsAt))) add('expiresAt', 'Expiry must be after the start date.');
  return errs;
}

// Shown in the admin list. Same order as services/pricing.js validateCoupon (inactive -> not started -> expired -> used up).
function couponStatus(c, now = new Date()) {
  if (!c.isActive) return 'Inactive';
  if (c.startsAt && toDate(c.startsAt) > now) return 'Scheduled';
  if (c.expiresAt && toDate(c.expiresAt) < now) return 'Expired';
  if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit) return 'Used up';
  return 'Active';
}

// Mongo filter equal to couponStatus(). Returns null for an unknown/empty status.
function statusFilter(status, now = new Date()) {
  const notScheduled = { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] };
  const notExpired = { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] };
  const hasRoom = { $or: [{ usageLimit: null }, { usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] };
  switch (status) {
    case 'Inactive': return { isActive: false };
    case 'Scheduled': return { isActive: true, startsAt: { $gt: now } };
    case 'Expired': return { $and: [{ isActive: true }, notScheduled, { expiresAt: { $lt: now } }] };
    case 'Used up': return { $and: [{ isActive: true }, notScheduled, notExpired, { usageLimit: { $gt: 0 } }, { $expr: { $gte: ['$usedCount', '$usageLimit'] } }] };
    case 'Active': return { $and: [{ isActive: true }, notScheduled, notExpired, hasRoom] };
    default: return null;
  }
}

module.exports = { TYPES, STATUSES, CODE_RE, normalizeCode, normalizeInput, crossFieldErrors, couponStatus, statusFilter };
