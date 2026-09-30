const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../database/constants');
const { resolve } = require('../middleware/permissions');
const R = require('../services/accessRules');
const GROUPS = require('../services/permissionGroups');
const { normalizePhone } = require('../services/phone');

const g = (module, actions, kind = 'all', values = []) => ({ module, actions, scope: { kind, values } });
const perms = (grants, extra = {}) => resolve({ role: { grants, deniedFields: [], ...extra }, staff: { overrides: [] } });

test('level hierarchy: only strictly-lower levels; Owner may manage any', () => {
  assert.equal(R.canManageLevel({ level: 70 }, 50), true);
  assert.equal(R.canManageLevel({ level: 70 }, 70), false);
  assert.equal(R.canManageLevel({ level: 70 }, 90), false);
  assert.equal(R.canManageLevel({ level: 100, isUnrestricted: true }, 99), true);
  assert.equal(R.canManageLevel(null, 1), false);
});

test('escalation guard: you cannot hand out access you do not hold', () => {
  const me = perms([g('products', ['view', 'edit']), g('orders', ['view'], 'createdByMe')]);
  assert.equal(R.holdsGrant(me, g('products', ['view'])), true);
  assert.equal(R.holdsGrant(me, g('products', ['view', 'delete'])), false);
  assert.equal(R.holdsGrant(me, g('staff', ['view'])), false);
  assert.equal(R.holdsGrant(me, g('orders', ['view'], 'all')), false, 'cannot widen scope beyond your own');
  assert.equal(R.holdsGrant(me, g('orders', ['view'], 'createdByMe')), true);
  assert.equal(R.holdsGrant(resolve({ role: { isUnrestricted: true } }), g('staff', ['delete'])), true);
  assert.equal(R.missingGrants(me, [g('products', ['view']), g('roles', ['edit'])]).length, 1);
});

test('editing a role: keeping existing access is not an escalation, adding new access is', () => {
  const old = [g('products', ['view', 'edit', 'delete']), g('orders', ['view'])];
  const next = [g('products', ['view', 'edit']), g('orders', ['view', 'changeStatus']), g('reviews', ['view'])];
  const added = R.addedGrants(old, next);
  assert.deepEqual(added.map((x) => x.module).sort(), ['orders', 'reviews']);
  assert.equal(R.addedGrants(old, old).length, 0);
});

test('temporary access window rules', () => {
  const now = new Date('2026-09-29T10:00:00Z');
  const h = (n) => new Date(now.getTime() + n * 3600000);
  assert.match(R.validateWindow({ effect: 'allow' }, now), /expiry/i);
  assert.match(R.validateWindow({ effect: 'allow', expiresAt: h(-1) }, now), /future/);
  assert.match(R.validateWindow({ effect: 'allow', startsAt: h(5), expiresAt: h(2) }, now), /after the start/);
  assert.match(R.validateWindow({ effect: 'allow', expiresAt: h(24 * 91) }, now), /at most/);
  assert.equal(R.validateWindow({ effect: 'allow', expiresAt: h(24) }, now), null);
  assert.equal(R.validateWindow({ effect: 'deny' }, now), null, 'deny may be permanent');
});

test('temporary allow override grants access and expires automatically', () => {
  const role = { grants: [g('products', ['view'])], deniedFields: [] };
  const now = new Date('2026-09-29T10:00:00Z');
  const ov = { effect: 'allow', grant: g('inventory', ['manageStock']), expiresAt: new Date(now.getTime() + 3600000) };
  assert.ok(resolve({ role, staff: { overrides: [ov] }, now }).can('inventory', 'manageStock'));
  const later = new Date(now.getTime() + 2 * 3600000);
  assert.equal(resolve({ role, staff: { overrides: [ov] }, now: later }).can('inventory', 'manageStock'), null);
  const deny = { effect: 'deny', grant: g('products', ['view']) };
  assert.equal(resolve({ role, staff: { overrides: [deny] }, now }).can('products', 'view'), null);
});

test('generated passwords: length, alphabet, mix, uniqueness', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i += 1) {
    const p = R.generatePassword();
    assert.equal(p.length, 14);
    assert.match(p, /^[A-Za-z0-9]+$/);
    assert.match(p, /[A-Za-z]/); assert.match(p, /\d/);
    assert.doesNotMatch(p, /[0OIl1]/);
    seen.add(p);
  }
  assert.equal(seen.size, 200);
});

test('role key slug', () => {
  assert.equal(R.slugKey('Order Packer (Night)'), 'order_packer_night');
  assert.equal(R.slugKey('  ---  '), '');
});

test('permission groups list every module exactly once', () => {
  const all = GROUPS.flatMap(([, m]) => m);
  assert.equal(new Set(all).size, all.length, 'duplicate module in groups');
  assert.deepEqual([...all].sort(), [...C.MODULES].sort());
});

test('high-risk keys are all real module.action pairs', () => {
  for (const k of C.HIGH_RISK) {
    const [m, a] = k.split('.');
    assert.ok(C.MODULES.includes(m) && C.ACTIONS.includes(a), `bad key ${k}`);
  }
});

test('phone normalisation', () => {
  assert.equal(normalizePhone('0300-1234567'), '+923001234567');
  assert.equal(normalizePhone('92 300 1234567'), '+923001234567');
  assert.equal(normalizePhone('+92 300 1234567'), '+923001234567');
  assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958');
});
