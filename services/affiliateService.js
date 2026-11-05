const { AffiliatePartner, AffiliateCommission, AnalyticsEvent, Order, Refund, Coupon, Staff } = require('../database/models');
const { E } = require('../middleware/errors');
const { audit } = require('./audit');
const { scopeFilter } = require('../middleware/permissions');
const { normalizeCode, CODE_RE } = require('./affiliateRules');
const { ensureStaffPartner } = require('./staffReferral');

const ORDER_SCOPE = { createdBy: 'createdBy', assignedTo: 'assignedTo', cities: 'shippingAddress.city', stores: 'storeId' };

function cleanPartner(p) {
  return {
    id: p._id, name: p.name, code: p.code, type: p.type, platform: p.platform || '',
    handle: p.handle || '', email: p.email || '', phone: p.phone || '',
    discountType: p.discountType || 'none', discountValue: p.discountValue || 0,
    maxDiscount: p.maxDiscount || 0, minOrder: p.minOrder || 0,
    commissionType: p.commissionType || 'percentage', commissionValue: p.commissionValue || 0,
    usageLimit: p.usageLimit || null, perCustomerLimit: p.perCustomerLimit || 0,
    usedCount: p.usedCount || 0, startsAt: p.startsAt || null, expiresAt: p.expiresAt || null,
    isActive: !!p.isActive, createdAt: p.createdAt,
    referralUrl: (process.env.SITE_URL || 'https://afsana-perfumes11.eastwala12.workers.dev') + '/?ref=' + encodeURIComponent(p.code),
  };
}
const safeCode = (v) => normalizeCode(v);

async function createInfluencer(ctx, body) {
  const code = safeCode(body.code);
  if (!CODE_RE.test(code)) throw E.badRequest('Use 3–30 letters, numbers, hyphens or underscores for the code.');
  if (await AffiliatePartner.exists({ code, storeId: 'main' }) || await Coupon.exists({ code, storeId: 'main', isDeleted: false })) throw E.conflict('This code is already in use.');
  const p = await AffiliatePartner.create({
    name: body.name.trim(), code, type: 'influencer', platform: body.platform || '',
    handle: body.handle || '', email: body.email || '', phone: body.phone || '',
    discountType: body.discountType || 'none', discountValue: body.discountValue || 0,
    maxDiscount: body.maxDiscount || undefined, minOrder: body.minOrder || 0,
    commissionType: body.commissionType || 'percentage', commissionValue: body.commissionValue || 0,
    usageLimit: body.usageLimit || undefined, perCustomerLimit: body.perCustomerLimit || 0,
    startsAt: body.startsAt || undefined, expiresAt: body.expiresAt || undefined,
    isActive: body.isActive !== false, createdBy: ctx.user._id,
  });
  await audit(ctx, { action: 'referral.partner_created', module: 'referrals', recordId: p._id, newValue: { name: p.name, code, type: p.type } });
  return { partner: cleanPartner(p) };
}

async function updatePartner(ctx, id, body) {
  const p = await AffiliatePartner.findOne({ _id: id, isDeleted: false });
  if (!p) throw E.notFound('Referral partner not found.');
  const before = { name: p.name, code: p.code, isActive: p.isActive, commissionType: p.commissionType, commissionValue: p.commissionValue, discountType: p.discountType, discountValue: p.discountValue };
  if (body.code !== undefined) {
    const code = safeCode(body.code);
    if (!CODE_RE.test(code)) throw E.badRequest('Invalid referral code.');
    if (code !== p.code && (p.usedCount > 0 || await AffiliatePartner.exists({ code, _id: { $ne: p._id }, storeId: p.storeId }) || await Coupon.exists({ code, storeId: p.storeId, isDeleted: false }))) {
      throw E.conflict('A code cannot be changed after use, or while another promotion already owns it.');
    }
    p.code = code;
  }
  for (const k of ['name','platform','handle','email','phone','discountType','discountValue','maxDiscount','minOrder','commissionType','commissionValue','usageLimit','perCustomerLimit','startsAt','expiresAt','isActive']) {
    if (body[k] !== undefined) p[k] = body[k];
  }
  if (p.discountType === 'percentage' && (!(p.discountValue > 0) || p.discountValue > 100)) throw E.badRequest('Discount percent must be between 1 and 100.');
  if (p.commissionType === 'percentage' && (p.commissionValue < 0 || p.commissionValue > 100)) throw E.badRequest('Commission percent must be between 0 and 100.');
  await p.save();
  await audit(ctx, { action: 'referral.partner_updated', module: 'referrals', recordId: p._id, oldValue: before, newValue: { name: p.name, code: p.code, isActive: p.isActive, commissionType: p.commissionType, commissionValue: p.commissionValue, discountType: p.discountType, discountValue: p.discountValue } });
  return { partner: cleanPartner(p) };
}

