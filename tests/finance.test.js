const test = require('node:test');
const path = require('path'); const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..');
const F = require('../services/financeRules');

test('finance: periods are Pakistan months / days (UTC+5) and custom ranges include the last day', () => {
  const now = new Date('2026-10-20T11:40:00Z');
  assert.equal(F.periodRange({ period: 'this_month' }, now).from.toISOString(), '2026-09-30T19:00:00.000Z');
  const last = F.periodRange({ period: 'last_month' }, now);
  assert.deepEqual([last.from.toISOString(), last.to.toISOString()], ['2026-08-31T19:00:00.000Z', '2026-09-30T19:00:00.000Z']);
  assert.equal(F.periodRange({ period: 'last_30' }, now).from.toISOString(), '2026-09-20T19:00:00.000Z', '30 days including today');
  assert.equal(F.periodRange({ period: 'this_year' }, now).from.toISOString(), '2025-12-31T19:00:00.000Z');
  const c = F.periodRange({ period: 'custom', from: '2026-10-01', to: '2026-10-31' }, now);
  assert.equal(c.to.toISOString(), '2026-10-31T19:00:00.000Z', 'the "to" day is included');
  assert.equal(F.periodRange({ period: 'custom', from: '2026-02-31', to: '2026-03-01' }, now), null, 'not a real date');
  assert.equal(F.periodRange({ period: 'custom', from: '2026-10-05', to: '2026-10-01' }, now), null, 'to before from');
  assert.equal(F.periodRange({ period: 'custom', from: '2025-01-01', to: '2026-10-01' }, now), null, 'longer than 366 days');
  assert.equal(F.periodRange({ period: 'bogus' }, now), null);
  assert.equal(F.isRealDate('2026-10-20'), true); assert.equal(F.isRealDate('20-10-2026'), false);
});

test('finance: summary maths (revenue - refunds - cost of goods - expenses), with missing costs reported', () => {
  const s = F.summarize({
    orders: [{ total: 5000 }, { total: 3000 }], refunds: [{ amount: 500 }],
    items: [{ costPrice: 1000, quantity: 2 }, { costPrice: 1500, quantity: 1 }, { costPrice: null, quantity: 4 }],
    expenses: [{ category: 'Advertising', amount: 1500 }, { category: 'Shipping', amount: 500 }, { category: 'Advertising', amount: 500 }, { category: 'Weird', amount: 100 }],
  });
  assert.deepEqual([s.revenue, s.orders, s.avgOrderValue, s.refunds, s.netRevenue], [8000, 2, 4000, 500, 7500]);
  assert.deepEqual([s.cogs, s.missingCost, s.grossProfit], [3500, 1, 4000]);
  assert.equal(s.expenses.total, 2600);
  assert.deepEqual(s.expenses.byCategory.map((c) => [c.category, c.total]), [['Advertising', 2000], ['Shipping', 500], ['Other', 100]], 'unknown category counts as Other; biggest first');
  assert.equal(s.expenses.byCategory[0].share, 76.9);
  assert.deepEqual([s.netProfit, s.margin], [1400, 18.7]);
});

test('finance: empty period is all zeros, and profit figures are REMOVED (null) for roles that may not see cost', () => {
  const z = F.summarize({});
  assert.deepEqual([z.revenue, z.orders, z.avgOrderValue, z.netProfit, z.margin, z.expenses.total], [0, 0, 0, 0, null, 0]);
  const h = F.summarize({ orders: [{ total: 100 }], items: [{ costPrice: 40, quantity: 1 }], expenses: [{ category: 'Rent', amount: 10 }], hideProfit: true });
  assert.deepEqual([h.cogs, h.grossProfit, h.netProfit, h.margin, h.missingCost, h.hidden.profit], [null, null, null, null, null, true]);
  assert.equal(h.revenue, 100); assert.equal(h.expenses.total, 10);
  assert.equal(F.hidesProfit(new Set(['product.costPrice'])), true); assert.equal(F.hidesProfit(new Set(['order.profit'])), true);
  assert.equal(F.hidesProfit(new Set(['customer.phone'])), false); assert.equal(F.hidesProfit(null), false);
});

// ---- service against a tiny in-memory fake of the models ----
const stub = (rel, exp) => { const p = require.resolve(path.join(ROOT, rel)); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
const copy = (x) => JSON.parse(JSON.stringify(x));
const val = (d, k) => d[k];
const ok = (dv, cond) => cond && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond)
  ? Object.entries(cond).every(([op, x]) => op === '$in' ? x.map(String).includes(String(dv)) : op === '$nin' ? !x.includes(dv) : op === '$gte' ? new Date(dv) >= x : op === '$lt' ? new Date(dv) < x : true)
  : String(dv) === String(cond);
