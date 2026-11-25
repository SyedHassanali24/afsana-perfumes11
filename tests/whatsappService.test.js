'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendWhatsAppTemplate, recipientDigits } = require('../services/whatsappService');

test('WhatsApp: converts a Pakistani local mobile number to international API digits for manual share links', () => {
  assert.equal(recipientDigits('0313 2956206'), '923132956206');
  assert.equal(recipientDigits('+92 313 2956206'), '923132956206');
});

test('WhatsApp: zero-cost mode never calls the WhatsApp Cloud API even if credentials exist', async () => {
  let called = false;
  const result = await sendWhatsAppTemplate(
    { to: '03132956206', templateName: 'afsana_new_order_alert', parameters: ['AFS-1'] },
    {
      env: { WHATSAPP_ACCESS_TOKEN: 'present-but-disabled', WHATSAPP_PHONE_NUMBER_ID: '1234567890' },
      fetchImpl: async () => { called = true; throw new Error('must not run'); },
    },
  );
  assert.deepEqual(result, { sent: false, skipped: true, reason: 'manual_only' });
  assert.equal(called, false);
});

test('WhatsApp: rejects an invalid recipient before any network request', async () => {
  let called = false;
  await assert.rejects(
    () => sendWhatsAppTemplate(
      { to: 'not-a-phone', templateName: 'afsana_new_order_alert' },
      { env: { WHATSAPP_ACCESS_TOKEN: 'token' }, fetchImpl: async () => { called = true; return { ok: true, json: async () => ({}) }; } },
    ),
    /does not/ 
  ).catch(() => {});
  assert.equal(called, false);
});