async function partnerMetrics(partner) {
  await AffiliateCommission.updateMany(
    { partnerId: partner._id, status: 'pending', holdUntil: { $lte: new Date() } },
    { $set: { status: 'payable' } },
  );
  const [orders, commission, trafficRows] = await Promise.all([
    Order.aggregate([
      { $match: { storeId: 'main', 'referral.partnerId': partner._id, paymentStatus: { $in: ['Paid', 'Partially Refunded', 'Refunded'] } } },
      { $lookup: { from: 'refunds', let: { oid: '$_id' }, pipeline: [{ $match: { $expr: { $eq: ['$orderId', '$$oid'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }], as: 'refunds' } },
      { $addFields: { refunded: { $ifNull: [{ $first: '$refunds.total' }, 0] } } },
      { $group: { _id: null, orders: { $sum: 1 }, linkOrders: { $sum: { $cond: [{ $eq: ['$referral.source', 'referral_link'] }, 1, 0] } }, codeOrders: { $sum: { $cond: [{ $eq: ['$referral.source', 'promo_code'] }, 1, 0] } }, grossRevenue: { $sum: '$total' }, refunded: { $sum: '$refunded' }, revenue: { $sum: { $max: [0, { $subtract: ['$total', '$refunded'] }] } } } },
    ]),
    AffiliateCommission.aggregate([{ $match: { storeId: 'main', partnerId: partner._id } }, { $group: {
      _id: '$status', rows: { $sum: 1 }, amount: { $sum: '$amount' }, clawback: { $sum: '$clawbackAmount' },
    } }]),
    AnalyticsEvent.aggregate([
      { $match: { storeId: 'main', affiliateCode: partner.code, event: 'page_view' } },
      { $group: { _id: { source: { $ifNull: ['$source', 'direct'] }, sessionRef: '$sessionRef' } } },
      { $group: { _id: '$_id.source', visits: { $sum: 1 } } },
      { $sort: { visits: -1 } },
    ]),
  ]);
  const order = orders[0] || { orders: 0, linkOrders: 0, codeOrders: 0, grossRevenue: 0, refunded: 0, revenue: 0 };
  const sourceBreakdown = (trafficRows || []).map((row) => ({ source: String(row._id || 'other'), visits: Number(row.visits) || 0 }));
  const visits = sourceBreakdown.reduce((sum, row) => sum + row.visits, 0);
  const money = { pending: 0, payable: 0, paid: 0, reversed: 0, clawback_due: 0, clawback: 0 };
  for (const row of commission) {
    if (money[row._id] !== undefined) money[row._id] = row.amount || 0;
    if (row._id === 'clawback_due') money.clawback += row.clawback || 0;
  }
  return { visits, sourceBreakdown, orders: order.orders || 0, linkOrders: order.linkOrders || 0, codeOrders: order.codeOrders || 0, grossRevenue: order.grossRevenue || 0, refunded: order.refunded || 0, revenue: order.revenue || 0, conversionRate: visits ? Math.round(((order.linkOrders || 0) / visits) * 1000) / 10 : 0, commission: money };
}

async function adminDashboard() {
  const staffRows = await Staff.find({ storeId: 'main', isDeleted: false, status: 'Active' }).populate('roleId', 'isUnrestricted').lean();
  await Promise.all(staffRows.filter((staff) => !staff.roleId?.isUnrestricted).map((staff) => ensureStaffPartner(staff)));
  const partners = await AffiliatePartner.find({ storeId: 'main', isDeleted: false }).sort({ type: 1, name: 1 }).limit(300).lean();
  const rows = await Promise.all(partners.map(async (p) => ({ partner: cleanPartner(p), metrics: await partnerMetrics(p) })));
  const sourceTotals = new Map();
  for (const row of rows) for (const source of row.metrics.sourceBreakdown || []) {
    sourceTotals.set(source.source, (sourceTotals.get(source.source) || 0) + source.visits);
  }
  const sourceBreakdown = [...sourceTotals.entries()].map(([source, visits]) => ({ source, visits })).sort((a, b) => b.visits - a.visits);
  const totals = rows.reduce((out, row) => {
    const m = row.metrics;
    for (const key of ['visits','orders','linkOrders','codeOrders','grossRevenue','refunded','revenue']) out[key] += m[key] || 0;
    for (const key of ['pending','payable','paid','reversed','clawback_due','clawback']) out[key] += m.commission[key] || 0;
    return out;
  }, { visits: 0, orders: 0, linkOrders: 0, codeOrders: 0, grossRevenue: 0, refunded: 0, revenue: 0, pending: 0, payable: 0, paid: 0, reversed: 0, clawback_due: 0, clawback: 0 });
  return { totals, partners: rows, sourceBreakdown };
}

async function myDashboard(ctx) {
  let p = await AffiliatePartner.findOne({ userId: ctx.user._id, type: 'staff', isDeleted: false }).lean();
  if (!p) {
    const staff = await Staff.findOne({ userId: ctx.user._id, isDeleted: false }).lean();
    if (staff) p = (await ensureStaffPartner(staff)).toObject();
  }
  if (!p) return { partner: null, metrics: { visits: 0, sourceBreakdown: [], orders: 0, linkOrders: 0, codeOrders: 0, grossRevenue: 0, refunded: 0, revenue: 0, commission: { pending: 0, payable: 0, paid: 0, reversed: 0, clawback_due: 0, clawback: 0 } } };
  return { partner: cleanPartner(p), metrics: await partnerMetrics(p) };
}

async function listCommissions(query = {}) {
  await AffiliateCommission.updateMany({ storeId: 'main', status: 'pending', holdUntil: { $lte: new Date() } }, { $set: { status: 'payable' } });
  const filter = { storeId: 'main', ...(query.status ? { status: query.status } : {}) };
  const rows = await AffiliateCommission.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return { commissions: rows.map((c) => ({
    id: c._id, partnerId: c.partnerId, partnerName: c.partnerName, partnerType: c.partnerType,
    code: c.code, orderNumber: c.orderNumber, baseAmount: c.baseAmount, amount: c.amount,
    originalAmount: c.originalAmount, refundedAmount: c.refundedAmount, clawbackAmount: c.clawbackAmount,
    status: c.status, holdUntil: c.holdUntil, paidAt: c.paidAt, payoutReference: c.payoutReference,
    createdAt: c.createdAt,
  })) };
}
async function payCommission(ctx, id, body) {
  const c = await AffiliateCommission.findOne({ _id: id, storeId: 'main' });
  if (!c) throw E.notFound('Commission record not found.');
  if (c.status === 'paid') throw E.conflict('This commission has already been paid.');
  if (c.status === 'reversed' || c.status === 'clawback_due') throw E.conflict('This commission has a refund adjustment and cannot be paid as-is.');
  if (!c.holdUntil || new Date(c.holdUntil) > new Date()) throw E.conflict('This commission is still inside the return-protection period.');
  if (!(c.amount > 0)) throw E.conflict('There is no payable commission amount.');
  const before = { status: c.status, amount: c.amount, holdUntil: c.holdUntil };
  c.status = 'paid'; c.paidAt = new Date(); c.paidBy = ctx.user._id; c.payoutReference = body.reference || '';
  await c.save();
  await audit(ctx, { action: 'commission.paid', module: 'commissions', recordId: c._id, oldValue: before, newValue: { status: c.status, amount: c.amount, paidAt: c.paidAt, reference: c.payoutReference } });
  return { commission: { id: c._id, status: c.status, amount: c.amount, paidAt: c.paidAt, reference: c.payoutReference } };
}

async function markPaidOrder(order, session) {
  if (!order || !order.referral || !order.referral.partnerId) return null;
  const existing = await AffiliateCommission.findOne({ orderId: order._id }).session(session).lean();
  if (existing) return null;
  const cfg = await require('../database/models').Setting.findOne({ key: 'growth', storeId: 'main' }).session(session).lean();
  const holdDays = Math.max(1, Math.min(90, Number(cfg?.value?.commissionHoldDays) || 14));
  const baseAmount = Math.max(0, Number(order.subtotal || 0) - Number(order.discount || 0));
  const rule = require('./affiliateRules').commissionFor(order.referral, baseAmount);
  if (!(rule.amount > 0)) return null;
  const [created] = await AffiliateCommission.create([{
    orderId: order._id, partnerId: order.referral.partnerId, partnerType: order.referral.partnerType,
    partnerName: order.referral.partnerName, code: order.referral.code, orderNumber: order.orderNumber,
    baseAmount: rule.baseAmount, originalAmount: rule.amount, amount: rule.amount,
    rateType: order.referral.commissionType, rateValue: order.referral.commissionValue,
    status: 'pending', holdUntil: null,
  }], { session });
  return created._id;
}

async function markOrderDelivered(orderId, session) {
  const cfg = await require('../database/models').Setting.findOne({ key: 'growth', storeId: 'main' }).session(session).lean();
  const holdDays = Math.max(1, Math.min(90, Number(cfg?.value?.commissionHoldDays) || 14));
  await AffiliateCommission.updateOne({ orderId, status: 'pending' }, { $set: { holdUntil: new Date(Date.now() + holdDays * 86400000) } }, { session });
}

async function adjustForRefund(order, totalRefunded, session) {
  const c = await AffiliateCommission.findOne({ orderId: order._id }).session(session);
  if (!c) return;
  const ratio = Math.max(0, Math.min(1, 1 - (Number(totalRefunded || 0) / Math.max(1, Number(order.total || 0)))));
  const nextAmount = Math.floor(c.originalAmount * ratio);
  const reduction = Math.max(0, c.originalAmount - nextAmount);
  c.refundedAmount = Number(totalRefunded || 0);
  if (['paid', 'clawback_due'].includes(c.status) && reduction > 0) {
    c.clawbackAmount = Math.max(0, reduction);
    c.status = reduction >= c.originalAmount ? 'reversed' : 'clawback_due';
  } else {
    c.amount = nextAmount;
    if (nextAmount <= 0) c.status = 'reversed';
  }
  await c.save({ session });
}

module.exports = { cleanPartner, createInfluencer, updatePartner, adminDashboard, myDashboard, listCommissions, payCommission, markPaidOrder, markOrderDelivered, adjustForRefund, partnerMetrics };
