'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendOpenMail, sendTransactionalEmail } = require('../services/otpMailer');

const env = {
  OPENMAIL_API_KEY: 'om_test_key_do_not_use',
  OPENMAIL_INBOX_ID: 'inb_afsana_test',
};

test('OpenMail sends a branded HTML transaction with an idempotency key', async () => {
  let request;
  const result = await sendOpenMail({
    to: 'Customer@Example.com',
    subject: 'Thank you for your AFSANA order AFS-1001',
    html: '<h1>AFSANA</h1>',
    text: 'Thank you',
    idempotencyKey: 'afsana-customer-order-AFS-1001',
    env,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({ messageId: 'msg_1001', threadId: 'thr_1001', status: 'sent' }),
      };
    },
  });

  assert.equal(request.url, 'https://api.openmail.sh/v1/inboxes/inb_afsana_test/send');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer om_test_key_do_not_use');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.equal(request.options.headers['Idempotency-Key'], 'afsana-customer-order-AFS-1001');
  assert.deepEqual(JSON.parse(request.options.body), {
    to: 'customer@example.com',
    subject: 'Thank you for your AFSANA order AFS-1001',
    body: '<h1>AFSANA</h1>',
  });
  assert.equal(result.provider, 'openmail');
  assert.equal(result.messageId, 'msg_1001');
  assert.equal(result.threadId, 'thr_1001');
});

test('OpenMail provider errors are surfaced without logging credentials', async () => {
  let requestCount = 0;
  await assert.rejects(
    sendOpenMail({
      to: 'customer@example.com',
      subject: 'Test',
      text: 'Hello',
      env,
      fetchImpl: async () => {
        requestCount += 1;
        return { ok: false, status: 403, json: async () => ({ error: 'recipient_not_permitted', message: 'Recipient not permitted' }) };
      },
    }),
    /recipient_not_permitted|Recipient not permitted/,
  );
  assert.equal(requestCount, 1);
});

test('OpenMail is the primary transactional provider when its Worker secret is set', async () => {
  let requestedUrl = '';
  const result = await sendTransactionalEmail({
    to: 'eastwala@gmail.com',
    subject: 'AFSANA order alert',
    text: 'New order received',
    idempotencyKey: 'afsana-admin-order-AFS-1001',
  }, {
    env,
    fetchImpl: async (url) => {
      requestedUrl = url;
      return { ok: true, status: 200, json: async () => ({ messageId: 'msg_admin', status: 'sent' }) };
    },
  });
  assert.equal(requestedUrl, 'https://api.openmail.sh/v1/inboxes/inb_afsana_test/send');
  assert.equal(result.provider, 'openmail');
});

test('OpenMail configuration is required before any network call', async () => {
  let calls = 0;
  await assert.rejects(
    sendOpenMail({
      to: 'customer@example.com',
      subject: 'Test',
      text: 'Hello',
      env: {},
      fetchImpl: async () => { calls += 1; return { ok: true, status: 200, json: async () => ({}) }; },
    }),
    /OPENMAIL_API_KEY and OPENMAIL_INBOX_ID/,
  );
  assert.equal(calls, 0);
});
