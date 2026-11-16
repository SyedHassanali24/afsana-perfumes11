'use strict';

const { AffiliatePartner, AnalyticsEvent, Order, Coupon, Staff } = require('../database/models');
const { E } = require('../middleware/errors');
const { audit } = require('./audit');
const { ensureStaffPartner } = require('./staffReferral');
const { CODE_RE, normalizeCode } = require('./affiliateRules');
const D = require('./dashboardRules');

let indexesReady;
async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = Promise.all([
      AffiliatePartner.createIndexes(),
      Order.createIndexes(),
      AnalyticsEvent.createIndexes(),
    ]).catch((error) => { indexesReady = null; throw error; });
  }
  await indexesReady;
}
const money = (n) => Math.max(0, Number(n) || 0);
const isPaid = (status) => ['Paid', 'Partially Refunded'].includes(status);
const cleanPartner = (p) => ({
  id: p._id, name: p.name, code: p.code, type: p.type,
  platform: p.platform || '', handle: p.handle || '',
  discountType: p.discountType || 'none', discountValue: Number(p.discountValue) || 0,
  maxDiscount: Number(p.maxDiscount) || 0, minOrder: Number(p.minOrder) || 0,
  commissionType: p.commissionType || 'percentage', commissionValue: Number(p.commissionValue) || 0,
  usageLimit: p.usageLimit || null, perCustomerLimit: p.perCustomerLimit || 0,
  usedCount: p.usedCount || 0, isActive: !!p.isActive,
  startsAt: p.startsAt || null, expiresAt: p.expiresAt || null,
  referralUrl: (process.env.SITE_URL || 'https://afsanaperfumes.store') + '/?ref=' + encodeURIComponent(p.code),
});

