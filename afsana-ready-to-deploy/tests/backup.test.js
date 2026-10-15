const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../services/backupRules');

test('backup: login accounts, sessions, staff, permissions, analytics and picture bytes are never exported', () => {
  for (const n of ['User', 'Session', 'Staff', 'Permission', 'PermissionHistory', 'AnalyticsEvent', 'Media']) assert.equal(R.isBackupModel(n, { modelName: n }), false, n);
  for (const n of ['Order', 'Product', 'Customer', 'Counter', 'Coupon', 'Banner', 'Setting']) assert.equal(R.isBackupModel(n, { modelName: n }), true, n);
  assert.equal(R.isBackupModel('nextNumber', () => 1), false, 'helper functions are not models');
});

test('backup: clean() removes secrets at any depth and keeps normal data', () => {
  const out = R.clean({ name: 'Ayesha', passwordHash: 'x', nested: { resetTokenHash: 'y', ok: 1, list: [{ apiSecret: 'z', keep: 2 }] }, tokenHash: 't', at: new Date('2026-10-01') });
  assert.deepEqual(Object.keys(out).sort(), ['at', 'name', 'nested']);
  assert.deepEqual(out.nested, { ok: 1, list: [{ keep: 2 }] });
  assert.ok(out.at instanceof Date);
});

test('backup: page size is bounded', () => {
  assert.equal(R.pageSize(undefined), R.PAGE_DEFAULT);
  assert.equal(R.pageSize(5000), R.PAGE_MAX);
  assert.equal(R.pageSize(0), 1);
  assert.equal(R.pageSize('abc'), R.PAGE_DEFAULT);
});

test('backup: file name has the date', () => {
  assert.equal(R.backupFileName(new Date('2026-10-15T10:00:00Z')), 'afsana-backup-2026-10-15.json');
});
