const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../services/orderRules');

test('customers may cancel only New orders', () => {
  assert.equal(R.canCustomerCancel('New'), true);
  for (const status of ['Confirmed', 'Processing', 'Packed', 'Shipped', 'Out For Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded', 'Return Requested']) {
    assert.equal(R.canCustomerCancel(status), false, `${status} must not be customer-cancellable`);
  }
});

test('cancelling a New order releases its reservation rather than restocking committed stock', () => {
  assert.equal(R.stockEffect('Cancelled', false), 'release');
  assert.equal(R.stockEffect('Cancelled', true), 'restock');
});
