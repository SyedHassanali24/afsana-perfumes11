const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../services/cartRules');
const { normalizeDefaults } = require('../services/addressRules');

test('cart: merging adds quantities, caps at 20 per line and 30 lines, ignores junk', () => {
  const m = R.mergeItems([{ variantId: 'a', quantity: 2 }, { variantId: 'b', quantity: 1 }], [{ variantId: 'a', quantity: 3 }, { variantId: 'c', quantity: 99 }, null, { quantity: 4 }]);
  assert.deepEqual(m, [{ variantId: 'a', quantity: 5 }, { variantId: 'b', quantity: 1 }, { variantId: 'c', quantity: 20 }]);
  assert.equal(R.mergeItems([{ variantId: 'a', quantity: 15 }], [{ variantId: 'a', quantity: 15 }])[0].quantity, 20);
  const many = Array.from({ length: 40 }, (_, i) => ({ variantId: `v${i}`, quantity: 1 }));
  assert.equal(R.mergeItems(many).length, 30);
  assert.deepEqual(R.mergeItems(undefined, []), []);
});

test('cart: quantity is clamped to 1..20 and bad values become 1', () => {
  assert.equal(R.clampQty(0), 1); assert.equal(R.clampQty(-5), 1); assert.equal(R.clampQty('abc'), 1);
  assert.equal(R.clampQty(2.9), 2); assert.equal(R.clampQty(500), 20);
});

test('cart: line status covers missing, sold out, limited and ok', () => {
  assert.equal(R.lineStatus({ found: false, available: 9, quantity: 1 }), 'unavailable');
  assert.equal(R.lineStatus({ found: true, available: 0, quantity: 1 }), 'out_of_stock');
  assert.equal(R.lineStatus({ found: true, available: 2, quantity: 3 }), 'limited');
  assert.equal(R.lineStatus({ found: true, available: 3, quantity: 3 }), 'ok');
});

test('cart: summary prices only buyable lines, adds shipping, free above threshold, blocks checkout on problems', () => {
  const ok = { status: 'ok', lineTotal: 3000, quantity: 2 };
  const s = R.summarize([ok]);
  assert.equal(s.subtotal, 3000); assert.equal(s.shipping, 250); assert.equal(s.total, 3250);
  assert.equal(s.freeShippingRemaining, 2000); assert.equal(s.canCheckout, true);

  const big = R.summarize([{ status: 'ok', lineTotal: 5000, quantity: 1 }]);
  assert.equal(big.shipping, 0); assert.equal(big.freeShippingRemaining, 0);

  const mixed = R.summarize([ok, { status: 'out_of_stock', lineTotal: 0, quantity: 1 }, { status: 'unavailable', lineTotal: 0, quantity: 1 }]);
  assert.equal(mixed.subtotal, 3000); assert.equal(mixed.canCheckout, false); assert.equal(mixed.itemCount, 4);

  assert.equal(R.summarize([{ status: 'limited', lineTotal: 1000, quantity: 5 }]).canCheckout, false);
  const empty = R.summarize([]);
  assert.equal(empty.total, 0); assert.equal(empty.shipping, 0); assert.equal(empty.canCheckout, false);
});

test('cart: discounts and free-shipping coupons reduce the total but never below zero', () => {
  const l = [{ status: 'ok', lineTotal: 3000, quantity: 1 }];
  assert.equal(R.summarize(l, undefined, { discount: 500 }).total, 2750);
  assert.equal(R.summarize(l, undefined, { shippingDiscount: 250 }).total, 3000);
  assert.equal(R.summarize(l, undefined, { discount: 99999 }).total, 250);
  assert.equal(R.summarize(l, { flatRate: 300, freeAbove: 1000 }).shipping, 0);
});

test('addresses: exactly one default is kept', () => {
  const mk = (id, d) => ({ _id: id, isDefault: d });
  let l = normalizeDefaults([mk('1', false), mk('2', false)]);
  assert.deepEqual(l.map((a) => a.isDefault), [true, false]);
  l = normalizeDefaults([mk('1', true), mk('2', false)], '2');
  assert.deepEqual(l.map((a) => a.isDefault), [false, true]);
  l = normalizeDefaults([mk('1', true), mk('2', true)]);
  assert.deepEqual(l.map((a) => a.isDefault), [true, false]);
  assert.deepEqual(normalizeDefaults([]), []);
});
