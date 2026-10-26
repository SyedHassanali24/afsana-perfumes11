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

test('payment transitions are fail-closed', () => {
  assert.deepEqual(R.PAYMENT_TRANSITIONS.Pending, ['Paid', 'Failed']);
  assert.deepEqual(R.PAYMENT_TRANSITIONS.Failed, ['Pending', 'Paid']);
  assert.equal(R.canSetPayment('Pending', 'Paid'), true);
  assert.equal(R.canSetPayment('Failed', 'Paid'), true);
  assert.equal(R.canSetPayment('Paid', 'Pending'), false);
  assert.equal(R.canSetPayment('Paid', 'Failed'), false);
  assert.equal(R.canSetPayment('Refunded', 'Paid'), false);
  assert.equal(R.canSetPayment('Partially Refunded', 'Pending'), false);
  assert.equal(R.canSetPayment('Pending', 'Pending'), true);
});

test('stock effects are fail-closed for non-stock lifecycle transitions', () => {
  for (const status of ['Confirmed', 'Processing', 'Packed', 'Shipped', 'Out For Delivery', 'Delivered', 'Return Requested', 'Refunded']) {
    assert.equal(R.stockEffect(status, false), null, `${status} must not change stock`);
    assert.equal(R.stockEffect(status, true), null, `${status} must not change stock`);
  }
});

test('Returned only restocks already committed stock', () => {
  assert.equal(R.stockEffect('Returned', true), 'restock_return');
  assert.equal(R.stockEffect('Returned', false), null);
});

test('terminal states cannot accidentally trigger a second stock effect', () => {
  assert.equal(R.stockEffect('Cancelled', true), 'restock');
  assert.equal(R.stockEffect('Cancelled', false), 'release');
  assert.equal(R.stockEffect('Returned', true), 'restock_return');
});
