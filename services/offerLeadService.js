const { OfferLead } = require('../database/models');
const { paging, pageMeta, escapeRegex } = require('../middleware/pagination');
const { scopeFilter } = require('../middleware/permissions');

const SCOPE_MAP = { stores: 'storeId' };

async function list(query, scopes, uid, deniedFields) {
  const { page, limit, skip } = paging(query);
  const hiddenPhone = !!(deniedFields && (deniedFields.has ? deniedFields.has('customer.phone') : Array.isArray(deniedFields) && deniedFields.includes('customer.phone')));
  const and = [{ isDeleted: false }, scopeFilter(scopes, uid, SCOPE_MAP)];
  if (query.status) and.push({ status: query.status });
  if (query.q) {
    const term = new RegExp(escapeRegex(query.q), 'i');
    and.push({ $or: [{ email: term }, { phone: term }, { couponCode: term }] });
  }
  const filter = { $and: and };
  const [rows, total] = await Promise.all([
    OfferLead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    OfferLead.countDocuments(filter),
  ]);
  return {
    leads: rows.map((lead) => ({
      id: String(lead._id),
      email: lead.email,
      ...(hiddenPhone ? {} : { phone: lead.phone }),
      hidden: { phone: hiddenPhone },
      couponCode: lead.couponCode,
      source: lead.source,
      campaign: lead.campaign,
      status: lead.status,
      marketingConsent: !!lead.marketingConsent,
      marketingConsentAt: lead.marketingConsentAt,
      createdAt: lead.createdAt,
    })),
    pagination: pageMeta(total, page, limit),
  };
}

module.exports = { list };
