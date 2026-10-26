// Backup rules (pure, tested in tests/backup.test.js): what is exported, and what is NEVER exported.
// Never exported: login accounts (passwords), sessions, staff records, the permission list (rebuilt by db:setup),
// analytics events (rebuildable, can be huge) and picture bytes (listed separately, downloaded one by one).
const SKIP = new Set(['User', 'Session', 'Staff', 'Permission', 'PermissionHistory', 'AnalyticsEvent', 'Media', 'nextNumber']);
const SENSITIVE_KEY = /password|tokenhash|resettoken|secret|authorization/i;
const PAGE_DEFAULT = 100;
const PAGE_MAX = 200;

// model names that go into a backup, in a restore-friendly order (counters last so numbers keep counting)
const isBackupModel = (name, model) => Boolean(model && model.modelName) && !SKIP.has(name);

// Deep copy without sensitive keys. ObjectId/Date become strings through JSON anyway.
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object' && !(value instanceof Date) && typeof value.toHexString !== 'function' && !Buffer.isBuffer(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (!SENSITIVE_KEY.test(k)) out[k] = clean(v);
    return out;
  }
  return value;
}
const pageSize = (n) => Math.min(PAGE_MAX, Math.max(1, Number.isFinite(Number(n)) ? Math.floor(Number(n)) : PAGE_DEFAULT));
const backupFileName = (d = new Date()) => `afsana-backup-${d.toISOString().slice(0, 10)}.json`;

module.exports = { SKIP, SENSITIVE_KEY, PAGE_DEFAULT, PAGE_MAX, isBackupModel, clean, pageSize, backupFileName };