const match = (d, f) => Object.entries(f).every(([k, c]) => ok(val(d, k), c));
const q = (rows) => { const o = { sort() { return o; }, select() { return o; }, skip(n) { rows = rows.slice(n); return o; }, limit(n) { rows = rows.slice(0, n); return o; }, lean: async () => rows.map(copy), then: (a, b) => Promise.resolve(rows.map(copy)).then(a, b) }; return o; };
let ORDERS; let REFUNDS; let ITEMS; let EXPS; let AUDIT; let seq;
const reset = () => {
  seq = 0; AUDIT = [];
  ORDERS = [
    { _id: 'o1', total: 5000, status: 'Delivered', createdAt: '2026-10-05T10:00:00Z' }, { _id: 'o2', total: 3000, status: 'Shipped', createdAt: '2026-10-10T10:00:00Z' },
    { _id: 'o3', total: 9999, status: 'Cancelled', createdAt: '2026-10-11T10:00:00Z' }, { _id: 'o4', total: 7777, status: 'Delivered', createdAt: '2026-09-15T10:00:00Z' },
    { _id: 'o5', total: 4000, status: 'Refunded', createdAt: '2026-10-12T10:00:00Z' },
  ];
  REFUNDS = [{ orderId: 'o1', amount: 500 }, { orderId: 'o5', amount: 4000 }];
  ITEMS = [{ orderId: 'o1', costPrice: 1000, quantity: 2 }, { orderId: 'o2', costPrice: 1500, quantity: 1 }, { orderId: 'o3', costPrice: 9999, quantity: 1 }];
  EXPS = [{ _id: 'a1'.padEnd(24, '0'), category: 'Advertising', amount: 2000, date: '2026-10-07T00:00:00Z', description: 'Meta ads' }, { _id: 'a2'.padEnd(24, '0'), category: 'Rent', amount: 9000, date: '2026-09-02T00:00:00Z' }];
};
stub('database/models/index.js', {
  Order: { find: (f) => q(ORDERS.filter((d) => match(d, f))) }, Refund: { find: (f) => q(REFUNDS.filter((d) => match(d, f))) }, OrderItem: { find: (f) => q(ITEMS.filter((d) => match(d, f))) },
  Expense: {
    find: (f) => q(EXPS.filter((d) => match(d, f))), countDocuments: async (f) => EXPS.filter((d) => match(d, f)).length,
    aggregate: async (pipeline) => {
      const matchStage = pipeline.find((s) => s.$match)?.$match || {};
      const total = EXPS.filter((d) => match(d, matchStage)).reduce((sum, d) => sum + Number(d.amount || 0), 0);
      return total ? [{ _id: null, total }] : [];
    },
    create: async (b) => { const d = { _id: `a${3 + ++seq}`.padEnd(24, '0'), ...b, date: b.date.toISOString() }; EXPS.push(d); return { toObject: () => copy(d) }; },
    findById: (id) => ({ lean: async () => { const d = EXPS.find((x) => x._id === id); return d ? copy(d) : null; } }),
    findByIdAndUpdate: (id, u) => ({ lean: async () => { const d = EXPS.find((x) => x._id === id); Object.assign(d, u.$set, u.$set.date ? { date: u.$set.date.toISOString() } : {}); return copy(d); } }),
    deleteOne: async (f) => { EXPS = EXPS.filter((x) => x._id !== f._id); },
  },
});
stub('services/audit.js', { audit: async (c, e) => { AUDIT.push(e); } });
const Fin = require('../services/financeService');
const ALL = [{ kind: 'all', values: [] }]; const NOW = new Date('2026-10-20T11:40:00Z'); const ctx = { user: { _id: 'u1' } };

test('finance service: October summary counts only sales that still stand, subtracts partial refunds, cost and expenses', async () => {
  reset();
  const s = await Fin.summary({ period: 'this_month' }, ALL, new Set(), NOW);
  assert.deepEqual([s.revenue, s.orders, s.refunds, s.netRevenue], [8000, 2, 500, 7500], 'cancelled, refunded and September orders are not revenue; the refund of the Refunded order is not subtracted twice');
  assert.deepEqual([s.cogs, s.grossProfit, s.expenses.total, s.netProfit], [3500, 4000, 2000, 2000]);
  assert.deepEqual(s.range, { key: 'this_month', from: '2026-10-01', to: '2026-10-20' });
  const last = await Fin.summary({ period: 'last_month' }, ALL, new Set(), NOW);
  assert.deepEqual([last.revenue, last.expenses.total], [7777, 9000]);
});

