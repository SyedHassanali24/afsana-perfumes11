'use strict';

const { AffiliatePartner } = require('../database/models');
const { slugCode } = require('./affiliateRules');

let indexesReady;
async function ensureStaffPartner(staff) {
  if (!indexesReady) indexesReady = AffiliatePartner.createIndexes().catch((error) => { indexesReady = null; throw error; });
  await indexesReady;
  const existing = await AffiliatePartner.findOne({ userId: staff.userId, type: 'staff', isDeleted: false });
  if (existing) return existing;
  const base = slugCode(staff.name, 'STAFF');
  const suffix = String(staff._id).slice(-5).toUpperCase();
  const code = (base + '-' + suffix).slice(0, 30);
  try {
    return await AffiliatePartner.create({
      name: staff.name, code, type: 'staff', userId: staff.userId, staffId: staff._id,
      discountType: 'none', discountValue: 0, commissionType: 'percentage', commissionValue: 0,
      isActive: true,
    });
  } catch (error) {
    if (error?.code === 11000 || error?.codeName === 'DuplicateKey') {
      const raced = await AffiliatePartner.findOne({ userId: staff.userId, type: 'staff', isDeleted: false });
      if (raced) return raced;
    }
    throw error;
  }
}
module.exports = { ensureStaffPartner };
