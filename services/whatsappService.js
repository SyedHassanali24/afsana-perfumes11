'use strict';

function recipientDigits(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = '92' + digits.slice(1);
  if (!digits.startsWith('92') && /^3\d{9}$/.test(digits)) digits = '92' + digits;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : '';
}

function config(env) {
  const accessToken = String(env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneNumberId = String(env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const version = String(env.WHATSAPP_GRAPH_API_VERSION || 'v27.0').trim();
  if (!accessToken || !/^\d+$/.test(phoneNumberId)) return { ok: false, reason: 'not_configured' };
  if (!/^v\d+\.\d+$/.test(version)) return { ok: false, reason: 'invalid_api_version' };
  return { ok: true, accessToken, phoneNumberId, version };
}

async function postMessage(body, env, fetchImpl) {
  const ready = config(env);
  if (!ready.ok) return { sent: false, skipped: true, reason: ready.reason };
  if (typeof fetchImpl !== 'function') return { sent: false, skipped: true, reason: 'network_unavailable' };
  let response;
  try {
    response = await fetchImpl(
      'https://graph.facebook.com/' + ready.version + '/' + ready.phoneNumberId + '/messages',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + ready.accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...body }),
      },
    );
  } catch {
    return { sent: false, skipped: false, reason: 'network_error' };
  }
  if (!response.ok) return { sent: false, skipped: false, reason: 'whatsapp_api_rejected', httpStatus: response.status };
  const payload = await response.json().catch(() => ({}));
  return { sent: true, messageId: payload?.messages?.[0]?.id || null };
}

async function sendWhatsAppTemplate({ to, customerName, orderNumber, total } = {}, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (String(env.WHATSAPP_ORDER_CONFIRMATION_ENABLED || '').toLowerCase() !== 'true') {
    return { sent: false, skipped: true, reason: 'disabled' };
  }
  const recipient = recipientDigits(to);
  if (!recipient) return { sent: false, skipped: true, reason: 'invalid_recipient' };
  const templateName = String(env.WHATSAPP_ORDER_TEMPLATE_NAME || '').trim();
  const language = String(env.WHATSAPP_ORDER_TEMPLATE_LANGUAGE || 'en_US').trim();
  if (!/^[a-z0-9_]{3,120}$/.test(templateName) || !/^[a-z]{2,3}_[A-Z]{2}$/.test(language)) {
    return { sent: false, skipped: true, reason: 'template_not_configured' };
  }
  const amount = 'PKR ' + Math.max(0, Number(total) || 0).toLocaleString('en-PK');
  return postMessage({
    to: recipient,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: String(customerName || 'Valued customer').slice(0, 100) },
          { type: 'text', text: String(orderNumber || '').slice(0, 50) },
          { type: 'text', text: amount },
        ],
      }],
    },
  }, env, fetchImpl);
}

async function sendWhatsAppText({ to, text } = {}, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const recipient = recipientDigits(to);
  const message = String(text || '').trim().slice(0, 1800);
  if (!recipient || !message) return { sent: false, skipped: true, reason: 'invalid_message' };
  return postMessage({ to: recipient, type: 'text', text: { preview_url: false, body: message } }, env, fetchImpl);
}

module.exports = { recipientDigits, sendWhatsAppTemplate, sendWhatsAppText };
