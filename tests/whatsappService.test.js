'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendWhatsAppTemplate, sendWhatsAppText, recipientDigits } = require('../services/whatsappService');

test('WhatsApp: normalizes Pakistani mobile numbers to international API digits', () => {
  assert.equal(recipientDigits('0313 2956206'), '923132956206');
  assert.equal(recipientDigits('+92 313 2956206'), '923132956206');
  assert.equal(recipientDigits('3132956206'), '923132956206');
  assert.equal(recipientDigits('not-a-phone'), '');
});

test('WhatsApp: order confirmation stays disabled unless the explicit feature flag is true', async () => {
  let called = false;
  const result = await sendWhatsAppTemplate(
    { to: '03132956206', customerName: 'Test', orderNumber: 'AFS-00123', total: 7500 },
    {
      env: { WHATSAPP_ACCESS_TOKEN: 'present', WHATSAPP_PHONE_NUMBER_ID: '1234567890' },
      fetchImpl: async () => { called = true; throw new Error('must not run'); },
    },
  );
  assert.deepEqual(result, { sent: false, skipped: true, reason: 'disabled' });
  assert.equal(called, false);
});

test('WhatsApp: consented checkout sends only the configured approved template and three variables', async () => {
  let request;
  const result = await sendWhatsAppTemplate(
    { to: '03132956206', customerName: 'Test Customer', orderNumber: 'AFS-00123', total: 7500 },
    {
      env: {
        WHATSAPP_ACCESS_TOKEN: 'test-token',
        WHATSAPP_PHONE_NUMBER_ID: '1234567890',
        WHATSAPP_ORDER_CONFIRMATION_ENABLED: 'true',
        WHATSAPP_ORDER_TEMPLATE_NAME: 'afsana_order_confirmation',
        WHATSAPP_ORDER_TEMPLATE_LANGUAGE: 'en_US',
        WHATSAPP_GRAPH_API_VERSION: 'v27.0',
      },
      fetchImpl: async (url, options) => {
        request = { url, options };
        return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.sent' }] }) };
      },
    },
  );
  assert.equal(result.sent, true);
  assert.match(request.url, /v27\.0\/1234567890\/messages$/);
  const body = JSON.parse(request.options.body);
  assert.equal(body.type, 'template');
  assert.equal(body.to, '923132956206');
  assert.equal(body.template.name, 'afsana_order_confirmation');
  assert.equal(body.template.language.code, 'en_US');
  assert.deepEqual(body.template.components[0].parameters.map((item) => item.text), ['Test Customer', 'AFS-00123', 'PKR 7,500']);
});

test('WhatsApp: customer-service replies use plain text and require the configured business API', async () => {
  let request;
  const result = await sendWhatsAppText(
    { to: '03132956206', text: 'Thank you for contacting AFSANA.' },
    {
      env: { WHATSAPP_ACCESS_TOKEN: 'test-token', WHATSAPP_PHONE_NUMBER_ID: '1234567890', WHATSAPP_GRAPH_API_VERSION: 'v27.0' },
      fetchImpl: async (url, options) => {
        request = { url, options };
        return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.reply' }] }) };
      },
    },
  );
  assert.equal(result.sent, true);
  const body = JSON.parse(request.options.body);
  assert.equal(body.type, 'text');
  assert.equal(body.text.body, 'Thank you for contacting AFSANA.');
});
