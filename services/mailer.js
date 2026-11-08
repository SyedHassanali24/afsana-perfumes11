'use strict';

const crypto = require('crypto');
const { E } = require('../middleware/errors');
const { getEmailJsConfig } = require('./emailjs');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

async function sendGmailPasswordReset({ to, subject, text, html }, env, fetchImpl) {
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
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw E.serviceUnavailable('Password reset email is temporarily unavailable. Please try again later.');
  }

  const boundary = 'afsana_' + crypto.randomBytes(12).toString('hex');
  const sender = String(env.GMAIL_SENDER_EMAIL || env.OWNER_EMAIL || env.ADMIN_EMAIL || env.EASTWALA_EMAIL || '').trim();
  const headers = [];
  if (sender && emailPattern.test(sender)) headers.push('From: AFSANA Perfumes <' + sender + '>');
  headers.push('To: ' + to, 'Subject: ' + subject, 'MIME-Version: 1.0');
  headers.push('Content-Type: multipart/alternative; boundary="' + boundary + '"');
  const mime = [
    ...headers,
    '',
    '--' + boundary,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '--' + boundary,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    '--' + boundary + '--',
    '',
  ].join('\r\n');
  const sent = await fetchImpl('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tokenData.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: Buffer.from(mime, 'utf8').toString('base64url') }),
  });
  if (!sent.ok) {
    throw E.serviceUnavailable('Password reset email is temporarily unavailable. Please try again later.');
  }
  return { sent: true, provider: 'gmail' };
}

async function sendResendPasswordReset({ to, subject, text, html }, env, fetchImpl) {
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text, html }),
  });
  if (!response.ok) {
    throw E.serviceUnavailable('Password reset email is temporarily unavailable. Please try again later.');
  }
  return { sent: true, provider: 'resend' };
}

async function sendEmailJsPasswordReset({ to, subject, text, url }, env, fetchImpl, config) {
  const response = await fetchImpl('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: config.serviceId,
      template_id: env.EMAILJS_PASSWORD_RESET_TEMPLATE_ID,
      user_id: config.publicKey,
      accessToken: config.privateKey,
      template_params: {
        to_email: to,
        subject,
        reset_url: url,
        message: text,
        expiry_minutes: 30,
        app_name: 'AFSANA Perfumes',
      },
    }),
  });
  if (!response.ok) {
    throw E.serviceUnavailable('Password reset email is temporarily unavailable. Please try again later.');
  }
  return { sent: true, provider: 'emailjs' };
}

async function sendPasswordReset({ to, url }, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const production = env.NODE_ENV === 'production' || env.CONTEXT === 'production';
  if (!production) {
    console.info('[mailer:dev] password reset email would be sent to ' + String(to || 'unknown recipient'));
    return { sent: false, development: true };
  }

  const recipient = String(to || '').trim().toLowerCase();
  if (!emailPattern.test(recipient)) throw E.badRequest('Password reset recipient email is invalid.');
  if (typeof fetchImpl !== 'function') throw E.serviceUnavailable('Password reset email is temporarily unavailable. Please try again later.');

  let resetUrl;
  try {
    resetUrl = new URL(String(url || ''));
    if (resetUrl.protocol !== 'https:' || resetUrl.username || resetUrl.password) throw new Error('Unsafe reset URL.');
  } catch {
    throw E.serviceUnavailable('Password reset email is temporarily unavailable. Please try again later.');
  }

  const safeUrl = resetUrl.toString();
  const subject = 'Reset your AFSANA Perfumes password';
  const text = 'Use this secure link to reset your AFSANA Perfumes password. It expires in 30 minutes: ' + safeUrl;
  const html = '<div style="font-family:Arial,sans-serif;color:#24183e;max-width:520px;margin:auto;padding:28px">' +
    '<p style="font-size:11px;letter-spacing:3px;color:#7958c9;font-weight:bold">AFSANA · THE ART OF SCENT</p>' +
    '<h2>Reset your password</h2><p>This secure link expires in 30 minutes.</p>' +
    '<p><a href="' + escapeHtml(safeUrl) + '" style="display:inline-block;padding:12px 20px;background:#5b3da7;color:#fff;text-decoration:none;border-radius:8px">Reset password</a></p>' +
    '<p style="font-size:12px;color:#746b83">If you did not request this change, ignore this email.</p></div>';

  try {
    const gmailConfigured = Boolean(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN);
    if (gmailConfigured) return await sendGmailPasswordReset({ to: recipient, subject, text, html }, env, fetchImpl);

    if (env.RESEND_API_KEY && env.EMAIL_FROM) {
      return await sendResendPasswordReset({ to: recipient, subject, text, html }, env, fetchImpl);
    }

    const emailJsConfig = getEmailJsConfig(env);
    if (emailJsConfig && env.EMAILJS_PASSWORD_RESET_TEMPLATE_ID) {
      return await sendEmailJsPasswordReset({ to: recipient, subject, text, url: safeUrl }, env, fetchImpl, emailJsConfig);
    }

    throw E.serviceUnavailable('Password reset email is temporarily unavailable. Please contact support.');
  } catch (error) {
    if (error?.status === 503) throw error;
    console.error('[mailer] customer password-reset provider unavailable:', String(error?.message || 'provider failure').slice(0, 180));
    throw E.serviceUnavailable('Password reset email is temporarily unavailable. Please try again later.');
  }
}

module.exports = { sendPasswordReset, sendGmailPasswordReset, sendResendPasswordReset };
