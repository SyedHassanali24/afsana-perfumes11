// GET /api/analytics/dashboard -> data for the admin Dashboard.
// Database work only lives here; every rule/number-shaping step is in dashboardRules.js (pure, unit-tested).
const { Order, OrderItem, Inventory, Product, ProductVariant } = require('../database/models');
const { scopeFilter } = require('../middleware/permissions');
const { SCOPE_MAP } = require('./orderService');
const R = require('./dashboardRules');

// Very short per-user server cache: avoids repeating the expensive dashboard aggregation
// when the admin shell remounts or the same dashboard is opened twice in a few seconds.
const dashboardCache = new Map();
const DASHBOARD_TTL_MS = 10000;
const cacheKey = (access, uid, denied) => JSON.stringify([String(uid), access, denied]);

// Orders that count as sales (see the REVENUE definition in dashboardRules.js).
const validOrders = (scope, range) => ({ ...scope, status: { $nin: R.EXCLUDED_STATUSES }, createdAt: { $gte: range.from, $lt: range.to } });

async function revenueSummary(scope, rg) {
  const inRange = (range) => ({ $and: [{ $gte: ['$createdAt', range.from] }, { $lt: ['$createdAt', range.to] }] });
  const [r] = await Order.aggregate([
    { $match: { ...scope, status: { $nin: R.EXCLUDED_STATUSES }, createdAt: { $gte: rg.prevMonth.from, $lt: rg.today.to } } },
    { $group: { _id: null,
      todayRevenue: { $sum: { $cond: [inRange(rg.today), '$total', 0] } },
      todayOrders: { $sum: { $cond: [inRange(rg.today), 1, 0] } },
      yesterdayRevenue: { $sum: { $cond: [inRange(rg.yesterday), '$total', 0] } },
      monthRevenue: { $sum: { $cond: [inRange(rg.month), '$total', 0] } },
      monthOrders: { $sum: { $cond: [inRange(rg.month), 1, 0] } },
      prevMonthRevenue: { $sum: { $cond: [inRange(rg.prevMonth), '$total', 0] } },
      prevMonthOrders: { $sum: { $cond: [inRange(rg.prevMonth), 1, 0] } },
    } },
  ]);
  return r || { todayRevenue: 0, todayOrders: 0, yesterdayRevenue: 0, monthRevenue: 0, monthOrders: 0, prevMonthRevenue: 0, prevMonthOrders: 0 };
}

async function orderSections(scopes, uid, now) {
  const scope = scopeFilter(scopes, uid, SCOPE_MAP);
  const rg = R.ranges(now);
  const [rev, totalOrders, pendingOrders, dayRows, recent, topRows] = await Promise.all([
    revenueSummary(scope, rg),
    Order.countDocuments(scope),                                   // every status, same number the Orders screen shows
    Order.countDocuments({ ...scope, status: { $in: R.PENDING_STATUSES } }),
    Order.aggregate([
      { $match: validOrders(scope, rg.series) },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: R.TZ } }, revenue: { $sum: '$total' } } },
    ]),
    Order.find(scope).select('orderNumber customer.name total status createdAt').sort({ createdAt: -1 }).limit(R.RECENT_ORDERS_LIMIT).lean(),
    // top products of the last 30 days: units sold (ties: revenue). Revenue here is unitPrice x quantity per line (before order-level discount / delivery).
    Order.aggregate([
      { $match: validOrders(scope, rg.series) },
      { $lookup: { from: OrderItem.collection.name, localField: '_id', foreignField: 'orderId', as: 'line' } },
      { $unwind: '$line' },
      { $group: {
        _id: '$line.productId', name: { $first: '$line.name' },
        units: { $sum: '$line.quantity' },
        revenue: { $sum: { $multiply: ['$line.unitPrice', '$line.quantity'] } },
        cost: { $sum: { $multiply: [{ $ifNull: ['$line.costPrice', 0] }, '$line.quantity'] } },
        missingCost: { $sum: { $cond: [{ $gt: ['$line.costPrice', null] }, 0, 1] } }, // lines without a cost snapshot -> profit unknown
      } },
      { $sort: { units: -1, revenue: -1 } },
      { $limit: R.TOP_PRODUCTS_LIMIT },
    ]),
  ]);

  return {
    kpis: {
      todayRevenue: rev.todayRevenue, todayOrders: rev.todayOrders, todayRevenueChangePct: R.pctChange(rev.todayRevenue, rev.yesterdayRevenue),
      monthRevenue: rev.monthRevenue, monthRevenueChangePct: R.pctChange(rev.monthRevenue, rev.prevMonthRevenue),
      totalOrders, pendingOrders,
      avgOrderValue: R.avg(rev.monthRevenue, rev.monthOrders),
      avgOrderValueChangePct: R.pctChange(R.avg(rev.monthRevenue, rev.monthOrders), R.avg(rev.prevMonthRevenue, rev.prevMonthOrders)),
    },
    revenueSeries: R.fillSeries(dayRows, now),
    recentOrders: recent.map((o) => ({ id: o._id, orderNumber: o.orderNumber, customerName: (o.customer && o.customer.name) || '', total: o.total, status: o.status, createdAt: o.createdAt })),
    topProducts: { days: R.SERIES_DAYS, items: topRows.map(R.shapeTopProduct) },
  };
}

