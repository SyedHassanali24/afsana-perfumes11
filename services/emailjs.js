'use strict';

const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send';

/**
 * Return null when EmailJS is entirely unset, but reject partial configuration.
 * This prevents silently falling back when an EmailJS setup is half-complete.
 */
function getEmailJsConfig(env = process.env) {
  const names = ['EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_PRIVATE_KEY'];
  const values = Object.fromEntries(names.map((name) => [name, String(env[name] || '').trim()]));
  const present = names.filter((name) => values[name]);
  if (present.length === 0) return null;
  const missing = names.filter((name) => !values[name]);
  if (missing.length) throw new Error('EmailJS is partially configured. Add all four EmailJS secrets to the Worker.');
  return {
    serviceId: values.EMAILJS_SERVICE_ID,
    templateId: values.EMAILJS_TEMPLATE_ID,
    publicKey: values.EMAILJS_PUBLIC_KEY,
    privateKey: values.EMAILJS_PRIVATE_KEY,
  };
}

/** Send one security OTP from the Cloudflare Worker. Never log credentials or OTP values. */
async function sendEmailJsOtp({ to, subject, purpose, otp }, { config, fetchImpl = globalThis.fetch } = {}) {
  if (!config) throw new Error('EmailJS configuration is missing.');
  if (typeof fetchImpl !== 'function') throw new Error('EmailJS network client is unavailable.');
  const recipient = String(to || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error('EmailJS recipient address is invalid.');
  const code = String(otp || '');
  if (!/^\d{6}$/.test(code)) throw new Error('EmailJS OTP must be a six-digit code.');
  const expiryMinutes = purpose === 'admin login verification' ? 5 : 10;
  const response = await fetchImpl(EMAILJS_SEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: config.serviceId,
      template_id: config.templateId,
      user_id: config.publicKey,
      accessToken: config.privateKey,
      template_params: {
        to_email: recipient,
        subject: String(subject || 'AFSANA security verification'),
        purpose: String(purpose || 'security verification'),
        otp: code,
        expiry_minutes: expiryMinutes,
        app_name: 'AFSANA Perfumes',
      },
    }),
  });
  if (!response || !response.ok) {
    const status = Number(response && response.status) || 0;
    throw new Error(status ? 'EmailJS could not deliver the security email (HTTP ' + status + ').' : 'EmailJS could not deliver the security email.');
  }
}

module.exports = { getEmailJsConfig, sendEmailJsOtp, EMAILJS_SEND_URL };