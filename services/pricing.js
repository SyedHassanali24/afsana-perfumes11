// Pure pricing logic. The server ALWAYS computes prices; client-sent prices are never trusted.
const { E } = require('../middleware/errors');
const DEFAULT_SHIPPING = { flatRate: 250, freeAbove: 5000 }; // placeholder until Settings UI (Phase 9)

const effectivePrice = (v) => (v.salePrice > 0 && v.salePrice < v.price ? v.salePrice : v.price);
const calcShipping = (subtotal, s = DEFAULT_SHIPPING) => (subtotal >= s.freeAbove ? 0 : s.flatRate);

function validateCoupon(coupon, { subtotal, customerId, customerUses = 0, isFirstOrder = true, now = new Date() }) {
  const bad = (m) => E.badRequest(m, undefined);
  if (!coupon || !coupon.isActive || coupon.isDeleted) throw bad('This coupon is not valid.');
  if (coupon.startsAt && coupon.startsAt > now) throw bad('This coupon is not active yet.');
  if (coupon.expiresAt && coupon.expiresAt < now) throw bad('This coupon has expired.');
  if (coupon.minOrder && subtotal < coupon.minOrder) throw bad(`Minimum order for this coupon is ${coupon.minOrder}.`);
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw bad('This coupon has reached its usage limit.');
  if (customerId && coupon.perCustomerLimit && customerUses >= coupon.perCustomerLimit) throw bad('You have already used this coupon.');
  if (coupon.firstOrderOnly && !isFirstOrder) throw bad('This coupon is for first orders only.');
  if (coupon.customerIds && coupon.customerIds.length && !(customerId && coupon.customerIds.map(String).includes(String(customerId)))) throw bad('This coupon is not valid for your account.');
}

// lines: [{ productId, categoryId, lineTotal }]
function calcDiscount(coupon, lines, shippingFee) {
  const restricted = (coupon.productIds && coupon.productIds.length) || (coupon.categoryIds && coupon.categoryIds.length);
  const has = (arr, id) => (arr || []).map(String).includes(String(id));
  const eligible = lines.filter((l) => !restricted || has(coupon.productIds, l.productId) || has(coupon.categoryIds, l.categoryId))
    .reduce((s, l) => s + l.lineTotal, 0);
  if (restricted && eligible === 0) throw E.badRequest('This coupon does not apply to the items in your cart.');
  let discount = 0; let shippingDiscount = 0;
  if (coupon.type === 'percentage') { discount = Math.floor((eligible * coupon.value) / 100); if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount); }
  else if (coupon.type === 'fixed') discount = Math.min(coupon.value, eligible);
  else if (coupon.type === 'free_shipping') shippingDiscount = shippingFee;
  return { discount, shippingDiscount };
}
module.exports = { DEFAULT_SHIPPING, effectivePrice, calcShipping, validateCoupon, calcDiscount };
