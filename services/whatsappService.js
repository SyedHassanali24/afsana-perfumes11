'use strict';

const { normalizePhone } = require('./phone');

function recipientDigits(value) {
  const normalized = normalizePhone(String(value || '').trim());
  const digits = normalized.replace(/\D/g, '');
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    throw new Error('WhatsApp recipient phone number is invalid.');
  }
  return digits;
}

// AFSANA is operated in zero-cost mode. Never call the WhatsApp Cloud API.
// Messages are prepared as share links and sent manually by the account owner.
async function sendWhatsAppTemplate() {
  return { sent: false, skipped: true, reason: 'manual_only' };
}

module.exports = { sendWhatsAppTemplate, recipientDigits };
