'use strict';

const { getEmailJsConfig, sendEmailJsOtp } = require('./emailjs');

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

function otpContent({ purpose, otp }) {
  const minutes = purpose === 'admin login verification' ? 5 : 10;
  const text = 'Your AFSANA ' + purpose + ' code is ' + otp + '. It expires in ' + minutes + ' minutes. If you did not request this code, ignore this email.';
  const html = '<div style="font-family:Arial,sans-serif;color:#24183e;max-width:520px;margin:auto;padding:28px">' +
    '<p style="font-size:11px;letter-spacing:3px;color:#7958c9;font-weight:bold">AFSANA · THE ART OF SCENT</p>' +
    '<h2 style="font-size:24px">Security verification</h2><p>Your ' + purpose + ' code is:</p>' +
    '<div style="font-size:32px;letter-spacing:9px;font-weight:bold;background:#f3efff;padding:18px;text-align:center;border-radius:12px">' + otp + '</div>' +
    '<p style="color:#746b83;font-size:13px">' + text + '</p></div>';
  return { text, html, minutes };
}

async function sendGmailOtp({ to, subject, html, env, fetchImpl }) {
  const tokenResponse = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token) throw new Error('Gmail authorization could not be refreshed.');

  const sender = String(env.GMAIL_SENDER_EMAIL || env.OWNER_EMAIL || env.ADMIN_EMAIL || env.EASTWALA_EMAIL || to).trim();
  const headers = [];
  if (validEmail(sender)) headers.push('From: AFSANA Security <' + sender + '>');
  headers.push('To: ' + to, 'Subject: ' + subject, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=UTF-8');
  const mime = headers.concat('', html).join('\r\n');
  const sent = await fetchImpl('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tokenData.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: Buffer.from(mime, 'utf8').toString('base64url') }),
  });
  if (!sent.ok) throw new Error('Gmail could not deliver the security email.');
  return { provider: 'gmail' };
}

async function sendResendOtp({ to, subject, html, text, env, fetchImpl }) {
  const sent = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text }),
  });
  if (!sent.ok) throw new Error('Resend could not deliver the security email.');
  return { provider: 'resend' };
}

async function sendOtpWithFallback({ to, subject, purpose, otp, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const recipient = String(to || '').trim().toLowerCase();
  const code = String(otp || '');
  if (!validEmail(recipient)) throw new Error('OTP recipient email is invalid.');
  if (!/^\d{6}$/.test(code)) throw new Error('OTP must be six digits.');
  if (typeof fetchImpl !== 'function') throw new Error('Email network client is unavailable.');

  const content = otpContent({ purpose: String(purpose || 'security verification'), otp: code });
  const mail = { to: recipient, subject: String(subject || 'AFSANA security verification'), ...content, env, fetchImpl };
  const providers = [];

  try {
    const config = getEmailJsConfig(env);
    if (config) providers.push(['emailjs', () => sendEmailJsOtp({ to: recipient, subject: mail.subject, purpose, otp: code }, { config, fetchImpl })]);
  } catch (error) {
    // A partial EmailJS setup must not block a separately configured Gmail/Resend provider.
    providers.push(['emailjs', async () => { throw error; }]);
  }

  if (env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN) {
    providers.push(['gmail', () => sendGmailOtp(mail)]);
  }
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    providers.push(['resend', () => sendResendOtp(mail)]);
  }

  const failures = [];
  for (const [name, send] of providers) {
    try {
      await send();
      return { sent: true, provider: name };
    } catch (error) {
      failures.push(name);
      console.error('[otp-mailer] provider failed:', name);
    }
  }

  throw new Error(providers.length
    ? 'All configured email providers failed: ' + failures.join(', ')
    : 'Email OTP is not configured. Add EmailJS, Gmail OAuth, or Resend credentials to the Cloudflare Worker.');
}

module.exports = { sendOtpWithFallback, otpContent, sendGmailOtp, sendResendOtp };
