const test = require('node:test');
const assert = require('node:assert/strict');
const { compile, match, stripPrefix } = require('../middleware/router');
const { resolve, scopeFilter, withinWorkingHours, NONE } = require('../middleware/permissions');
const { redact } = require('../middleware/redact');
const { toResponse, E } = require('../middleware/errors');
const { hit } = require('../middleware/rateLimit');
const { paging, escapeRegex } = require('../middleware/pagination');
const P = require('../services/pricing');

const grant = (module, actions, scope) => ({ module, actions, scope: scope || { kind: 'all', values: [] } });

test('router: static admin routes win over :slug, params decoded, prefixes stripped', () => {
  const c = compile([
    { method: 'GET', path: '/admin/list' }, { method: 'GET', path: '/admin/:id' }, { method: 'GET', path: '/:slug' }, { method: 'GET', path: '/' },
  ]);
  assert.equal(match(c, 'GET', '/admin/list').route.path, '/admin/list');
  assert.equal(match(c, 'GET', '/admin/abc123').params.id, 'abc123');
  assert.equal(match(c, 'GET', '/royal-oud').params.slug, 'royal-oud');
  assert.equal(match(c, 'GET', '/').route.path, '/');
  assert.equal(match(c, 'POST', '/royal-oud'), null);
  assert.equal(stripPrefix('/api/products/admin/x', 'products'), '/admin/x');
  assert.equal(stripPrefix('/.netlify/functions/products', 'products'), '/');
});

test('permissions: role grants, missing = null, owner unrestricted', () => {
  const role = { grants: [grant('orders', ['view', 'changeStatus'])] };
  const p = resolve({ role, staff: {} });
  assert.ok(p.can('orders', 'view'));
  assert.equal(p.can('orders', 'delete'), null);
  assert.equal(p.can('products', 'view'), null);
  assert.ok(resolve({ role: { isUnrestricted: true }, staff: {} }).can('security', 'edit'));
});

