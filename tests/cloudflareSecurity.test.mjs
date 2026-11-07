import test from 'node:test';
import assert from 'node:assert/strict';
import { corsHeaders, securityHeaders, isValidNewsletterEmail, newsletterRateLimitExceeded } from '../cloudflare/security.js';

test('CORS allows the production storefront origin', () => {
  assert.equal(corsHeaders('https://afsana-perfumes11.eastwala12.workers.dev')['Access-Control-Allow-Origin'], 'https://afsana-perfumes11.eastwala12.workers.dev');
});

test('CORS allows the same-origin Worker preview without wildcarding other Workers', () => {
  const preview = 'https://branch-preview.example.workers.dev';
  assert.equal(corsHeaders(preview, {}, preview)['Access-Control-Allow-Origin'], preview);
  assert.equal(corsHeaders('https://unrelated.example.workers.dev', {}, preview)['Access-Control-Allow-Origin'], 'https://afsana-perfumes11.eastwala12.workers.dev');
});

test('CORS supports exact custom origins and rejects wildcard entries', () => {
  const env = { AFSANA_ALLOWED_ORIGINS: 'https://shop.example.com, https://admin.example.com, https://*.bad.example' };
  assert.equal(corsHeaders('https://shop.example.com', env)['Access-Control-Allow-Origin'], 'https://shop.example.com');
  assert.equal(corsHeaders('https://evil.example.com', env)['Access-Control-Allow-Origin'], 'https://afsana-perfumes11.eastwala12.workers.dev');
});

test('security headers are present and do not disable payment permissions', () => {
  const headers = securityHeaders();
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['Strict-Transport-Security'], 'max-age=31536000');
  assert.equal(headers['Permissions-Policy'].includes('payment=()'), false);
});

test('newsletter email validation rejects malformed or oversized values', () => {
  assert.equal(isValidNewsletterEmail('hello@example.com'), true);
  assert.equal(isValidNewsletterEmail('bad-email'), false);
  assert.equal(isValidNewsletterEmail('a'.repeat(250) + '@example.com'), false);
});

test('newsletter rate limit triggers only after five allowed requests', () => {
  assert.equal(newsletterRateLimitExceeded({ count: 5 }), false);
  assert.equal(newsletterRateLimitExceeded({ count: 6 }), true);
  assert.equal(newsletterRateLimitExceeded(null), false);
});
