const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyTurnstile, VERIFY_URL } = require('../services/turnstile');

test('Turnstile: accepts a valid single-use token for the exact action and hostname', async () => {
  let sentBody;
  const result = await verifyTurnstile({
    token: 'valid-response-token',
    action: 'checkout',
    hostname: 'afsana-perfumes11.eastwala12.workers.dev',
    remoteIp: '203.0.113.5',
    secret: 'test-secret-value',
    fetchImpl: async (url, options) => {
      assert.equal(url, VERIFY_URL);
      sentBody = new URLSearchParams(options.body);
      return {
        ok: true,
        json: async () => ({
          success: true,
          action: 'checkout',
          hostname: 'afsana-perfumes11.eastwala12.workers.dev'
        })
      };
    }
  });
  assert.equal(result.success, true);
  assert.equal(sentBody.get('secret'), 'test-secret-value');
  assert.equal(sentBody.get('response'), 'valid-response-token');
  assert.equal(sentBody.get('remoteip'), '203.0.113.5');
});

test('Turnstile: rejects missing and oversized response tokens', async () => {
  await assert.rejects(
    () => verifyTurnstile({ action: 'staff_login', hostname: 'afsana-perfumes11.workers.dev', secret: 'x' }),
    (error) => error.status === 403 && error.code === 'TURNSTILE_REQUIRED'
  );
  await assert.rejects(
    () => verifyTurnstile({ token: 'x'.repeat(2049), action: 'staff_login', secret: 'x' }),
    (error) => error.status === 403 && error.code === 'TURNSTILE_REQUIRED'
  );
});

test('Turnstile: rejects an action mismatch', async () => {
  await assert.rejects(
    () => verifyTurnstile({
      token: 'valid-response-token',
      action: 'staff_login',
      hostname: 'afsana-perfumes11.workers.dev',
      secret: 'test-secret',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ success: true, action: 'checkout', hostname: 'afsana-perfumes11.workers.dev' })
      })
    }),
    (error) => error.status === 403 && error.code === 'TURNSTILE_FAILED'
  );
});

test('Turnstile: rejects a hostname mismatch', async () => {
  await assert.rejects(
    () => verifyTurnstile({
      token: 'valid-response-token',
      action: 'staff_login',
      hostname: 'afsana-perfumes11.workers.dev',
      secret: 'test-secret',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ success: true, action: 'staff_login', hostname: 'attacker.example' })
      })
    }),
    (error) => error.status === 403 && error.code === 'TURNSTILE_FAILED'
  );
});

test('Turnstile: fails closed when Siteverify is unavailable', async () => {
  await assert.rejects(
    () => verifyTurnstile({
      token: 'valid-response-token',
      action: 'checkout',
      hostname: 'afsana-perfumes11.workers.dev',
      secret: 'test-secret',
      fetchImpl: async () => { throw new Error('network down'); }
    }),
    (error) => error.status === 503 && error.code === 'TURNSTILE_UNAVAILABLE'
  );
});

test('Turnstile: fails closed if the production secret is missing', async () => {
  const old = process.env.NETLIFY_DEV;
  const oldNodeEnv = process.env.NODE_ENV;
  delete process.env.NETLIFY_DEV;
  process.env.NODE_ENV = 'production';
  try {
    await assert.rejects(
      () => verifyTurnstile({ token: 'valid-response-token', action: 'checkout', hostname: 'afsana-perfumes11.workers.dev', secret: '' }),
      (error) => error.status === 503 && error.code === 'TURNSTILE_NOT_CONFIGURED'
    );
  } finally {
    if (old === undefined) delete process.env.NETLIFY_DEV; else process.env.NETLIFY_DEV = old;
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv;
  }
});

test('Turnstile: reports an invalid secret as a server configuration error', async () => {
  await assert.rejects(
    () => verifyTurnstile({
      token: 'valid-response-token',
      action: 'checkout',
      hostname: 'afsana-perfumes11.workers.dev',
      secret: 'incorrect-secret',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ success: false, 'error-codes': ['invalid-input-secret'] })
      })
    }),
    (error) => error.status === 503 && error.code === 'TURNSTILE_CONFIG_INVALID'
  );
});
