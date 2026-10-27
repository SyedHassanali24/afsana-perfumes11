const test = require('node:test');
const path = require('path'); const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..');

// Reviews service against a tiny in-memory fake of the Mongo models (no real database).
const stub = (rel, exp) => { const p = require.resolve(path.join(ROOT, rel)); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
const copy = (x) => JSON.parse(JSON.stringify(x));
const get = (d, k) => k.split('.').reduce((o, p) => (o == null ? o : o[p]), d);
const match = (d, f) => Object.entries(f).every(([k, v]) => k === '$and' ? v.every((x) => match(d, x)) : k === '$or' ? v.some((x) => match(d, x))
  : v instanceof RegExp ? v.test(get(d, k) || '') : v && v.$in ? v.$in.map(String).includes(String(get(d, k))) : String(get(d, k)) === String(v) || (k === 'isDeleted' && !!d.isDeleted === v));
// a query that can be awaited directly OR chained (.sort/.select/.skip/.limit/.lean)
const q = (rows, one) => { const out = () => (one ? (rows[0] ? copy(rows[0]) : null) : rows.map(copy)); const o = { sort() { return o; }, select() { return o; }, skip(n) { rows = rows.slice(n); return o; }, limit(n) { rows = rows.slice(0, n); return o; }, lean: async () => out(), then: (a, b) => Promise.resolve(out()).then(a, b) }; return o; };

let REVIEWS; let PRODUCTS; let ORDERS; let ITEMS; let CUSTOMERS; let NOTES; let seq;
const reset = () => {
  seq = 0; NOTES = []; REVIEWS = [];
  PRODUCTS = [{ _id: 'p'.repeat(24), name: 'Oud Royal', slug: 'oud-royal', status: 'Active', isDeleted: false, ratingAvg: 0, ratingCount: 0 }];
  CUSTOMERS = [{ _id: 'c1'.padEnd(24, '0'), name: 'Ayesha Khan' }, { _id: 'c2'.padEnd(24, '0'), name: 'Bilal Raza' }];
  ORDERS = [{ _id: 'o1'.padEnd(24, '0'), customerId: 'c1'.padEnd(24, '0'), status: 'Delivered' }, { _id: 'o2'.padEnd(24, '0'), customerId: 'c2'.padEnd(24, '0'), status: 'Shipped' }];
  ITEMS = [{ orderId: 'o1'.padEnd(24, '0'), productId: 'p'.repeat(24) }, { orderId: 'o2'.padEnd(24, '0'), productId: 'p'.repeat(24) }];
};
const upd = (rows, f, u) => { const d = rows.find((x) => match(x, f)); if (!d) return null; Object.assign(d, u.$set || {}); for (const k of Object.keys(u.$unset || {})) delete d[k]; return d; };
stub('database/models/index.js', {
  Review: {
    find: (f) => q(REVIEWS.filter((d) => match(d, f))), countDocuments: async (f) => REVIEWS.filter((d) => match(d, f)).length,
    findOne: (f) => { const d = REVIEWS.find((x) => match(x, f)); const o = q(d ? [d] : [], true); return o; },
    create: async (b) => { if (REVIEWS.some((r) => r.productId === b.productId && r.customerId === b.customerId)) { const e = new Error('dup'); e.code = 11000; throw e; } const d = { _id: `a${++seq}`.padEnd(24, "0"), status: 'Pending', isDeleted: false, createdAt: `2026-10-0${seq}`, ...b }; REVIEWS.push(d); return { toObject: () => copy(d) }; },
    findByIdAndUpdate: (id, u) => ({ lean: async () => { const d = upd(REVIEWS, { _id: id }, u); return d ? copy(d) : null; } }),
    findOneAndUpdate: (f, u) => ({ lean: async () => { const d = upd(REVIEWS, f, u); return d ? copy(d) : null; } }),
    findOneAndDelete: async (f) => { const i = REVIEWS.findIndex((x) => match(x, f)); return i < 0 ? null : REVIEWS.splice(i, 1)[0]; },
  },
  Product: { findOne: (f) => q(PRODUCTS.filter((d) => match(d, f)), true), find: (f) => q(PRODUCTS.filter((d) => match(d, f))), updateOne: async (f, u) => { upd(PRODUCTS, f, u); } },
  Order: { find: (f) => q(ORDERS.filter((d) => match(d, f))) },
  OrderItem: { findOne: (f) => q(ITEMS.filter((d) => match(d, f)), true) },
  Customer: { find: (f) => q(CUSTOMERS.filter((d) => match(d, f))) },
  Notification: { create: (n) => { NOTES.push(n); return Promise.resolve(n); } },
});
let AUDIT = []; stub('services/audit.js', { audit: async (c, e) => { AUDIT.push(e); } });
const Rv = require('../services/reviewService');
const P = 'p'.repeat(24); const AY = { customer: { _id: 'c1'.padEnd(24, '0') } }; const BI = { customer: { _id: 'c2'.padEnd(24, '0') } };
const STAFF = { user: { _id: 'staff1' } };

test('reviews service: only a shopper whose order was DELIVERED can review (verified buyer)', async () => {
  reset();
  assert.deepEqual((await Rv.mine(AY, 'oud-royal')), { canReview: true, review: null });
  assert.equal((await Rv.mine(BI, 'oud-royal')).canReview, false, 'order only Shipped');
  await assert.rejects(() => Rv.saveMine(BI, 'oud-royal', { rating: 5 }), /received this perfume/);
  await assert.rejects(() => Rv.mine(AY, 'no-such-perfume'), /not found/i);
});

test('reviews service: new review is Pending, hidden from the public, and notifies staff; approve publishes it and updates the product rating', async () => {
  reset();
  const { review } = await Rv.saveMine(AY, 'oud-royal', { rating: 5, title: ' Lovely ', text: 'Lasts all day' });
  assert.equal(review.status, 'Pending'); assert.equal(review.title, 'Lovely');
  assert.equal(NOTES.length, 1); assert.equal(NOTES[0].type, 'new_review'); assert.equal(NOTES[0].forPermission, 'reviews.view');
  assert.equal((await Rv.listPublic('oud-royal', {})).reviews.length, 0);
  await Rv.moderate(STAFF, review.id, 'Approved');
  const pub = await Rv.listPublic('oud-royal', {});
  assert.equal(pub.reviews.length, 1); assert.equal(pub.reviews[0].name, 'Ayesha K.'); assert.deepEqual([pub.summary.avg, pub.summary.count], [5, 1]);
  assert.deepEqual([PRODUCTS[0].ratingAvg, PRODUCTS[0].ratingCount], [5, 1]);
  assert.equal(AUDIT.at(-1).action, 'review.moderated');
  assert.equal(JSON.stringify(pub).includes('c1'), false, 'no customer id in the public answer');
});

test('reviews service: editing an approved review sends it back to Pending and removes it from the public list and the rating', async () => {
  reset();
  const { review } = await Rv.saveMine(AY, 'oud-royal', { rating: 5, text: 'first' });
  await Rv.moderate(STAFF, review.id, 'Approved');
  const edited = await Rv.saveMine(AY, 'oud-royal', { rating: 1, text: 'changed my mind' });
  assert.equal(edited.review.status, 'Pending'); assert.equal(REVIEWS.length, 1, 'one review per shopper per product');
  assert.equal((await Rv.listPublic('oud-royal', {})).reviews.length, 0); assert.deepEqual([PRODUCTS[0].ratingAvg, PRODUCTS[0].ratingCount], [0, 0]);
});

test('reviews service: shopper can delete their own review; staff cannot re-apply the same status; bad id is not found', async () => {
  reset();
  const { review } = await Rv.saveMine(AY, 'oud-royal', { rating: 4 });
  await Rv.moderate(STAFF, review.id, 'Featured');
  assert.equal(PRODUCTS[0].ratingCount, 1);
  await assert.rejects(() => Rv.moderate(STAFF, review.id, 'Featured'), /already Featured/);
  await assert.rejects(() => Rv.moderate(STAFF, 'zzz', 'Approved'), /not found/i);
  await Rv.removeMine(AY, 'oud-royal');
  assert.equal(REVIEWS.length, 0); assert.equal(PRODUCTS[0].ratingCount, 0);
  const again = await Rv.saveMine(AY, 'oud-royal', { rating: 3 });
  assert.equal(again.review.status, 'Pending', 'can write a new one after deleting');
});

test('reviews service: admin list has names, product, and counts per status', async () => {
  reset();
  const a = await Rv.saveMine(AY, 'oud-royal', { rating: 5, text: 'Great' });
  const r = await Rv.listAdmin({});
  assert.equal(r.reviews.length, 1); assert.equal(r.reviews[0].product.name, 'Oud Royal'); assert.equal(r.reviews[0].customerName, 'Ayesha Khan');
  assert.deepEqual(r.counts, { Pending: 1, Approved: 0, Rejected: 0, Featured: 0 });
  assert.equal((await Rv.listAdmin({ status: 'Approved' })).reviews.length, 0);
  assert.equal((await Rv.listAdmin({ q: 'ayesha' })).reviews.length, 1);
  assert.ok(a.review.id);
});

test('reviews handler: public list, my review (customer), moderation (staff, reviews.approve)', () => {
  stub('middleware/withApi.js', { createHandler: (g, routes) => ({ group: g, routes }) });
  const { group, routes } = require('../netlify/functions/reviews/index.js').handler;
  assert.equal(group, 'reviews');
  assert.deepEqual(routes.map((r) => `${r.method} ${r.path} ${r.public ? 'public' : r.audience === 'customer' ? 'customer' : r.permission.join('.')}`), [
    'GET /product/:slug public', 'GET /mine/:slug customer', 'PUT /mine/:slug customer', 'DELETE /mine/:slug customer', 'GET /admin reviews.view', 'PATCH /admin/:id/status reviews.approve',
  ]);
});