function monthWindow(now = new Date(), count = 12) {
  const current = D.pktMonthStart(now);
  const from = D.pktMonthStart(now, count - 1);
  const months = [];
  for (let i = 0; i < count; i++) {
    const start = D.pktMonthStart(now, count - 1 - i);
    const key = D.pktDateKey(start).slice(0, 7);
    months.push({ key, label: new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' }).format(start) });
  }
  return { from, to: new Date(now.getTime() + 1), months };
}
function commissionEstimate(order) {
  const base = Math.max(0, Number(order.subtotal || 0) - Number(order.discount || 0) - Number(order.refunded || 0));
  const value = Math.max(0, Number(order.referral?.commissionValue) || 0);
  if (!base || !value || !isPaid(order.paymentStatus)) return 0;
  return order.referral?.commissionType === 'fixed'
    ? Math.min(base, Math.round(value))
    : Math.min(base, Math.floor(base * Math.min(100, value) / 100));
}

async function createInfluencer(ctx, body) {
  await ensureIndexes();
  const code = normalizeCode(body.code);
  if (!CODE_RE.test(code)) throw E.badRequest('Use 3–30 letters, numbers, hyphens or underscores for the code.');
  if (await AffiliatePartner.exists({ code, storeId: 'main', isDeleted: false }) ||
      await Coupon.exists({ code, storeId: 'main', isDeleted: false })) throw E.conflict('This code is already in use.');
  const discountType = body.discountType || 'none';
  const discountValue = money(body.discountValue);
  const commissionType = body.commissionType || 'percentage';
  const commissionValue = money(body.commissionValue);
  if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) throw E.badRequest('Discount percentage must be between 1 and 100.');
  if (commissionType === 'percentage' && commissionValue > 100) throw E.badRequest('Commission percentage cannot exceed 100.');
  const partner = await AffiliatePartner.create({
    name: body.name.trim(), code, type: 'influencer',
    platform: body.platform || '', handle: body.handle || '',
    discountType, discountValue, maxDiscount: body.maxDiscount || undefined,
    minOrder: money(body.minOrder), commissionType, commissionValue,
    usageLimit: body.usageLimit || undefined, perCustomerLimit: Number(body.perCustomerLimit) || 0,
    startsAt: body.startsAt || undefined, expiresAt: body.expiresAt || undefined,
    isActive: body.isActive !== false, createdBy: ctx.user._id,
  });
  await audit(ctx, { action: 'referral.partner_created', module: 'referrals', recordId: partner._id, newValue: { name: partner.name, code, type: partner.type } });
  return { partner: cleanPartner(partner) };
}

async function updatePartner(ctx, id, body) {
  const partner = await AffiliatePartner.findOne({ _id: id, storeId: 'main', isDeleted: false });
  if (!partner) throw E.notFound('Referral partner not found.');
  const before = { name: partner.name, code: partner.code, isActive: partner.isActive, discountType: partner.discountType, discountValue: partner.discountValue, commissionType: partner.commissionType, commissionValue: partner.commissionValue };
  for (const key of ['name','platform','handle','discountType','discountValue','maxDiscount','minOrder','commissionType','commissionValue','usageLimit','perCustomerLimit','startsAt','expiresAt','isActive']) {
    if (body[key] !== undefined) partner[key] = body[key];
  }
  if (body.name !== undefined && !String(body.name).trim()) throw E.badRequest('Partner name is required.');
  if (partner.discountType === 'percentage' && (!(partner.discountValue > 0) || partner.discountValue > 100)) throw E.badRequest('Discount percentage must be between 1 and 100.');
  if (partner.commissionType === 'percentage' && (partner.commissionValue < 0 || partner.commissionValue > 100)) throw E.badRequest('Commission percentage cannot exceed 100.');
  await partner.save();
  await audit(ctx, { action: 'referral.partner_updated', module: 'referrals', recordId: partner._id, oldValue: before, newValue: { name: partner.name, code: partner.code, isActive: partner.isActive, discountType: partner.discountType, discountValue: partner.discountValue, commissionType: partner.commissionType, commissionValue: partner.commissionValue } });
  return { partner: cleanPartner(partner) };
}

async function buildDashboard({ partnerId, now = new Date() } = {}) {
  await ensureIndexes();
  const { from, to, months } = monthWindow(now, 12);
  const staffRows = await Staff.find({ storeId: 'main', isDeleted: false, status: 'Active' }).select('_id userId name').lean();
  await Promise.all(staffRows.map((staff) => ensureStaffPartner(staff)));
  const partnerFilter = { storeId: 'main', isDeleted: false, ...(partnerId ? { _id: partnerId } : {}) };
  const partners = await AffiliatePartner.find(partnerFilter).sort({ type: 1, name: 1 }).limit(300).lean();
  if (!partners.length) return { range: { from: D.pktDateKey(from), to: D.pktDateKey(now) }, months, totals: emptyTotals(), partners: [], couponApplications: [] };
  const ids = partners.map((p) => p._id);
  const match = {
    storeId: 'main', 'referral.partnerId': { $in: ids },
    status: { $nin: ['Cancelled', 'Returned', 'Refunded'] },
    createdAt: { $gte: from, $lt: to },
  };
  const [monthlyRows, detailRows, visitRows] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $lookup: { from: 'refunds', localField: '_id', foreignField: 'orderId', as: 'refundRows' } },
      { $addFields: {
        refunded: { $ifNull: [{ $sum: '$refundRows.amount' }, 0] },
        commissionBase: { $multiply: [
          { $max: [0, { $subtract: ['$subtotal', '$discount'] }] },
          { $divide: [ { $max: [0, { $subtract: ['$total', { $min: ['$refunded', '$total'] }] }] }, { $max: [1, '$total'] } ] },
        ] },
        month: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Karachi' } },
      } },
      { $group: {
        _id: { partnerId: '$referral.partnerId', month: '$month' },
        orders: { $sum: 1 },
        paidOrders: { $sum: { $cond: [{ $in: ['$paymentStatus', ['Paid', 'Partially Refunded']] }, 1, 0] } },
        bookedRevenue: { $sum: '$total' },
        paidGrossRevenue: { $sum: { $cond: [{ $in: ['$paymentStatus', ['Paid', 'Partially Refunded']] }, '$total', 0] } },
        discounts: { $sum: '$discount' },
        refunds: { $sum: '$refunded' },
        commissionEstimate: { $sum: { $cond: [{ $in: ['$paymentStatus', ['Paid', 'Partially Refunded']] }, {
          $cond: [
            { $eq: ['$referral.commissionType', 'fixed'] },
            { $min: ['$commissionBase', { $ifNull: ['$referral.commissionValue', 0] }] },
            { $floor: { $multiply: ['$commissionBase', { $divide: [{ $min: [100, { $ifNull: ['$referral.commissionValue', 0] }] }, 100] }] } },
          ],
        }, 0] } },
      } },
    ]),
    Order.aggregate([
      { $match: match },
      { $lookup: { from: 'refunds', localField: '_id', foreignField: 'orderId', as: 'refundRows' } },
      { $addFields: { refunded: { $ifNull: [{ $sum: '$refundRows.amount' }, 0] } } },
      { $sort: { createdAt: -1 } }, { $limit: 2000 },
      { $project: { orderNumber: 1, couponCode: 1, discount: 1, subtotal: 1, total: 1, shipping: 1, status: 1, paymentStatus: 1, createdAt: 1, referral: 1, refunded: 1 } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { 'meta.affiliateCode': { $in: partners.map((p) => p.code) }, event: 'page_view', at: { $gte: from, $lt: to } } },
      { $group: { _id: { code: '$meta.affiliateCode', source: { $ifNull: ['$meta.source', 'Direct'] }, sessionRef: '$sessionRef' } } },
      { $group: { _id: { code: '$_id.code', source: '$_id.source' }, visits: { $sum: 1 } } },
    ]),
  ]);
  const monthMap = new Map();
  for (const row of monthlyRows) {
    const key = String(row._id.partnerId) + '|' + row._id.month;
    monthMap.set(key, row);
  }
  const detailMap = new Map(partners.map((p) => [String(p._id), []]));
  for (const row of detailRows) {
    const key = String(row.referral?.partnerId);
    const list = detailMap.get(key);
    if (list && list.length < 100) {
      const paid = isPaid(row.paymentStatus);
      const merchandiseAfterDiscount = Math.max(0, Number(row.subtotal || 0) - Number(row.discount || 0));
      const retainedRatio = Number(row.total) > 0 ? Math.max(0, Number(row.total) - Math.min(Number(row.refunded || 0), Number(row.total))) / Number(row.total) : 0;
      const base = Math.floor(merchandiseAfterDiscount * retainedRatio);
      const rate = Math.max(0, Number(row.referral?.commissionValue) || 0);
      const estimated = paid ? (row.referral?.commissionType === 'fixed' ? Math.min(base, rate) : Math.floor(base * Math.min(100, rate) / 100)) : 0;
      list.push({
        orderNumber: row.orderNumber, promoCode: row.couponCode && row.referral?.code && row.couponCode !== row.referral.code ? row.couponCode + ' + ' + row.referral.code : (row.couponCode || row.referral?.code || ''),
        codeAppliedAt: row.referral?.appliedAt || row.createdAt,
        discount: Number(row.discount) || 0, revenue: Math.max(0, Number(row.total || 0) - Number(row.refunded || 0)),
        grossRevenue: Number(row.total) || 0, refunded: Number(row.refunded) || 0,
        status: row.status, paymentStatus: row.paymentStatus, placedAt: row.createdAt,
        estimatedCommission: estimated,
      });
    }
  }
  const visitsByCode = new Map();
  for (const row of visitRows) {
    const code = row._id.code;
    const arr = visitsByCode.get(code) || [];
    arr.push({ source: row._id.source, visits: Number(row.visits) || 0 });
    visitsByCode.set(code, arr);
  }
  const rows = partners.map((p) => {
    const series = months.map((m) => {
      const item = monthMap.get(String(p._id) + '|' + m.key) || {};
      return { month: m.key, label: m.label, orders: item.orders || 0, paidOrders: item.paidOrders || 0, bookedRevenue: item.bookedRevenue || 0, paidRevenue: Math.max(0, (item.paidGrossRevenue || 0) - (item.refunds || 0)), discounts: item.discounts || 0, refunds: item.refunds || 0, estimatedCommission: item.commissionEstimate || 0 };
    });
    const totals = series.reduce((acc, m) => {
      for (const key of ['orders','paidOrders','bookedRevenue','paidRevenue','discounts','refunds','estimatedCommission']) acc[key] += Number(m[key]) || 0;
      return acc;
    }, emptyMetrics());
    const sources = visitsByCode.get(p.code) || [];
    return { partner: cleanPartner(p), metrics: { ...totals, visits: sources.reduce((n, x) => n + x.visits, 0), sources, monthly: series, couponApplications: detailMap.get(String(p._id)) || [] } };
  });
  const totals = rows.reduce((acc, row) => {
    for (const key of Object.keys(acc)) acc[key] += Number(row.metrics[key]) || 0;
    return acc;
  }, emptyTotals());
  return {
    range: { from: D.pktDateKey(from), to: D.pktDateKey(now) },
    months, totals, partners: rows, attributionRetentionDays: 180,
    couponApplications: rows.flatMap((r) => r.metrics.couponApplications.map((x) => ({ ...x, partnerName: r.partner.name, partnerCode: r.partner.code }))).sort((a,b) => new Date(b.codeAppliedAt) - new Date(a.codeAppliedAt)).slice(0, 300),
  };
}
function emptyMetrics() { return { orders: 0, paidOrders: 0, bookedRevenue: 0, paidRevenue: 0, discounts: 0, refunds: 0, estimatedCommission: 0 }; }
function emptyTotals() { return { ...emptyMetrics(), visits: 0 }; }

async function adminDashboard() { return buildDashboard(); }
async function myDashboard(ctx) {
  await ensureIndexes();
  let partner = await AffiliatePartner.findOne({ userId: ctx.user._id, type: 'staff', storeId: 'main', isDeleted: false }).lean();
  if (!partner) {
    const staff = await Staff.findOne({ userId: ctx.user._id, storeId: 'main', isDeleted: false, status: 'Active' }).lean();
    if (staff) partner = (await ensureStaffPartner(staff)).toObject();
  }
  if (!partner) return { partner: null, ...(await buildDashboard({ partnerId: '000000000000000000000000' })) };
  const report = await buildDashboard({ partnerId: partner._id });
  return { partner: cleanPartner(partner), ...report };
}
module.exports = { cleanPartner, createInfluencer, updatePartner, adminDashboard, myDashboard, buildDashboard };
