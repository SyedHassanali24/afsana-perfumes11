const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../services/settingsRules');

test('settings: missing values fall back to defaults; unknown keys are dropped', () => {
  const all = R.merge([{ key: 'shipping', value: { flatRate: 300, junk: 1 } }]);
  assert.deepEqual(all.shipping, { flatRate: 300, freeAbove: 5000 });
  assert.equal(all.returns.windowDays, 7);
  assert.equal(all.store.name, 'Afsana Perfumes');
  assert.deepEqual(Object.keys(R.withDefaults('returns', { windowDays: 10, hack: true })), ['windowDays']);
});

test('settings: bank details are public only when switched on AND complete', () => {
  const base = R.merge([]);
  assert.equal(R.publicView(base).bank, null);
  const on = (b) => R.publicView(R.merge([{ key: 'bank', value: b }])).bank;
  assert.equal(on({ enabled: true }), null, 'on but empty');
  assert.equal(on({ enabled: true, accountTitle: 'Afsana', bankName: 'HBL' }), null, 'no account number or IBAN');
  assert.equal(on({ enabled: false, accountTitle: 'Afsana', accountNumber: '123' }), null, 'switched off');
  assert.equal(on({ enabled: true, accountTitle: 'Afsana', iban: 'PK00X' }).iban, 'PK00X');
  assert.equal('enabled' in on({ enabled: true, accountTitle: 'A', accountNumber: '1' }), false);
});

test('settings: validation rejects bad values', () => {
  const S = require('../validation/schemas');
  const bad = (schema, v) => !schema.safeParse(v).success;
  assert.equal(bad(S.settingsBank, { enabled: true, bankName: 'HBL' }), true, 'cannot show empty bank details');
  assert.equal(bad(S.settingsBank, { enabled: true, accountTitle: 'Afsana', accountNumber: '1' }), false);
  assert.equal(bad(S.settingsBank, { enabled: false }), false, 'can be saved switched off and empty');
  assert.equal(bad(S.settingsShipping, { flatRate: -1, freeAbove: 0 }), true);
  assert.equal(bad(S.settingsShipping, { flatRate: 250.5, freeAbove: 0 }), true);
  assert.equal(bad(S.settingsShipping, { flatRate: 250, freeAbove: 0 }), false, '0 = free delivery on everything');
  assert.equal(bad(S.settingsReturns, { windowDays: 0 }), true);
  assert.equal(bad(S.settingsReturns, { windowDays: 91 }), true);
  assert.equal(bad(S.settingsStore, { name: 'A' }), true);
  assert.equal(bad(S.settingsStore, { name: 'Afsana', email: 'nope' }), true);
  assert.equal(bad(S.settingsStore, { name: 'Afsana', email: '' }), false);
});