test('permissions: temporary override grants access only inside its window', () => {
  const now = new Date('2026-09-29T10:00:00Z');
  const role = { grants: [] };
  const mk = (startsAt, expiresAt) => ({ overrides: [{ effect: 'allow', grant: grant('finance', ['view']), startsAt, expiresAt }] });
  assert.ok(resolve({ role, staff: mk(new Date('2026-09-29T00:00:00Z'), new Date('2026-09-30T00:00:00Z')), now }).can('finance', 'view'));
  assert.equal(resolve({ role, staff: mk(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-02T00:00:00Z')), now }).can('finance', 'view'), null, 'expired');
  assert.equal(resolve({ role, staff: mk(new Date('2026-10-01T00:00:00Z'), undefined), now }).can('finance', 'view'), null, 'not started');
});

test('permissions: deny override beats role grant; denied fields merged', () => {
  const role = { grants: [grant('products', ['view', 'managePrice'])], deniedFields: ['product.costPrice'] };
  const staff = { overrides: [{ effect: 'deny', grant: grant('products', ['managePrice']) }], deniedFields: ['order.profit'] };
  const p = resolve({ role, staff });
  assert.equal(p.can('products', 'managePrice'), null);
  assert.ok(p.can('products', 'view'));
  assert.deepEqual([...p.deniedFields].sort(), ['order.profit', 'product.costPrice']);
  assert.deepEqual(p.toClient().modules, { products: ['view'] });
});

test('scopeFilter: all / createdByMe / cities / nothing mappable', () => {
  const map = { createdBy: 'createdBy', cities: 'shippingAddress.city' };
  assert.deepEqual(scopeFilter([{ kind: 'all', values: [] }], 'u1', map), {});
  assert.deepEqual(scopeFilter([{ kind: 'createdByMe', values: [] }, { kind: 'cities', values: ['Karachi'] }], 'u1', map),
    { $or: [{ createdBy: 'u1' }, { 'shippingAddress.city': { $in: ['Karachi'] } }] });
  assert.deepEqual(scopeFilter([{ kind: 'categories', values: ['x'] }], 'u1', map), NONE, 'unmappable scope must fail closed');
  assert.deepEqual(scopeFilter(null, 'u1', map), NONE);
});

test('working hours honour timezone and days', () => {
  const wh = { enabled: true, days: [1, 2, 3, 4, 5], start: '09:00', end: '18:00', timezone: 'Asia/Karachi' };
  assert.equal(withinWorkingHours(wh, new Date('2026-09-29T05:00:00Z')), true);   // Tue 10:00 PKT
  assert.equal(withinWorkingHours(wh, new Date('2026-09-29T14:00:00Z')), false);  // Tue 19:00 PKT
  assert.equal(withinWorkingHours(wh, new Date('2026-09-27T05:00:00Z')), false);  // Sunday
  assert.equal(withinWorkingHours({ enabled: false }, new Date()), true);
});

test('redact strips restricted fields deeply without mutating input', () => {
  const data = { product: { name: 'A' }, variants: [{ price: 1, costPrice: 5 }], order: { internalNotes: ['x'], shippingAddress: { phone: '1', city: 'K' } } };
  const out = redact(data, new Set(['product.costPrice', 'order.internalNotes', 'customer.phone']));
  assert.equal(out.variants[0].costPrice, undefined);
  assert.equal(out.variants[0].price, 1);
  assert.equal(out.order.shippingAddress.phone, undefined);
  assert.equal(out.order.shippingAddress.city, 'K');
  assert.equal(data.variants[0].costPrice, 5, 'input untouched');
});

test('errors: safe messages, no internals leaked', () => {
  const orig = console.error; console.error = () => {};
  const r = toResponse(new Error('MongoServerError: connection string mongodb+srv://user:pass@x'));
  console.error = orig;
  assert.equal(r.status, 500);
  assert.equal(r.body.error.message, 'Something went wrong. Please try again.');
  assert.equal(JSON.stringify(r.body).includes('mongodb'), false);
  assert.equal(toResponse({ code: 11000 }).status, 409);
  assert.equal(toResponse({ name: 'CastError' }).status, 400);
  assert.equal(toResponse({ name: 'ZodError', issues: [{ path: ['a', 'b'], message: 'bad' }] }).body.error.details[0].path, 'a.b');
  assert.equal(toResponse(E.conflict('x', undefined, 'OUT_OF_STOCK')).body.error.code, 'OUT_OF_STOCK');
});

test('rate limiter blocks after limit and recovers after window', () => {
  const t = 1000;
  assert.equal(hit('k', 2, 1000, t), true); assert.equal(hit('k', 2, 1000, t), true); assert.equal(hit('k', 2, 1000, t), false);
  assert.equal(hit('k', 2, 1000, t + 1500), true);
});

test('pagination clamps and regex escaping', () => {
  assert.deepEqual(paging({ page: '0', limit: '9999' }), { page: 1, limit: 100, skip: 0 });
  assert.deepEqual(paging({ page: '3', limit: '10' }), { page: 3, limit: 10, skip: 20 });
  assert.equal(new RegExp(escapeRegex('a.b(c)')).test('a.b(c)'), true);
  assert.equal(new RegExp(escapeRegex('a.b')).test('axb'), false);
});

test('pricing: effective price, shipping, coupons', () => {
  assert.equal(P.effectivePrice({ price: 3000, salePrice: 2500 }), 2500);
  assert.equal(P.effectivePrice({ price: 3000, salePrice: 3500 }), 3000, 'sale >= price ignored');
  assert.equal(P.calcShipping(4999), 250); assert.equal(P.calcShipping(5000), 0);
  // spec example: AFSANA10 = 10%, min order 2000, max discount 500
  const coupon = { code: 'AFSANA10', type: 'percentage', value: 10, minOrder: 2000, maxDiscount: 500, usageLimit: 500, usedCount: 0, perCustomerLimit: 1, isActive: true };
  const lines = [{ productId: 'p', categoryId: 'c', lineTotal: 8000 }];
  P.validateCoupon(coupon, { subtotal: 8000, customerId: 'c1', customerUses: 0 });
  assert.equal(P.calcDiscount(coupon, lines, 0).discount, 500, 'capped at max discount');
  assert.equal(P.calcDiscount(coupon, [{ productId: 'p', categoryId: 'c', lineTotal: 3000 }], 0).discount, 300);
  assert.throws(() => P.validateCoupon(coupon, { subtotal: 1500 }), /Minimum order/);
  assert.throws(() => P.validateCoupon({ ...coupon, usedCount: 500 }, { subtotal: 3000 }), /usage limit/);
  assert.throws(() => P.validateCoupon(coupon, { subtotal: 3000, customerId: 'c1', customerUses: 1 }), /already used/);
  assert.throws(() => P.validateCoupon({ ...coupon, expiresAt: new Date('2020-01-01') }, { subtotal: 3000 }), /expired/);
  assert.equal(P.calcDiscount({ type: 'free_shipping' }, lines, 250).shippingDiscount, 250);
  assert.throws(() => P.calcDiscount({ type: 'fixed', value: 100, productIds: ['other'] }, lines, 0), /does not apply/);
});
