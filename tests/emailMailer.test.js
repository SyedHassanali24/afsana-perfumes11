const test = require('node:test');
const assert = require('node:assert/strict');
const { sendPasswordReset } = require('../services/mailer');
const { emailProviderReadiness } = require('../services/emailReadiness');
const { E, toResponse } = require('../middleware/errors');

test('customer password reset: sends a real Gmail OAuth message with the reset URL', async () => {
  const env = {
    NODE_ENV: 'production',
    GMAIL_CLIENT_ID: 'test-client-id',
    GMAIL_CLIENT_SECRET: 'test-client-secret',
    GMAIL_REFRESH_TOKEN: 'test-refresh-token',
    OWNER_EMAIL: 'owner@afsana.test',
  };
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url === 'https://oauth2.googleapis.com/token') {
      return { ok: true, json: async () => ({ access_token: 'temporary-access-token' }) };
    }
    if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') {
      return { ok: true, json: async () => ({ id: 'gmail-message-id' }) };
    }
    throw new Error('Unexpected provider URL: ' + url);
  };

  const result = await sendPasswordReset(
    { to: 'customer@example.com', url: 'https://afsana-perfumes11.eastwala12.workers.dev/reset-password?token=single-use-token' },
    { env, fetchImpl }
  );

  assert.deepEqual(result, { sent: true, provider: 'gmail' });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer temporary-access-token');
  const raw = JSON.parse(calls[1].options.body).raw;
  const mime = Buffer.from(raw, 'base64url').toString('utf8');
  assert.match(mime, /To: customer@example\.com/);
  assert.match(mime, /From: AFSANA Perfumes <owner@afsana\.test>/);
  assert.match(mime, /single-use-token/);
  assert.match(mime, /expires in 30 minutes/i);
});

test('customer password reset: rejects an unsafe non-HTTPS reset URL', async () => {
  await assert.rejects(
    () => sendPasswordReset(
      { to: 'customer@example.com', url: 'http://attacker.example/reset?token=x' },
      {
        env: {
          NODE_ENV: 'production',
          GMAIL_CLIENT_ID: 'client',
          GMAIL_CLIENT_SECRET: 'secret',
          GMAIL_REFRESH_TOKEN: 'refresh',
        },
        fetchImpl: async () => { throw new Error('Provider must not be called for an unsafe URL.'); }
      }
    ),
    (error) => error.status === 503 && error.code === 'SERVICE_UNAVAILABLE'
  );
});

test('customer password reset: returns a safe 503 when no production provider is configured', async () => {
  await assert.rejects(
    () => sendPasswordReset(
      { to: 'customer@example.com', url: 'https://afsana.example/reset?token=x' },
      { env: { NODE_ENV: 'production' }, fetchImpl: async () => { throw new Error('No provider should be called.'); } }
    ),
    (error) => {
      const response = toResponse(error);
      return response.status === 503 && response.body.error.code === 'SERVICE_UNAVAILABLE';
    }
  );
});

test('customer password reset: does not send a message in local development', async () => {
  let called = false;
  const result = await sendPasswordReset(
    { to: 'customer@example.com', url: 'http://localhost:8888/reset-password?token=local' },
    { env: { NODE_ENV: 'development' }, fetchImpl: async () => { called = true; } }
  );
  assert.equal(result.development, true);
  assert.equal(called, false);
});

test('email readiness: EmailJS OTP alone does not claim customer reset links are configured', () => {
  const result = emailProviderReadiness({
    EMAILJS_SERVICE_ID: 'service',
    EMAILJS_TEMPLATE_ID: 'otp-template',
    EMAILJS_PUBLIC_KEY: 'public',
    EMAILJS_PRIVATE_KEY: 'private',
  });
  assert.equal(result.adminOtp, true);
  assert.equal(result.customerPasswordReset, false);
});

test('email readiness: Gmail OAuth and Resend each cover OTP and customer reset email', () => {
  const gmail = emailProviderReadiness({
    GMAIL_CLIENT_ID: 'client',
    GMAIL_CLIENT_SECRET: 'secret',
    GMAIL_REFRESH_TOKEN: 'refresh',
  });
  assert.deepEqual([gmail.adminOtp, gmail.customerPasswordReset], [true, true]);

  const resend = emailProviderReadiness({ RESEND_API_KEY: 'key', EMAIL_FROM: 'AFSANA <mail@example.com>' });
  assert.deepEqual([resend.adminOtp, resend.customerPasswordReset], [true, true]);
});

test('email readiness: a dedicated EmailJS reset template covers customer password resets', () => {
  const result = emailProviderReadiness({
    EMAILJS_SERVICE_ID: 'service',
    EMAILJS_TEMPLATE_ID: 'otp-template',
    EMAILJS_PASSWORD_RESET_TEMPLATE_ID: 'reset-template',
    EMAILJS_PUBLIC_KEY: 'public',
    EMAILJS_PRIVATE_KEY: 'private',
  });
  assert.equal(result.customerPasswordReset, true);
});

test('email normalization: trims and lowercases customer email identifiers', () => {
  const { normalizeEmail, isEmailIdentifier } = require('../services/emailRules');
  assert.equal(normalizeEmail('  Customer.Name+Shop@Example.COM  '), 'customer.name+shop@example.com');
  assert.equal(normalizeEmail('   '), undefined);
  assert.equal(isEmailIdentifier('customer@example.com'), true);
  assert.equal(isEmailIdentifier('03001234567'), false);
});
