// Route/permission audit: loads every netlify/functions/*/index.js (no DB, no network) and checks the route tables.
// Catches: a staff route with no permission, an /admin path left public, a typo in a module/action name, a write route guarded only by "view".
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
const stub = (rel, exp) => { const p = require.resolve(path.join(ROOT, rel)); require.cache[p] = { id: p, filename: p, loaded: true, exports: exp }; };
const deep = () => new Proxy(function () {}, { get: (_, k) => (k === 'then' ? undefined : deep()), apply: () => deep(), construct: () => deep() });

// Third-party packages may be missing in a bare checkout; the audit never calls them.
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  try { return origLoad.call(this, request, ...rest); } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND' && !request.startsWith('.') && !request.startsWith('/')) return deep();
    throw e;
  }
};

stub('database/models/index.js', new Proxy({}, { get: (_, k) => (k === '__esModule' ? undefined : deep()) }));
try { stub('services/tx.js', { withTx: async (f) => f() }); } catch { /* optional */ }
let captured = null;
stub('middleware/withApi.js', { createHandler: (g, routes) => { captured = routes; return () => {}; } });

const { MODULES, ACTIONS } = require('../database/constants');
const FN_DIR = path.join(ROOT, 'netlify/functions');
const dirs = fs.readdirSync(FN_DIR).filter((d) => fs.existsSync(path.join(FN_DIR, d, 'index.js')));
const groups = {};
for (const d of dirs) {
  captured = null;
  try { require(path.join(FN_DIR, d, 'index.js')); } catch (e) { groups[d] = { error: e.message.split('\n')[0] }; continue; }
  groups[d] = { routes: captured };
}

// Staff routes that are intentionally open to ANY signed-in staff member (no module permission).
const STAFF_NO_PERMISSION = new Set([
  'notifications GET /admin', 'notifications POST /admin/read-all', 'notifications POST /admin/:id/read',
  'permissions GET /catalog',   // static labels only
  'media POST /profile',        // signed-in staff may upload their own profile avatar
  'media POST /admin',          // checks "can upload for any content module" inside the handler
]);
// Routes that are intentionally public (login, health, storefront reads).
const label = (g, r) => `${g} ${r.method} ${r.path}`;

test('every function folder loads and exposes a route table', () => {
  const failed = Object.entries(groups).filter(([, v]) => v.error || !Array.isArray(v.routes) || v.routes.length === 0);
  // health / backup helpers may export differently; only report real load errors
  const real = failed.filter(([g]) => !['health'].includes(g));
  assert.deepEqual(real.map(([g, v]) => `${g}: ${v.error || 'no routes'}`), []);
});

test('permission keys are real MODULES x ACTIONS', () => {
  const bad = [];
  for (const [g, v] of Object.entries(groups)) for (const r of v.routes || []) {
    if (!r.permission) continue;
    const [m, a] = r.permission;
    if (!MODULES.includes(m) || !ACTIONS.includes(a)) bad.push(`${label(g, r)} -> ${m}.${a}`);
  }
  assert.deepEqual(bad, []);
});

test('staff routes always carry a permission (except the allow-list)', () => {
  const bad = [];
  for (const [g, v] of Object.entries(groups)) for (const r of v.routes || []) {
    if (r.public || r.audience === 'customer' || r.permission) continue;
    if (STAFF_NO_PERMISSION.has(label(g, r))) continue;
    // auth/account routes act on the signed-in user's own record
    if (g === 'auth' || g === 'account') continue;
    bad.push(label(g, r));
  }
  assert.deepEqual(bad, [], 'these staff routes have no permission - add one or whitelist on purpose');
});

test('paths under /admin are never public and never customer-audience', () => {
  const bad = [];
  for (const [g, v] of Object.entries(groups)) for (const r of v.routes || []) {
    if (String(r.path).startsWith('/admin') && (r.public || r.audience === 'customer')) bad.push(label(g, r));
  }
  assert.deepEqual(bad, []);
});

test('write routes are not guarded by the "view" action alone', () => {
  const bad = [];
  for (const [g, v] of Object.entries(groups)) for (const r of v.routes || []) {
    if (!r.permission || ['GET', 'HEAD'].includes(String(r.method).toUpperCase())) continue;
    if (r.permission[1] === 'view') bad.push(label(g, r));
  }
  // Report only; known read-only POSTs (like quote/preview) must be listed here on purpose.
  const READ_ONLY_POSTS = new Set([]);
  assert.deepEqual(bad.filter((b) => !READ_ONLY_POSTS.has(b)), []);
});

test('public write routes are rate limited or validated', () => {
  const bad = [];
  for (const [g, v] of Object.entries(groups)) for (const r of v.routes || []) {
    if (!r.public || ['GET', 'HEAD'].includes(String(r.method).toUpperCase())) continue;
    if (!r.rateLimit && !r.body) bad.push(label(g, r));
  }
  assert.deepEqual(bad, []);
});

test('no duplicate method+path inside one function', () => {
  const dup = [];
  for (const [g, v] of Object.entries(groups)) {
    const seen = new Set();
    for (const r of v.routes || []) { const k = `${r.method} ${r.path}`; if (seen.has(k)) dup.push(`${g} ${k}`); seen.add(k); }
  }
  assert.deepEqual(dup, []);
});
