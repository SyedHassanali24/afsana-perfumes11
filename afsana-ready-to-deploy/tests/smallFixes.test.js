const test = require('node:test');
const assert = require('node:assert/strict');
const { samePhone } = require('../services/phone');
const D = require('../services/dashboardRules');

test('tracking: a phone typed in any Pakistani style matches the one saved at checkout; blanks and short numbers never match', () => {
  for (const [a, b] of [['0300 1234567', '03001234567'], ['03001234567', '+92 300 1234567'], ['+923001234567', '0300-123-4567'], ['923001234567', '03001234567'], ['(0300) 1234567', '0300 1234567']]) assert.equal(samePhone(a, b), true, `${a} = ${b}`);
  for (const [a, b] of [['03001234567', '03001234568'], ['03001234567', '03111234567'], ['', ''], [undefined, undefined], ['12345', '12345'], ['03001234567', '']]) assert.equal(samePhone(a, b), false, `${a} != ${b}`);
});

test('dashboard: low-stock filter always has the threshold test and leaves out deleted products / sizes', () => {
  const plain = D.lowStockFilter();
  assert.ok(plain.$expr); assert.equal('productId' in plain, false); assert.equal('variantId' in plain, false);
  const f = D.lowStockFilter(['p1', 'p2'], ['v1']);
  assert.deepEqual(f.productId, { $nin: ['p1', 'p2'] }); assert.deepEqual(f.variantId, { $nin: ['v1'] }); assert.ok(f.$expr);
});