test('finance service: a role denied cost / profit gets no profit figures; a city-limited role is refused; a bad range is refused', async () => {
  reset();
  const s = await Fin.summary({ period: 'this_month' }, ALL, new Set(['product.costPrice']), NOW);
  assert.deepEqual([s.revenue, s.cogs, s.grossProfit, s.netProfit], [8000, null, null, null]);
  await assert.rejects(() => Fin.summary({ period: 'this_month' }, [{ kind: 'cities', values: ['Lahore'] }], new Set(), NOW), /full access/);
  await assert.rejects(() => Fin.summary({ period: 'custom', from: '2026-10-05', to: '2026-10-01' }, ALL, new Set(), NOW), /valid date range/);
});

test('finance service: expenses list / filter / total, create, update, delete with audit', async () => {
  reset();
  let r = await Fin.listExpenses({ page: 1, limit: 20 }, ALL);
  assert.deepEqual([r.expenses.length, r.total], [2, 11000]);
  r = await Fin.listExpenses({ category: 'Rent', page: 1, limit: 20 }, ALL); assert.deepEqual([r.expenses.length, r.total], [1, 9000]);
  r = await Fin.listExpenses({ from: '2026-10-01', to: '2026-10-31', page: 1, limit: 20 }, ALL); assert.deepEqual([r.expenses.map((e) => e.description), r.total], [['Meta ads'], 2000]);
  const c = await Fin.createExpense(ctx, { category: 'Packaging', amount: 750, date: '2026-10-18', description: 'Boxes' }, ALL);
  assert.deepEqual([c.expense.category, c.expense.amount, c.expense.date], ['Packaging', 750, '2026-10-18'], 'stored as that Pakistan day');
  assert.equal(AUDIT.at(-1).action, 'expense.created');
  const u = await Fin.updateExpense(ctx, c.expense._id, { amount: 800, date: '2026-10-19' }, ALL);
  assert.deepEqual([u.expense.amount, u.expense.date], [800, '2026-10-19']); assert.equal(AUDIT.at(-1).oldValue.amount, 750);
  await Fin.deleteExpense(ctx, c.expense._id, ALL); assert.equal(EXPS.length, 2); assert.equal(AUDIT.at(-1).action, 'expense.deleted');
  await assert.rejects(() => Fin.deleteExpense(ctx, 'zzz', ALL), /not found/i);
  await assert.rejects(() => Fin.createExpense(ctx, { category: 'Rent', amount: 1, date: '2026-10-18' }, [{ kind: 'cities', values: ['x'] }]), /full access/);
});

test('finance schemas: dates must be real, amount a positive whole number (text ok), category known, custom range valid', () => {
  const S = require('../validation/schemas');
  assert.equal(S.expenseBody.safeParse({ category: 'Rent', amount: '1500', date: '2026-10-01' }).data.amount, 1500);
  for (const bad of [{ category: 'Rent', amount: 0, date: '2026-10-01' }, { category: 'Rent', amount: 1.5, date: '2026-10-01' }, { category: 'Fun', amount: 5, date: '2026-10-01' }, { category: 'Rent', amount: 5, date: '2026-02-30' }, { category: 'Rent', amount: 5 }]) assert.equal(S.expenseBody.safeParse(bad).success, false, JSON.stringify(bad));
  assert.equal(S.expensePatch.safeParse({}).success, false); assert.deepEqual(Object.keys(S.expensePatch.parse({ amount: 5, junk: 1 })), ['amount']);
  assert.equal(S.financeQuery.parse({}).period, 'this_month');
  assert.equal(S.financeQuery.safeParse({ period: 'custom' }).success, false, 'custom needs from and to');
  assert.equal(S.financeQuery.safeParse({ period: 'custom', from: '2026-10-01', to: '2026-10-31' }).success, true);
  assert.equal(S.financeQuery.safeParse({ period: 'forever' }).success, false);
  assert.equal(S.expenseQuery.parse({ page: '2' }).limit, 20);
});

test('finance handler: summary needs finance.view; expenses need expenses.view/create/edit/delete', () => {
  stub('middleware/withApi.js', { createHandler: (g, routes) => ({ group: g, routes }) });
  const { group, routes } = require('../netlify/functions/finance/index.js').handler;
  assert.equal(group, 'finance');
  assert.deepEqual(routes.map((r) => `${r.method} ${r.path} ${r.permission.join('.')}`), ['GET /admin/summary finance.view', 'GET /admin/expenses expenses.view', 'POST /admin/expenses expenses.create', 'PATCH /admin/expenses/:id expenses.edit', 'DELETE /admin/expenses/:id expenses.delete']);
});
