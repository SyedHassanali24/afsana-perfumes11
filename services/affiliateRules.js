// Pure referral, discount and commission rules. Kept separate for deterministic unit tests.
const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;
const normalizeCode = (value) => String(value == null ? "" : value).trim().toUpperCase();
function validatePartner(partner, { subtotal = 0, customerId, now = new Date() } = {}) {
  if (!partner || !partner.isActive || partner.isDeleted) return "This referral code is not available.";
  if (partner.startsAt && new Date(partner.startsAt) > now) return "This referral code is not active yet.";
  if (partner.expiresAt && new Date(partner.expiresAt) < now) return "This referral code has expired.";
  if (partner.minOrder && subtotal < partner.minOrder) return `Minimum order for this code is PKR ${partner.minOrder}.`;
  if (partner.usageLimit && (partner.usedCount || 0) >= partner.usageLimit) return "This referral code has reached its usage limit.";
  if (customerId && partner.perCustomerLimit > 0) {
    const used = (partner.redemptions || []).filter((r) => String(r.customerId) === String(customerId)).length;
    if (used >= partner.perCustomerLimit) return "You have already used this referral code.";
  }
  return null;
}
function discountFor(partner, subtotal, shippingFee = 0) {
  const base = Math.max(0, Number(subtotal) || 0);
  const type = partner && partner.discountType || "none";
  const value = Math.max(0, Number(partner && partner.discountValue) || 0);
  if (type === "percentage") {
    let discount = Math.floor(base * Math.min(100, value) / 100);
    if (partner.maxDiscount > 0) discount = Math.min(discount, partner.maxDiscount);
    return { discount, shippingDiscount: 0 };
  }
  if (type === "fixed") return { discount: Math.min(base, value), shippingDiscount: 0 };
  if (type === "free_shipping") return { discount: 0, shippingDiscount: Math.max(0, Number(shippingFee) || 0) };
  return { discount: 0, shippingDiscount: 0 };
}
function commissionFor(partner, netMerchandise) {
  const base = Math.max(0, Number(netMerchandise) || 0);
  const value = Math.max(0, Number(partner && partner.commissionValue) || 0);
  if (!base || !value) return { baseAmount: base, amount: 0 };
  const amount = partner.commissionType === "fixed"
    ? Math.min(base, Math.round(value))
    : Math.min(base, Math.floor(base * Math.min(100, value) / 100));
  return { baseAmount: base, amount };
}
function slugCode(name, prefix = "AFS") {
  const slug = String(name || "PARTNER").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 18) || "PARTNER";
  return (prefix + "-" + slug).slice(0, 30);
}
module.exports = { CODE_RE, normalizeCode, validatePartner, discountFor, commissionFor, slugCode };
