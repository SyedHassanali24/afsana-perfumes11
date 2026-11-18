const test = require('node:test');
const assert = require('node:assert/strict');

const { safeReturnTo } = require('../services/customerOAuthService');

test('customer OAuth keeps internal account destinations', () => {
  assert.equal(safeReturnTo('/account/orders/AFS-123?tab=details'), '/account/orders/AFS-123?tab=details');
});

test('customer OAuth rejects external and protocol-relative return URLs', () => {
  assert.equal(safeReturnTo('https://example.com/steal'), '/account');
  assert.equal(safeReturnTo('//example.com/steal'), '/account');
});

test('customer OAuth avoids redirect loops back to login or register', () => {
  assert.equal(safeReturnTo('/login'), '/account');
  assert.equal(safeReturnTo('/register'), '/account');
});

test('customer OAuth rejects backslash-based return paths', () => {
  assert.equal(safeReturnTo('/\\\\example.com'), '/account');
});
