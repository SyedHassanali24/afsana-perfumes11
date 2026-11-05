const test = require('node:test');
const assert = require('node:assert/strict');
const { SECURITY_HEADERS, normalizeOrigin, isAllowedOrigin, corsHeaders } = require('../cloudflare/security');

test('security: only exact configured origins receive credentialed CORS', () => {
  const workerUrl = 'https://afsana-perfumes11.eastwala12.workers.dev/';
  assert.equal(isAllowedOrigin('https://afsana-perfumes11.eastwala12.workers.dev', {}, workerUrl), true);
  assert.equal(isAllowedOrigin('https://attacker.workers.dev', {}, workerUrl), false);
  assert.equal(isAllowedOrigin('null', {}, workerUrl), false);
  assert.equal(isAllowedOrigin('https://shop.afsana.com', {
    ALLOWED_ORIGINS: 'https://shop.afsana.com, https://www.afsana.com'
  }, workerUrl), true);
});

test('security: malformed origins and paths are not normalized into trusted origins', () => {
  assert.equal(normalizeOrigin('https://evil.example/path'), null);
  assert.equal(normalizeOrigin('javascript:alert(1)'), null);
  assert.equal(normalizeOrigin('null'), null);
  assert.equal(normalizeOrigin('https://shop.afsana.com'), 'https://shop.afsana.com');
});

test('security: rejected origins receive no Access-Control-Allow-Origin or credentials', () => {
  const headers = corsHeaders('https://attacker.workers.dev', {}, 'https://afsana-perfumes11.eastwala12.workers.dev');
  assert.deepEqual(headers, { Vary: 'Origin' });
  const allowed = corsHeaders('https://shop.afsana.com', {
    ALLOWED_ORIGINS: 'https://shop.afsana.com'
  }, 'https://afsana-perfumes11.eastwala12.workers.dev');
  assert.equal(allowed['Access-Control-Allow-Origin'], 'https://shop.afsana.com');
  assert.equal(allowed['Access-Control-Allow-Credentials'], 'true');
  assert.match(allowed['Access-Control-Allow-Headers'], /X-Requested-With/);
});

test('security: standard response hardening headers are present', () => {
  assert.equal(SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
  assert.equal(SECURITY_HEADERS['X-Frame-Options'], 'DENY');
  assert.ok(SECURITY_HEADERS['Strict-Transport-Security'].includes('max-age='));
});
