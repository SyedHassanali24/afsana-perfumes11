const { AffiliatePartner } = require('../database/models');
const { slugCode } = require('./affiliateRules');

async function ensureStaffPartner(staff) {
  const existing = await AffiliatePartner.findOne({ userId: staff.userId, type: 'staff', isDeleted: false });
  if (existing) return existing;
  const base = slugCode(staff.name, 'STAFF').slice(0, 24);
  const suffix = String(staff._id).slice(-4).toUpperCase();
  const code = (base + '-' + suffix).slice(0, 30);
  return AffiliatePartner.create({
    name: staff.name, code, type: 'staff', userId: staff.userId, staffId: staff._id,
    discountType: 'none', discountValue: 0, commissionType: 'percentage', commissionValue: 0,
    isActive: true,
  });
}
module.exports = { ensureStaffPartner };
