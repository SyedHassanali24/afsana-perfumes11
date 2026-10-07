// The ONLY place that knows both the GET /api/analytics/dashboard shape and the Dashboard UI shape.
// Pure (no React, no fetch, no imports) so tests/dashboard.test.js can load it.
//
// Two kinds of "no value" (both must never crash the page):
//  - a whole SECTION is null            -> the role may not see it           -> UI shows "hidden"
//  - a FIELD is missing from the object -> field-level redaction (e.g. profit) -> "hidden"
//  - a FIELD is null                    -> allowed but unknown (e.g. no cost snapshot) -> "—"

export const HIDDEN = 'hidden';
export const DASH = '—';

export const money = (n) => (typeof n === 'number' && Number.isFinite(n) ? `PKR ${n.toLocaleString('en-PK')}` : DASH);
const num = (n) => (typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('en-PK') : DASH);
const pctOrUndefined = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined); // undefined -> StatCard hides the trend row

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "2026-10-06" -> "6 Oct" (string work only, so the viewer's timezone cannot shift the day)
export const dayLabel = (key) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : String(key || '');
};
const shortDate = (d) => {
  const t = d ? new Date(d) : null;
  return t && !Number.isNaN(t.getTime()) ? t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
};

const card = (key, label, value, changePct, changeLabel) => ({ key, label, value, changePct, changeLabel: changePct === undefined ? undefined : changeLabel });

// `dashboard` = the object inside { success, dashboard }. Anything missing is treated as hidden.
export function toDashboard(dashboard) {
  const d = dashboard || {};
  const k = d.kpis || null;
  const stock = d.lowStock || null;

  const cards = [
    card('todayRevenue', "Today's revenue", k ? money(k.todayRevenue) : HIDDEN, k ? pctOrUndefined(k.todayRevenueChangePct) : undefined, 'vs yesterday'),
    card('todayOrders', "Today's orders", k ? num(k.todayOrders) : HIDDEN),
    card('monthRevenue', 'This month', k ? money(k.monthRevenue) : HIDDEN, k ? pctOrUndefined(k.monthRevenueChangePct) : undefined, 'vs last month so far'),
    card('pendingOrders', 'Pending orders', k ? num(k.pendingOrders) : HIDDEN),
    card('lowStock', 'Low stock', stock ? num(stock.count) : HIDDEN),
    card('avgOrderValue', 'Avg. order value', k ? money(k.avgOrderValue) : HIDDEN, k ? pctOrUndefined(k.avgOrderValueChangePct) : undefined, 'vs last month so far'),
  ];

  const series = Array.isArray(d.revenueSeries) ? d.revenueSeries.map((p) => ({ date: dayLabel(p.date), revenue: Number(p.revenue) || 0 })) : null;

  const recentOrders = Array.isArray(d.recentOrders)
    ? d.recentOrders.map((o) => ({ id: o.orderNumber || DASH, customer: o.customerName || DASH, total: money(o.total), status: o.status, date: shortDate(o.createdAt) }))
    : null;

  const lowStock = stock
    ? { count: Number(stock.count) || 0, outOfStock: Number(stock.outOfStock) || 0,
      items: (stock.items || []).map((i) => ({ id: i.id, name: i.label ? `${i.name} — ${i.label}` : i.name, stock: i.available, threshold: i.threshold })) }
    : null;

  const top = d.topProducts || null;
  const topProducts = top
    ? { days: top.days || 30,
      rows: (top.items || []).map((p) => ({
        id: p.productId, name: p.name || DASH, units: num(p.units), revenue: money(p.revenue),
        profit: Object.prototype.hasOwnProperty.call(p, 'profit') ? (p.profit === null ? DASH : money(p.profit)) : HIDDEN, // key removed = redacted
      })) }
    : null;

  return {
    cards, series, recentOrders, lowStock, topProducts,
    seriesIsEmpty: !!series && series.every((p) => p.revenue === 0),
    allHidden: !k && !series && !recentOrders && !lowStock && !topProducts, // role has dashboard.view but none of the data permissions
  };
}
