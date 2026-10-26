// Pure rules for Finance & Expenses (no DB) -> tests/finance.test.js. Money is whole PKR. "Day" / "month" mean Pakistan time (UTC+5).
//
// Definitions (also in HANDOFF.md):
//   revenue      = sum of Order.total of orders PLACED in the period, except Cancelled / Returned / Refunded (same as the Dashboard).
//   refunds      = money refunded on THOSE orders (partial refunds). Fully Refunded orders are already out of revenue, so they are not subtracted twice.
//   cost of goods= sum of OrderItem.costPrice x quantity of those orders (cost snapshot taken at checkout). Lines with no cost are counted as 0 and reported in `missingCost`.
//   expenses     = sum of Expense.amount dated inside the period.
//   gross profit = revenue - refunds - cost of goods;   net profit = gross profit - expenses.
const D = require('./dashboardRules');

const CATEGORIES = ['Shipping', 'Packaging', 'Advertising', 'Salaries', 'Rent', 'Utilities', 'Other'];
const PERIODS = ['this_month', 'last_month', 'last_30', 'this_year', 'custom'];
const MAX_CUSTOM_DAYS = 366;
const DAY_MS = 24 * 3600 * 1000;
const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

// 'YYYY-MM-DD' -> real calendar day? (rejects 2026-02-31)
function isRealDate(key) {
  const m = KEY.exec(String(key || '')); if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}
// Start (real UTC instant) of that Pakistan day.
const dayStart = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d) - D.TZ_OFFSET_MS_PUBLIC); };

// -> { key, from, to } (from inclusive, to exclusive) or null when a custom range is invalid.
function periodRange({ period = 'this_month', from, to } = {}, now = new Date()) {
  const end = new Date(now.getTime() + 1);
  if (period === 'this_month') return { key: period, from: D.pktMonthStart(now), to: end };
  if (period === 'last_month') return { key: period, from: D.pktMonthStart(now, 1), to: D.pktMonthStart(now) };
  if (period === 'last_30') return { key: period, from: new Date(D.pktDayStart(now).getTime() - 29 * DAY_MS), to: end };
  if (period === 'this_year') { const local = new Date(now.getTime() + D.TZ_OFFSET_MS_PUBLIC); return { key: period, from: new Date(Date.UTC(local.getUTCFullYear(), 0, 1) - D.TZ_OFFSET_MS_PUBLIC), to: end }; }
  if (period === 'custom') {
    if (!isRealDate(from) || !isRealDate(to)) return null;
    const a = dayStart(from); const b = new Date(dayStart(to).getTime() + DAY_MS); // "to" day is included
    if (b <= a || (b - a) / DAY_MS > MAX_CUSTOM_DAYS) return null;
    return { key: period, from: a, to: b };
  }
  return null;
}
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);
const sum = (rows, f) => (rows || []).reduce((s, r) => s + (Number(f(r)) || 0), 0);

// orders: [{ total }] counted orders; refunds: [{ amount }]; items: [{ costPrice, quantity }]; expenses: [{ category, amount }]
function summarize({ orders = [], refunds = [], items = [], expenses = [], hideProfit = false }) {
  const revenue = sum(orders, (o) => o.total);
  const refunded = sum(refunds, (r) => r.amount);
  const netRevenue = revenue - refunded;
  const cogs = sum(items, (i) => (i.costPrice > 0 ? i.costPrice * i.quantity : 0));
  const missingCost = items.filter((i) => !(i.costPrice > 0)).length;
  const expenseTotal = sum(expenses, (e) => e.amount);
  const byCat = new Map();
  for (const e of expenses) byCat.set(CATEGORIES.includes(e.category) ? e.category : 'Other', (byCat.get(CATEGORIES.includes(e.category) ? e.category : 'Other') || 0) + (Number(e.amount) || 0));
  const byCategory = [...byCat.entries()].map(([category, total]) => ({ category, total, share: pct(total, expenseTotal) })).sort((a, b) => b.total - a.total);
  const gross = netRevenue - cogs; const net = gross - expenseTotal;
  return {
    revenue, orders: orders.length, avgOrderValue: orders.length ? Math.round(revenue / orders.length) : 0, refunds: refunded, netRevenue,
    cogs: hideProfit ? null : cogs, grossProfit: hideProfit ? null : gross, missingCost: hideProfit ? null : missingCost,
    expenses: { total: expenseTotal, byCategory },
    netProfit: hideProfit ? null : net, margin: hideProfit ? null : pct(net, netRevenue),
    hidden: { profit: hideProfit },
  };
}
// Profit and cost figures are hidden from roles that may not see product cost or order profit.
const hidesProfit = (denied) => Boolean(denied && (denied.has('order.profit') || denied.has('product.costPrice')));

module.exports = { CATEGORIES, PERIODS, MAX_CUSTOM_DAYS, isRealDate, dayStart, periodRange, summarize, hidesProfit };
