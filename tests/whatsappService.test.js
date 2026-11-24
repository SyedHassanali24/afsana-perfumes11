'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendWhatsAppTemplate, recipientDigits } = require('../services/whatsappService');

test('WhatsApp: converts a Pakistani local mobile number to Cloud API digits', () => {
  assert.equal(recipientDigits('0325 2032321'), '923252032321');
  assert.equal(recipientDigits('+92 325 2032321'), '923252032321');
});

test('WhatsApp: skips without Meta credentials and does not call the network', async () => {
  let called = false;
  const result = await sendWhatsAppTemplate(
    { to: '03252032321', templateName: 'afsana_new_order_alert', parameters: ['AFS-1'] },
    { env: {}, fetchImpl: async () => { called = true; throw new Error('must not run'); } },
  );
  assert.deepEqual(result, { sent: false, skipped: true, reason: 'not_configured' });
  assert.equal(called, false);
});

test('WhatsApp: sends an approved template with safe positional parameters', async () => {
  let request;
  const result = await sendWhatsAppTemplate(
    {
      to: '03252032321',
      templateName: 'afsana_new_order_alert',
      parameters: ['AFS-000001', 'A Customer', '03001234567', 'Busy Man × 1', '7500', 'COD'],
    },
    {
      env: {
        WHATSAPP_ACCESS_TOKEN: 'test-access-token',
        WHATSAPP_PHONE_NUMBER_ID: '1234567890',
        WHATSAPP_API_VERSION: 'v27.0',
      },
      fetchImpl: async (url, init) => {
        request = { url, init };
        return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.test' }] }) };
      },
    },
  );

  assert.equal(request.url, 'https://graph.facebook.com/v27.0/1234567890/messages');
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers.Authorization, 'Bearer test-access-token');
  const payload = JSON.parse(request.init.body);
  assert.equal(payload.messaging_product, 'whatsapp');
  assert.equal(payload.to, '923252032321');
  assert.equal(payload.type, 'template');
  assert.equal(payload.template.name, 'afsana_new_order_alert');
  assert.equal(payload.template.language.code, 'en_US');
  assert.deepEqual(payload.template.components[0].parameters.map((p) => p.text), [
    'AFS-000001', 'A Customer', '03001234567', 'Busy Man × 1', '7500', 'COD',
  ]);
  assert.deepEqual(result, { sent: true, messageId: 'wamid.test' });
});

test('WhatsApp: rejects a failed Meta response without exposing credentials or response body', async () => {
  await assert.rejects(
    () => sendWhatsAppTemplate(
      { to: '03252032321', templateName: 'afsana_new_order_alert', parameters: ['AFS-1'] },
      {
        env: { WHATSAPP_ACCESS_TOKEN: 'secret-token', WHATSAPP_PHONE_NUMBER_ID: '123' },
        fetchImpl: async () => ({
          ok: false,
          status: 400,
          json: async () => ({ error: { code: 132000, message: 'sensitive provider detail' } }),
        }),
      },
    ),
    (error) => {
      assert.match(error.message, /HTTP 400/);
      assert.match(error.message, /132000/);
      assert.doesNotMatch(error.message, /secret-token|sensitive provider detail/);
      return true;
    },
  );
});

test('WhatsApp: refuses an invalid recipient before making a request', async () => {
  let called = false;
  await assert.rejects(
    () => sendWhatsAppTemplate(
      { to: 'not-a-phone', templateName: 'afsana_new_order_alert' },
      {
        env: { WHATSAPP_ACCESS_TOKEN: 'token', WHATSAPP_PHONE_NUMBER_ID: '123' },
        fetchImpl: async () => { called = true; return { ok: true, json: async () => ({}) }; },
      },
    ),
    /recipient phone number is invalid/i,
  );
  assert.equal(called, false);
});
