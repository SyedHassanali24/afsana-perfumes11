'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendFreeTransactionalEmail } = require('../services/otpMailer');

const gmailEnv = {
  GMAIL_CLIENT_ID: 'test-client-id',
  GMAIL_CLIENT_SECRET: 'test-client-secret',
  GMAIL_REFRESH_TOKEN: 'test-refresh-token',
  OWNER_EMAIL: 'owner@example.com',
  OPENMAIL_API_KEY: 'must-not-be-used',
  EMAILJS_SERVICE_ID: 'must-not-be-used',
  EMAILJS_TEMPLATE_ID: 'must-not-be-used',
  EMAILJS_PUBLIC_KEY: 'must-not-be-used',
  EMAILJS_PRIVATE_KEY: 'must-not-be-used',
  RESEND_API_KEY: 'must-not-be-used',
  EMAIL_FROM: 'must-not-be-used@example.com',
};

test('free transactional emails use Gmail API only, even when other providers are configured', async () => {
  const calls = [];
  const result = await sendFreeTransactionalEmail({
    to: 'customer@example.com',
    subject: 'AFSANA order received',
    html: '<p>Thank you for your order.</p>',
    text: 'Thank you for your order.',
  }, {
    env: gmailEnv,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url === 'https://oauth2.googleapis.com/token') {
        return { ok: true, json: async () => ({ access_token: 'test-access-token' }) };
      }
      if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') {
        return { ok: true, json: async () => ({ id: 'gmail-message-id' }) };
      }
      throw new Error('Unexpected paid provider request: ' + url);
    },
  });

  assert.deepEqual(result, { sent: true, provider: 'gmail' });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://oauth2.googleapis.com/token');
  assert.equal(calls[1].url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  assert.match(calls[1].options.headers.Authorization, /^Bearer test-access-token$/);
});

test('free transactional email fails closed when Gmail OAuth is missing', async () => {
  let networkCalls = 0;
  await assert.rejects(
    sendFreeTransactionalEmail(
      { to: 'customer@example.com', subject: 'Order', html: '<p>Order</p>' },
      { env: { OPENMAIL_API_KEY: 'present', RESEND_API_KEY: 'present', EMAIL_FROM: 'x@example.com' }, fetchImpl: async () => { networkCalls += 1; } },
    ),
    /Free Gmail API delivery is not configured/,
  );
  assert.equal(networkCalls, 0);
});
