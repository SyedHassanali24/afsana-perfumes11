const test = require('node:test');
const assert = require('node:assert/strict');
const { version, isSessionCurrent } = require('../middleware/sessionVersion');

test('session versions: missing legacy versions remain version zero', () => {
  assert.equal(version(undefined), 0);
  assert.equal(version(null), 0);
  assert.equal(isSessionCurrent({},{authVersion:0}), true);
});

test('session versions: password changes invalidate previous sessions', () => {
  assert.equal(isSessionCurrent({authVersion:2},{authVersion:3}), false);
  assert.equal(isSessionCurrent({authVersion:3},{authVersion:3}), true);
  assert.equal(isSessionCurrent({authVersion:0},{authVersion:1}), false);
});

test('session versions: malformed negative and fractional values do not grant access', () => {
  assert.equal(version(-1), 0);
  assert.equal(version(1.5), 0);
  assert.equal(isSessionCurrent({authVersion:-1},{authVersion:0}), true);
  assert.equal(isSessionCurrent(null,{authVersion:0}), false);
});
