const test = require('node:test');
const path = require('path'); const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..');

// Customers service against a tiny in-memory fake of the Mongo models (no real database): checks the filters, scope, field hiding and audit.
const stub = (rel, exp) => { const p = require.resolve(path.join(ROOT, rel)); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
const seen = {};
const fresh = () => [
  { _id: 'a'.repeat(24), name: 'Ayesha', phone: '03001111111', city: 'Multan', segment: 'Repeat', stats: { ordersCount: 3, totalSpent: 9000 }, addresses: [{ line1: 'House 1', phone: '03001111111' }] },
  { _id: 'b'.repeat(24), name: 'Bilal Raza', phone: '03002222222', city: 'Lahore', segment: 'VIP', stats: {} },
];
let DB = fresh();
const match = (d, f) => Object.entries(f).every(([k, v]) => k === '$and' ? v.every((x) => match(d, x)) : k === '$or' ? v.some((x) => match(d, x))
  : v instanceof RegExp ? v.test(d[k] || '') : v && v.$in ? v.$in.includes(d[k]) : (k === 'isDeleted' ? !!d.isDeleted === v : d[k] === v));
const copy = (x) => JSON.parse(JSON.stringify(x));
const chain = (rows) => ({ sort() { return this; }, skip() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => rows.map(copy) });
stub('database/models/index.js', {
  Customer: {
    find: (f) => chain(DB.filter((d) => match(d, f))),
    countDocuments: async (f) => DB.filter((d) => match(d, f)).length,
    aggregate: async (p) => { const g = {}; DB.filter((d) => match(d, p[0].$match)).forEach((d) => { g[d.segment] = (g[d.segment] || 0) + 1; }); return Object.entries(g).map(([_id, n]) => ({ _id, n })); },
    findOne: (f) => ({ lean: async () => { const d = DB.find((x) => match(x, f)); return d ? copy(d) : null; } }),
    findByIdAndUpdate: (id, u) => ({ lean: async () => { const d = DB.find((x) => x._id === id); Object.assign(d, u.$set); return copy(d); } }),
  },
  Order: { find: () => chain([{ _id: 'o1', orderNumber: 'AFS-1', status: 'New', total: 1000 }]) },
});
stub('services/audit.js', { audit: async (c, e) => { seen.audit = e; } });
const C = require('../services/customerService');
const all = [{ kind: 'all', values: [] }];
const A = 'a'.repeat(24); const B = 'b'.repeat(24);

test('customers service: search, group filter and counts', async () => {
  DB = fresh();
  let r = await C.list({ q: 'ayesha' }, all, 'U', new Set());
  assert.deepEqual(r.customers.map((c) => c.name), ['Ayesha']); assert.equal(r.counts.Repeat, 1);
  r = await C.list({ segment: 'VIP' }, all, 'U', new Set());
  assert.deepEqual(r.customers.map((c) => c.name), ['Bilal Raza']); assert.equal(r.counts.Repeat, 1, 'chips still show the other groups');
});

test('customers service: phone search is blocked when the role may not see phones; city scope; no scope = nothing', async () => {
  DB = fresh();
  assert.equal((await C.list({ q: '0300111' }, all, 'U', new Set(['customer.phone']))).customers.length, 0);
  assert.equal((await C.list({ q: '0300111' }, all, 'U', new Set())).customers.length, 1);
  assert.deepEqual((await C.list({}, [{ kind: 'cities', values: ['Lahore'] }], 'U', new Set())).customers.map((c) => c.name), ['Bilal Raza']);
  assert.equal((await C.list({}, [], 'U', new Set())).customers.length, 0);
});

test('customers service: get hides phone/address, lists orders, refuses bad / unknown / out-of-scope ids', async () => {
  DB = fresh();
  const r = await C.get(A, all, 'U', new Set(['customer.phone', 'customer.address']));
  assert.equal(JSON.stringify(r).includes('03001111111'), false); assert.deepEqual(r.hidden, { phone: true, address: true }); assert.equal(r.orders.length, 1);
  await assert.rejects(() => C.get('zzz', all, 'U', new Set()), /not found/i);
  await assert.rejects(() => C.get('c'.repeat(24), all, 'U', new Set()), /not found/i);
  await assert.rejects(() => C.get(B, [{ kind: 'cities', values: ['Karachi'] }], 'U', new Set()), /not found/i);
});

test('customers service: update changes only group + notes, writes an audit row, refuses an empty patch', async () => {
  DB = fresh();
  const ctx = { user: { _id: 'U' }, perms: { deniedFields: new Set() } };
  const r = await C.update(ctx, A, { segment: 'VIP', notes: 'Prefers oud' }, all);
  assert.equal(r.customer.segment, 'VIP'); assert.equal(seen.audit.action, 'customer.updated'); assert.equal(seen.audit.oldValue.segment, 'Repeat'); assert.equal(seen.audit.newValue.segment, 'VIP');
  await assert.rejects(() => C.update(ctx, A, {}, all), /Nothing to change/);
});

test('customers handler: 3 staff-only routes with the right permissions', () => {
  stub('middleware/withApi.js', { createHandler: (g, routes) => ({ group: g, routes }) });
  const { group, routes } = require('../netlify/functions/customers/index.js').handler;
  assert.equal(group, 'customers');
  assert.deepEqual(routes.map((r) => `${r.method} ${r.path} ${r.permission.join('.')}`), ['GET /admin customers.view', 'GET /admin/:id customers.view', 'PATCH /admin/:id customers.edit']);
  assert.ok(routes[0].query && routes[2].body, 'query and body are validated');
});
