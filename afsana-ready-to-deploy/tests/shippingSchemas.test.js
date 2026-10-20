const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../validation/schemas');
const ok = (schema, v) => schema.safeParse(v);

test('shipping schemas: courier tracking link must be https and contain {trackingNumber}', () => {
  assert.equal(ok(S.courierBody, { name: 'TCS', trackingUrlTemplate: 'http://bad/{trackingNumber}' }).success, false);
  assert.equal(ok(S.courierBody, { name: 'TCS', trackingUrlTemplate: 'https://track.tcs.pk/' }).success, false, 'no placeholder');
  assert.equal(ok(S.courierBody, { name: 'TCS', trackingUrlTemplate: 'https://track.tcs.pk/{trackingNumber}' }).success, true);
  assert.equal(ok(S.courierBody, { name: 'Leopards' }).success, true, 'link is optional');
  assert.equal(ok(S.courierPatch, { isActive: false }).success, true);
  assert.equal(ok(S.courierBody, { name: 'T' }).success, false, 'name too short');
});

test('shipping schemas: zone needs at least one city; numbers may arrive as text; empty free-above = never free', () => {
  const base = { zoneName: 'Karachi', cities: ['Karachi'], method: 'Standard', baseRate: 150, freeAbove: 3000, estDays: '1-2 days' };
  assert.equal(ok(S.shippingRateBody, base).success, true);
  assert.equal(ok(S.shippingRateBody, { zoneName: 'X', cities: [], baseRate: 1 }).success, false, 'empty city list refused');
  assert.equal(ok(S.shippingRateBody, { ...base, baseRate: -1 }).success, false);
  const r = ok(S.shippingRateBody, { zoneName: 'Punjab', cities: ['Lahore'], baseRate: '300', freeAbove: '' });
  assert.equal(r.success, true); assert.equal(r.data.baseRate, 300); assert.equal(r.data.method, 'Standard', 'method defaults on create');
  assert.equal(ok(S.shippingRateBody, { ...base, freeAbove: null }).data.freeAbove, null);
  const p = ok(S.shippingRatePatch, { isActive: false });
  assert.equal(p.success, true); assert.deepEqual(Object.keys(p.data), ['isActive'], 'a patch never fills in defaults');
});

test('shipping schemas: shipment status must be known; courier can be cleared with an empty string', () => {
  const id = 'a'.repeat(24);
  assert.equal(ok(S.shipmentBody, { courierId: id, trackingNumber: 'TCS123', status: 'Picked Up', note: 'ok' }).success, true);
  assert.equal(ok(S.shipmentBody, { status: 'Teleported' }).success, false);
  assert.equal(ok(S.shipmentPatch, { courierId: '' }).success, true);
  assert.equal(ok(S.shipmentBody, { courierId: 'nope' }).success, false);
});

test('shipping schemas: cart quote accepts an optional city', () => {
  const items = [{ variantId: 'b'.repeat(24), quantity: 1 }];
  assert.equal(ok(S.quoteBody, { items, city: 'Multan' }).data.city, 'Multan');
  assert.equal(ok(S.quoteBody, { items }).success, true);
});

test('customer schemas: group must be one of the four; patch needs notes or group', () => {
  assert.equal(S.customerPatch.safeParse({ segment: 'Gold' }).success, false);
  assert.equal(S.customerPatch.safeParse({ segment: 'Repeat', notes: 'Prefers oud' }).success, true);
  assert.equal(S.customerPatch.safeParse({}).success, false, 'empty patch refused');
  assert.equal(S.customerPatch.safeParse({ notes: '' }).success, true, 'notes can be cleared');
  assert.deepEqual(Object.keys(S.customerPatch.parse({ notes: 'x', name: 'Hack' })), ['notes'], 'other fields are dropped');
  const q = S.customerQuery.parse({ q: ' ayesha ', segment: 'VIP', page: '2' });
  assert.deepEqual([q.q, q.segment, q.page, q.limit], ['ayesha', 'VIP', 2, 20]);
  assert.equal(S.customerQuery.safeParse({ segment: 'Gold' }).success, false);
});
