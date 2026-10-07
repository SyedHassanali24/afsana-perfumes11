// Pure rules for the admin Dashboard (NO database, NO npm packages) -> covered by tests/dashboard.test.js.
// dashboardService.js does the Mongo work and feeds the numbers through these helpers.
const { redact } = require('../middleware/redact');

// ---- Definitions (also written in HANDOFF.md) ----
// REVENUE = sum of Order.total (what the customer is charged: items - discount + delivery fee) of orders PLACED in the period,
// EXCEPT orders whose status is Cancelled, Returned or Refunded. Unpaid COD/bank orders still count (it is booked sales, not cash received).
// Known limit: a "Partially Refunded" order keeps its full total here (the refund amount is not subtracted).
const EXCLUDED_STATUSES = ['Cancelled', 'Returned', 'Refunded'];
const PENDING_STATUSES = ['New', 'Confirmed', 'Processing', 'Packed']; // not shipped yet = needs work
const SERIES_DAYS = 30;
const TOP_PRODUCTS_LIMIT = 5;
const LOW_STOCK_LIMIT = 5;
const RECENT_ORDERS_LIMIT = 5;

// "Today" means today in Pakistan (UTC+5, no daylight saving), not the server's (UTC) day.
const TZ = 'Asia/Karachi';
const TZ_OFFSET_MS = 5 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

const pad = (n) => String(n).padStart(2, '0');
// Start (as a real UTC instant) of the Pakistan day that contains `now`.
function pktDayStart(now = new Date()) {
  const local = new Date(now.getTime() + TZ_OFFSET_MS); // its UTC fields are the Pakistan wall clock
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - TZ_OFFSET_MS);
}
function pktMonthStart(now = new Date(), monthsBack = 0) {
  const local = new Date(now.getTime() + TZ_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - monthsBack, 1) - TZ_OFFSET_MS);
}
// All periods the dashboard compares. Each is { from, to } with from inclusive, to exclusive.
function ranges(now = new Date()) {
  const todayStart = pktDayStart(now);
  const monthStart = pktMonthStart(now);
  const prevMonthStart = pktMonthStart(now, 1);
  // last month, but only as far as we are into this month (fair "month so far" comparison), never past this month's start
  const prevMonthEnd = new Date(Math.min(monthStart.getTime(), prevMonthStart.getTime() + (now.getTime() - monthStart.getTime())));
  return {
    today: { from: todayStart, to: new Date(now.getTime() + 1) },
    yesterday: { from: new Date(todayStart.getTime() - DAY_MS), to: todayStart },
    month: { from: monthStart, to: new Date(now.getTime() + 1) },
    prevMonth: { from: prevMonthStart, to: prevMonthEnd },
    series: { from: new Date(todayStart.getTime() - (SERIES_DAYS - 1) * DAY_MS), to: new Date(now.getTime() + 1) },
  };
}

// 1 decimal, or null when there is nothing to compare with (previous = 0) -> the UI hides the trend row.
function pctChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
const avg = (sum, count) => (count > 0 ? Math.round(sum / count) : 0);

// "2026-10-06" for the Pakistan day containing `date`.
function pktDateKey(date) {
  const l = new Date(date.getTime() + TZ_OFFSET_MS);
  return `${l.getUTCFullYear()}-${pad(l.getUTCMonth() + 1)}-${pad(l.getUTCDate())}`;
}
// rows: [{ _id: 'YYYY-MM-DD', revenue }] from Mongo -> exactly `days` entries, oldest first, empty days = 0.
function fillSeries(rows, now = new Date(), days = SERIES_DAYS) {
  const byDay = new Map((rows || []).map((r) => [r._id, Number(r.revenue) || 0]));
  const start = pktDayStart(now).getTime() - (days - 1) * DAY_MS;
  const out = [];
  for (let i = 0; i < days; i++) { const key = pktDateKey(new Date(start + i * DAY_MS)); out.push({ date: key, revenue: byDay.get(key) || 0 }); }
  return out;
}

// One grouped row from Mongo -> API item. Profit = line revenue - cost, only when EVERY line had a cost snapshot (else null = unknown).
function shapeTopProduct(r) {
  const revenue = Number(r.revenue) || 0;
  const known = Number(r.missingCost) === 0 && Number.isFinite(Number(r.cost));
  return { productId: r._id, name: r.name || 'Unnamed product', units: Number(r.units) || 0, revenue, profit: known ? revenue - Number(r.cost) : null };
}

// Field-level security for the dashboard payload. Uses the shared redact(), plus one extra rule:
// profit = revenue - cost, so a role that may not see cost prices must not see profit either.
function applyFieldSecurity(data, denied) {
  const out = redact(data, denied);
  if (denied && denied.has && denied.has('product.costPrice') && out && out.topProducts && Array.isArray(out.topProducts.items)) {
    for (const it of out.topProducts.items) delete it.profit;
  }
  return out;
}

// Which sections this role may see. `null` section in the response = "not allowed" (UI shows "hidden").
function sectionAccess(can) {
  const orders = can('orders', 'view');
  return { orders: orders || null, inventory: !!can('inventory', 'view') };
}

module.exports = {
  EXCLUDED_STATUSES, PENDING_STATUSES, SERIES_DAYS, TOP_PRODUCTS_LIMIT, LOW_STOCK_LIMIT, RECENT_ORDERS_LIMIT, TZ,
  pktDayStart, pktMonthStart, ranges, pctChange, avg, pktDateKey, fillSeries, shapeTopProduct, applyFieldSecurity, sectionAccess,
};
