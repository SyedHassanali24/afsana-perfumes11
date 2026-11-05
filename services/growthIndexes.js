// Production runs with mongoose autoIndex:false. This migration is additive only:
// createIndexes adds missing indexes and never drops existing ones (unlike syncIndexes).
const { AffiliatePartner, AffiliateCommission, WhatsAppOutbox, AnalyticsEvent, Order } = require('../database/models');

let ready;
async function ensureGrowthIndexes() {
  if (!ready) {
    ready = Promise.all([
      AffiliatePartner.createIndexes(),
      Order.createIndexes(),
      AffiliateCommission.createIndexes(),
      WhatsAppOutbox.createIndexes(),
      AnalyticsEvent.createIndexes(),
    ]).catch((error) => {
      ready = null; // allow a later request to retry after a transient DB/index error
      throw error;
    });
  }
  await ready;
  return true;
}

module.exports = { ensureGrowthIndexes };