// "Low" = available (current - reserved) is at or under the variant's threshold; out-of-stock variants are included (and counted separately).
// Soft-deleted products / sizes are left out (R.lowStockFilter): nobody can buy them, so they are not "low stock".
async function stockSection(scopes, uid) {
  const invScope = scopeFilter(scopes, uid, { stores: 'storeId' });
  const [delProducts, delVariants] = await Promise.all([
    Product.find({ isDeleted: true }).select('_id').lean(),
    ProductVariant.find({ isDeleted: true }).select('_id').lean(),
  ]);
  const skip = { ...(delProducts.length ? { productId: { $nin: delProducts.map((p) => p._id) } } : {}), ...(delVariants.length ? { variantId: { $nin: delVariants.map((v) => v._id) } } : {}) };
  const LOW = R.lowStockFilter(delProducts.map((p) => p._id), delVariants.map((v) => v._id));
  const [count, outOfStock, rows] = await Promise.all([
    Inventory.countDocuments({ ...LOW, ...invScope }),
    Inventory.countDocuments({ ...invScope, $expr: { $lte: [{ $subtract: ['$current', '$reserved'] }, 0] }, ...skip }),
    Inventory.aggregate([
      { $match: { ...LOW, ...invScope } },
      { $addFields: { available: { $subtract: ['$current', '$reserved'] } } },
      { $sort: { available: 1 } },
      { $limit: R.LOW_STOCK_LIMIT },
      { $project: { variantId: 1, productId: 1, available: 1, lowStockThreshold: 1 } },
    ]),
  ]);
  const [products, variants] = await Promise.all([
    Product.find({ _id: { $in: rows.map((r) => r.productId) } }).select('name').lean(),
    ProductVariant.find({ _id: { $in: rows.map((r) => r.variantId) } }).select('label').lean(),
  ]);
  const pName = new Map(products.map((p) => [String(p._id), p.name]));
  const vLabel = new Map(variants.map((v) => [String(v._id), v.label]));
  return {
    count, outOfStock,
    items: rows.map((r) => ({ id: r.variantId, name: pName.get(String(r.productId)) || 'Unknown product', label: vLabel.get(String(r.variantId)) || '', available: r.available, threshold: r.lowStockThreshold })),
  };
}

// access = R.sectionAccess(ctx.perms.can); a section the role may not see is returned as null (never partly filled).
async function getDashboard({ access, uid, denied, now = new Date() }) {
  const key = cacheKey(access, uid, denied);
  const cached = dashboardCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const [orders, stock] = await Promise.all([
    access.orders ? orderSections(access.orders, uid, now) : null,
    access.inventory ? stockSection(access.inventory, uid) : null,
  ]);
  const data = {
    generatedAt: now.toISOString(),
    kpis: orders && orders.kpis,
    revenueSeries: orders && orders.revenueSeries,
    recentOrders: orders && orders.recentOrders,
    topProducts: orders && orders.topProducts,
    lowStock: stock,
  };
  const result = R.applyFieldSecurity(data, denied);
  dashboardCache.set(key, { data: result, expiresAt: Date.now() + DASHBOARD_TTL_MS });
  if (dashboardCache.size > 100) {
    const oldest = dashboardCache.keys().next().value;
    if (oldest) dashboardCache.delete(oldest);
  }
  return result;
}

module.exports = { getDashboard };
