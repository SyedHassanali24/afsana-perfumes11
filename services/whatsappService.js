'use strict';

const { normalizePhone } = require('./phone');

const DEFAULT_API_VERSION = 'v27.0';
const DEFAULT_LANGUAGE = 'en_US';

function recipientDigits(value) {
  const normalized = normalizePhone(String(value || '').trim());
  const digits = normalized.replace(/\\D/g, '');
  if (!/^[1-9]\\d{7,14}$/.test(digits)) {
    throw new Error('WhatsApp recipient phone number is invalid.');
  }
  return digits;
}

function templateText(value) {
  return String(value == null ? '' : value).replace(/[\\r\\n\\t]+/g, ' ').trim().slice(0, 1024) || '—';
}

/**
 * Sends an approved WhatsApp template. It deliberately skips when Cloud API
 * credentials are absent, so a pending Meta setup never affects checkout.
 * Business-initiated order messages must use an approved template and the
 * customer-facing call is made only after the shopper opts in at checkout.
 */
async function sendWhatsAppTemplate(
  { to, templateName, language = DEFAULT_LANGUAGE, parameters = [] } = {},
  { env = process.env, fetchImpl = globalThis.fetch } = {},
) {
  const accessToken = String(env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneNumberId = String(env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  if (!accessToken || !phoneNumberId) {
    return { sent: false, skipped: true, reason: 'not_configured' };
  }
  if (typeof fetchImpl !== 'function') throw new Error('WhatsApp network client is unavailable.');

  const name = String(templateName || '').trim();
  if (!/^[a-z0-9_]{3,80}$/.test(name)) throw new Error('WhatsApp message template is not configured.');
  const version = String(env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION).trim();
  if (!/^v\\d+\\.\\d+$/.test(version)) throw new Error('WhatsApp API version is invalid.');
  const toDigits = recipientDigits(to);
  const bodyParameters = parameters.map((value) => ({ type: 'text', text: templateText(value) }));
  const template = {
    name,
    language: { code: String(language || env.WHATSAPP_TEMPLATE_LANGUAGE || DEFAULT_LANGUAGE).trim() || DEFAULT_LANGUAGE },
  };
  if (bodyParameters.length) template.components = [{ type: 'body', parameters: bodyParameters }];

  const response = await fetchImpl(
    'https://graph.facebook.com/' + version + '/' + encodeURIComponent(phoneNumberId) + '/messages',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toDigits,
        type: 'template',
        template,
      }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const status = Number(response.status) || 0;
    const code = data && data.error && Number(data.error.code);
    throw new Error('WhatsApp template send failed' + (status ? ' (HTTP ' + status + ')' : '') + (Number.isFinite(code) ? ' [Meta code ' + code + ']' : '') + '.');
  }
  return {
    sent: true,
    messageId: data && Array.isArray(data.messages) && data.messages[0] && data.messages[0].id || null,
  };
}

module.exports = { sendWhatsAppTemplate, recipientDigits, DEFAULT_API_VERSION, DEFAULT_LANGUAGE };
