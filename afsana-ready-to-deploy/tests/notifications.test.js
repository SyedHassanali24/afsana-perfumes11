const test = require('node:test');
const path = require('path'); const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..');
const R = require('../services/notificationRules');

const can = (...keys) => (m, a) => (keys.includes(`${m}.${a}`) ? [{ kind: 'all' }] : null);

test('notifications: forPermission hides a notification from staff without that permission; bad values fail closed', () => {
  assert.equal(R.isVisibleTo({ forPermission: 'orders.view' }, can('orders.view')), true);
  assert.equal(R.isVisibleTo({ forPermission: 'orders.view' }, can('returns.view')), false);
  assert.equal(R.isVisibleTo({}, can()), true, 'no forPermission = everyone');
  assert.equal(R.isVisibleTo({ forPermission: 'nonsense' }, can('nonsense')), false);
  assert.equal(R.isVisibleTo({ forPermission: 'orders.view.extra' }, can('orders.view')), false);
});

test('notifications: list shows only what the member may see, counts unread, and read state is per person', () => {
  const rows = [
    { _id: 'n1', type: 'new_order', title: 'New order', forPermission: 'orders.view', readBy: [], createdAt: 3 },
    { _id: 'n2', type: 'low_stock', title: 'Low stock', forPermission: 'inventory.view', readBy: ['u1'], createdAt: 2 },
    { _id: 'n3', type: 'new_review', title: 'Review', forPermission: 'reviews.view', readBy: [], createdAt: 1 },
  ];
  const a = R.build(rows, can('orders.view', 'inventory.view'), 'u1');
  assert.deepEqual(a.notifications.map((n) => [n.id, n.read]), [['n1', false], ['n2', true]]); assert.equal(a.unread, 1);
  const b = R.build(rows, can('orders.view', 'inventory.view'), 'u2');
  assert.equal(b.unread, 2, 'another staff member has not read n2');
  assert.deepEqual(R.build([], can(), 'u1'), { notifications: [], unread: 0 });
});

test('notifications: the bell only follows links inside /admin', () => {
  assert.equal(R.safeLink('/admin/orders'), '/admin/orders'); assert.equal(R.safeLink('/admin'), '/admin');
  for (const bad of ['https://evil.example', '//evil.example', '/shop', 'javascript:alert(1)', '/administrator', null, undefined]) assert.equal(R.safeLink(bad), '/admin');
});

// ---- service against a tiny in-memory fake ----
const stub = (rel, exp) => { const p = require.resolve(path.join(ROOT, rel)); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
const copy = (x) => JSON.parse(JSON.stringify(x));
let ROWS;
const mk = (id, perm, readBy = []) => ({ _id: id.padEnd(24, '0'), type: 'new_order', title: id, forPermission: perm, readBy, createdAt: ROWS ? ROWS.length : 0 });
stub('database/models/index.js', { Notification: {
  find: () => { const o = { sort() { return o; }, limit() { return o; }, lean: async () => [...ROWS].reverse().map(copy) }; return o; },
  findById: (id) => ({ lean: async () => { const d = ROWS.find((r) => r._id === id); return d ? copy(d) : null; } }),
  updateOne: async (f, u) => { const d = ROWS.find((r) => r._id === f._id); (u.$addToSet.readBy !== undefined) && !d.readBy.includes(u.$addToSet.readBy) && d.readBy.push(u.$addToSet.readBy); },
  updateMany: async (f, u) => { ROWS.filter((r) => f._id.$in.includes(r._id)).forEach((d) => { if (!d.readBy.includes(u.$addToSet.readBy)) d.readBy.push(u.$addToSet.readBy); }); },
} });
const N = require('../services/notificationService');
const ctxFor = (uid, ...keys) => ({ user: { _id: uid }, perms: { can: can(...keys) } });

test('notifications service: list, mark one read, mark all read (only what the member can see)', async () => {
  ROWS = []; ROWS.push(mk('a1', 'orders.view')); ROWS.push(mk('b2', 'reviews.view')); ROWS.push(mk('c3', null));
  const me = ctxFor('u1', 'orders.view');
  let r = await N.list(me);
  assert.deepEqual(r.notifications.map((n) => n.title), ['c3', 'a1']); assert.equal(r.unread, 2);
  await N.markRead(me, 'a1'.padEnd(24, '0'));
  assert.equal((await N.list(me)).unread, 1);
  await assert.rejects(() => N.markRead(me, 'b2'.padEnd(24, '0')), /not found/i); // no permission: cannot even confirm it exists
  await assert.rejects(() => N.markRead(me, 'zzz'), /not found/i);
  const all = await N.markAllRead(me);
  assert.equal(all.marked, 1); assert.equal((await N.list(me)).unread, 0);
  assert.deepEqual(ROWS.find((x) => x.title === 'b2').readBy, [], 'a notification I cannot see was not touched');
  assert.equal((await N.list(ctxFor('u2', 'orders.view'))).unread, 2, 'read state is per person');
});

test('notifications handler: three routes for any signed-in staff (no module permission)', () => {
  stub('middleware/withApi.js', { createHandler: (g, routes) => ({ group: g, routes }) });
  const { group, routes } = require('../netlify/functions/notifications/index.js').handler;
  assert.equal(group, 'notifications');
  assert.deepEqual(routes.map((r) => `${r.method} ${r.path}${r.permission || r.public || r.audience ? ' RESTRICTED' : ''}`), ['GET /admin', 'POST /admin/read-all', 'POST /admin/:id/read']);
});
