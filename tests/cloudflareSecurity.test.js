const test = require('node:test');
const assert = require('node:assert/strict');
const securityPromise = import('../cloudflare/security.js');

test('security: only exact configured origins receive credentialed CORS', async () => {
  const { isAllowedOrigin } = await securityPromise;
  const workerUrl = 'https://afsana-perfumes11.eastwala12.workers.dev/';
  assert.equal(isAllowedOrigin('https://afsana-perfumes11.eastwala12.workers.dev', {}, workerUrl), true);
  assert.equal(isAllowedOrigin('https://attacker.workers.dev', {}, workerUrl), false);
  assert.equal(isAllowedOrigin('null', {}, workerUrl), false);
  assert.equal(isAllowedOrigin('https://shop.afsana.com', {
    ALLOWED_ORIGINS: 'https://shop.afsana.com, https://www.afsana.com'
  }, workerUrl), true);
});

test('security: malformed origins and paths are not normalized into trusted origins', async () => {
  const { normalizeOrigin } = await securityPromise;
  assert.equal(normalizeOrigin('https://evil.example/path'), null);
  assert.equal(normalizeOrigin('javascript:alert(1)'), null);
  assert.equal(normalizeOrigin('null'), null);
  assert.equal(normalizeOrigin('https://shop.afsana.com'), 'https://shop.afsana.com');
});

test('security: rejected origins receive no Access-Control-Allow-Origin or credentials', async () => {
  const { corsHeaders } = await securityPromise;
  const headers = corsHeaders('https://attacker.workers.dev', {}, 'https://afsana-perfumes11.eastwala12.workers.dev');
  assert.deepEqual(headers, { Vary: 'Origin' });
  const allowed = corsHeaders('https://shop.afsana.com', {
    ALLOWED_ORIGINS: 'https://shop.afsana.com'
  }, 'https://afsana-perfumes11.eastwala12.workers.dev');
  assert.equal(allowed['Access-Control-Allow-Origin'], 'https://shop.afsana.com');
  assert.equal(allowed['Access-Control-Allow-Credentials'], 'true');
  assert.match(allowed['Access-Control-Allow-Headers'], /X-Requested-With/);
});

test('security: standard response hardening headers are present', async () => {
  const { SECURITY_HEADERS } = await securityPromise;
  assert.equal(SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
  assert.equal(SECURITY_HEADERS['X-Frame-Options'], 'DENY');
  assert.ok(SECURITY_HEADERS['Strict-Transport-Security'].includes('max-age='));
});
