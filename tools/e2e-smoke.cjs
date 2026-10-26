// Live smoke test against a RUNNING server (npx netlify dev). Read-only: it never creates or changes data.
// NOT run by Claude (no real DB there) - you run it on your PC.
//   Terminal 1:  npm run api            (wait until it says "Server now ready")
//   Terminal 2:  npm run e2e            (or:  BASE=http://localhost:8888 node tools/e2e-smoke.cjs)
// Optional admin checks:  E2E_EMAIL=you@x.com E2E_PASSWORD=secret npm run e2e   (use the Owner account)
const BASE = (process.env.BASE || 'http://localhost:8888').replace(/\/$/, '');
const api = (p) => `${BASE}/api${p}`;
let pass = 0; let fail = 0; const failed = [];
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  PASS  ${name}`); } else { fail++; failed.push(name); console.log(`  FAIL  ${name} ${extra}`); } };

async function call(method, p, { body, cookie } = {}) {
  const headers = { 'content-type': 'application/json', 'x-requested-with': 'afsana' };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(api(p), { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  let data = null; try { data = await res.json(); } catch { /* not json */ }
  return { status: res.status, data, setCookie: res.headers.getSetCookie ? res.headers.getSetCookie() : [] };
}

(async () => {
  console.log(`Smoke test on ${BASE}\n`);
  try { await fetch(BASE); } catch { console.log(`Server not reachable at ${BASE}. Start it first: npm run api`); process.exit(2); }

  console.log('1) Public shop');
  const prods = await call('GET', '/products');
  ok('GET /products answers 200', prods.status === 200, `(got ${prods.status})`);
  const quote0 = await call('POST', '/cart/quote', { body: { items: [], city: 'Karachi' } });
  ok('POST /cart/quote (empty cart) answers 200', quote0.status === 200, `(got ${quote0.status})`);

  console.log('2) Staff routes must refuse a stranger (401/403)');
  for (const [m, p] of [
    ['GET', '/customers/admin'], ['GET', '/finance/admin/summary'], ['GET', '/reviews/admin'], ['GET', '/shipping/admin'],
    ['GET', '/notifications/admin'], ['GET', '/orders/admin/list'], ['GET', '/staff'], ['GET', '/analytics/dashboard'],
  ]) {
    const r = await call(m, p);
    ok(`${m} ${p} refused without login`, r.status === 401 || r.status === 403, `(got ${r.status})`);
  }
  const post = await fetch(api('/finance/admin/expenses'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  ok('POST without the x-requested-with header is refused', post.status === 403 || post.status === 401, `(got ${post.status})`);

  console.log('3) Customer-only routes refuse a stranger');
  const w = await call('GET', '/wishlist');
  ok('GET /wishlist refused without login', w.status === 401 || w.status === 403, `(got ${w.status})`);

  const email = process.env.E2E_EMAIL; const password = process.env.E2E_PASSWORD;
  if (email && password) {
    console.log('4) Owner login + admin screens (read-only)');
    const login = await call('POST', '/auth/login', { body: { email, password } });
    ok('login works', login.status === 200, `(got ${login.status})`);
    const cookie = (login.setCookie || []).map((c) => c.split(';')[0]).join('; ');
    if (login.status === 200 && cookie) {
      for (const p of ['/customers/admin', '/finance/admin/summary?period=month', '/reviews/admin', '/shipping/admin', '/notifications/admin', '/orders/admin/list', '/analytics/dashboard']) {
        const r = await call('GET', p, { cookie });
        ok(`GET ${p} answers 200 for Owner`, r.status === 200, `(got ${r.status} ${r.data && r.data.error ? r.data.error.message || '' : ''})`);
      }
    }
  } else {
    console.log('4) Skipped admin checks (set E2E_EMAIL and E2E_PASSWORD to run them)');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) console.log('Failed:\n - ' + failed.join('\n - '));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('Smoke test crashed:', e.message); process.exit(2); });
