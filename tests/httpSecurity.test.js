const test = require('node:test');
const assert = require('node:assert/strict');
const { clientIp } = require('../middleware/http');

test('client IP: Cloudflare edge address wins over spoofable forwarded headers', () => {
  assert.equal(clientIp({
    'cf-connecting-ip': '203.0.113.20',
    'x-nf-client-connection-ip': '198.51.100.77',
    'x-forwarded-for': '192.0.2.55'
  }), '203.0.113.20');
});

test('client IP: Netlify address and fallback are used only when Cloudflare IP is absent', () => {
  assert.equal(clientIp({ 'x-nf-client-connection-ip': '198.51.100.8' }), '198.51.100.8');
  assert.equal(clientIp({ 'x-forwarded-for': '192.0.2.1, 192.0.2.2' }), '192.0.2.1');
  assert.equal(clientIp({}), 'unknown');
});
