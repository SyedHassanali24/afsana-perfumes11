// GET /api/analytics/dashboard -> data for the admin Dashboard.
// Database work only lives here; every rule/number-shaping step is in dashboardRules.js (pure, unit-tested).
const { Order, OrderItem, Inventory, Product, ProductVariant } = require('../database/models');
const { scopeFilter } = require('../middleware/permissions');
const { SCOPE_MAP } = require('./orderService');
const R = require('./dashboardRules');

// Orders that count as sales (see the REVENUE definition in dashboardRules.js).
const validOrders = (scope, range) => ({ ...scope, status: { $nin: R.EXCLUDED_STATUSES }, createdAt: { $gte: range.from, $lt: range.to } });

async function sumRevenue(scope, range) {
  const [r] = await Order.aggregate([
    { $match: validOrders(scope, range) },
    { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
  ]);
  return { revenue: r ? r.revenue : 0, orders: r ? r.orders : 0 };
}

async function orderSections(scopes, uid, now) {
  const scope = scopeFilter(scopes, uid, SCOPE_MAP);
  const rg = R.ranges(now);
  const [today, yesterday, month, prevMonth, totalOrders, pendingOrders, dayRows, recent, topRows] = await Promise.all([
    sumRevenue(scope, rg.today),
    sumRevenue(scope, rg.yesterday),
    sumRevenue(scope, rg.month),
    sumRevenue(scope, rg.prevMonth),
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
      todayRevenue: today.revenue, todayOrders: today.orders, todayRevenueChangePct: R.pctChange(today.revenue, yesterday.revenue),
      monthRevenue: month.revenue, monthRevenueChangePct: R.pctChange(month.revenue, prevMonth.revenue),
      totalOrders, pendingOrders,
      avgOrderValue: R.avg(month.revenue, month.orders),
      avgOrderValueChangePct: R.pctChange(R.avg(month.revenue, month.orders), R.avg(prevMonth.revenue, prevMonth.orders)),
    },
    revenueSeries: R.fillSeries(dayRows, now),
    recentOrders: recent.map((o) => ({ id: o._id, orderNumber: o.orderNumber, customerName: (o.customer && o.customer.name) || '', total: o.total, status: o.status, createdAt: o.createdAt })),
    topProducts: { days: R.SERIES_DAYS, items: topRows.map(R.shapeTopProduct) },
  };
}

// "Low" = available (current - reserved) is at or under the variant's threshold; out-of-stock variants are included (and counted separately).
const LOW = { $expr: { $lte: [{ $subtract: ['$current', '$reserved'] }, '$lowStockThreshold'] } };
async function stockSection() {
  const [count, outOfStock, rows] = await Promise.all([
    Inventory.countDocuments(LOW),
    Inventory.countDocuments({ $expr: { $lte: [{ $subtract: ['$current', '$reserved'] }, 0] } }),
    Inventory.aggregate([
      { $match: LOW },
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
  const [orders, stock] = await Promise.all([
    access.orders ? orderSections(access.orders, uid, now) : null,
    access.inventory ? stockSection() : null,
  ]);
  const data = {
    generatedAt: now.toISOString(),
    kpis: orders && orders.kpis,
    revenueSeries: orders && orders.revenueSeries,
    recentOrders: orders && orders.recentOrders,
    topProducts: orders && orders.topProducts,
    lowStock: stock,
  };
  return R.applyFieldSecurity(data, denied);
}

module.exports = { getDashboard };
