const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../services/poRules');

test('purchase-order lifecycle is fail-closed', () => {
  assert.equal(R.canTransition('Draft', 'Ordered'), true);
  assert.equal(R.canTransition('Draft', 'Cancelled'), true);
  assert.equal(R.canTransition('Ordered', 'Partially Received'), true);
  assert.equal(R.canTransition('Ordered', 'Received'), true);
  assert.equal(R.canTransition('Partially Received', 'Received'), true);
  assert.equal(R.canTransition('Received', 'Cancelled'), false);
  assert.equal(R.canTransition('Cancelled', 'Ordered'), false);
});

test('remaining quantity never goes below zero', () => {
  assert.equal(R.remainingQty({ quantity: 10, receivedQuantity: 4 }), 6);
  assert.equal(R.remainingQty({ quantity: 10, receivedQuantity: 10 }), 0);
  assert.equal(R.remainingQty({ quantity: 10, receivedQuantity: 12 }), 0);
});

test('receiving derives partial and complete states correctly', () => {
  assert.equal(R.poStatusAfterReceive([{ quantity: 10, receivedQuantity: 4 }]), 'Partially Received');
  assert.equal(R.poStatusAfterReceive([{ quantity: 10, receivedQuantity: 10 }]), 'Received');
  assert.equal(R.poStatusAfterReceive([
    { quantity: 10, receivedQuantity: 10 },
    { quantity: 5, receivedQuantity: 2 },
  ]), 'Partially Received');
});

test('purchase-order total is calculated from ordered quantities and unit cost', () => {
  assert.equal(R.poTotal([
    { quantity: 3, costPerUnit: 100 },
    { quantity: 2, costPerUnit: 250 },
  ]), 800);
});
