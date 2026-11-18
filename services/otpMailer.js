'use strict';

const { getEmailJsConfig, sendEmailJsOtp, sendEmailJsTemplate } = require('./emailjs');

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

function otpContent({ purpose, otp }) {
  const minutes = purpose === 'admin login verification' ? 5 : 10;
  const text = 'Your AFSANA ' + purpose + ' code is ' + otp + '. It expires in ' + minutes + ' minutes. If you did not request this code, ignore this email.';
  const html = '<div style="font-family:Arial,sans-serif;color:#24183e;max-width:520px;margin:auto;padding:28px">' +
    '<div style="text-align:center;margin:0 0 22px"><img src="https://afsanaperfumes.store/afsana-email-logo.jpg" alt="AFSANA Perfumes" width="150" style="display:block;width:150px;max-width:100%;height:auto;margin:auto;border:0"></div>' +
    '<p style="font-size:11px;letter-spacing:3px;color:#7958c9;font-weight:bold;text-align:center">AFSANA · THE ART OF SCENT</p>' +
    '<h2 style="font-size:24px">Security verification</h2><p>Your ' + purpose + ' code is:</p>' +
    '<div style="font-size:32px;letter-spacing:9px;font-weight:bold;background:#f3efff;padding:18px;text-align:center;border-radius:12px">' + otp + '</div>' +
    '<p style="color:#746b83;font-size:13px">' + text + '</p>' + '<p style="margin-top:28px;color:#746b83;font-size:13px">Regards,<br><strong>AFSANA Perfumes Team</strong></p></div>';
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
  if (validEmail(sender)) headers.push('From: AFSANA Perfumes <' + sender + '>');
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

async function sendGmailTemplate({ to, subject, html, text = '' }, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const recipient = String(to || '').trim().toLowerCase();
  if (!validEmail(recipient)) throw new Error('Email recipient is invalid.');
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN) throw new Error('Gmail OAuth is not configured for transactional email.');
  return sendGmailOtp({ to: recipient, subject, html: String(html || ''), text, env, fetchImpl });
}

/**
 * Send a customer/admin transactional email using the configured provider chain.
 * A separate EmailJS template is optional; Gmail OAuth and Resend remain fallbacks.
 */
async function sendTransactionalEmail({ to, subject, html, text = '', params = {} }, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const recipient = String(to || '').trim().toLowerCase();
  if (!validEmail(recipient)) throw new Error('Transactional email recipient is invalid.');
  if (typeof fetchImpl !== 'function') throw new Error('Email network client is unavailable.');

  const failures = [];
  if (env.EMAILJS_NOTIFICATION_TEMPLATE_ID) {
    try {
      const config = getEmailJsConfig(env);
      if (!config) throw new Error('EmailJS credentials are not configured.');
      await sendEmailJsTemplate({
        to: recipient,
        subject,
        templateId: env.EMAILJS_NOTIFICATION_TEMPLATE_ID,
        params: {
          ...params,
          message_html: String(html || ''),
          message_text: String(text || ''),
          html_content: String(html || ''),
          text_content: String(text || ''),
        },
      }, { config, fetchImpl });
      return { sent: true, provider: 'emailjs' };
    } catch (error) {
      failures.push('emailjs');
      console.error('[transactional-email] EmailJS provider failed:', error?.message || error);
    }
  }

  if (env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN) {
    try {
      await sendGmailOtp({ to: recipient, subject, html: String(html || ''), text, env, fetchImpl });
      return { sent: true, provider: 'gmail' };
    } catch (error) {
      failures.push('gmail');
      console.error('[transactional-email] Gmail provider failed:', error?.message || error);
    }
  }

  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    try {
      await sendResendOtp({ to: recipient, subject, html: String(html || ''), text, env, fetchImpl });
      return { sent: true, provider: 'resend' };
    } catch (error) {
      failures.push('resend');
      console.error('[transactional-email] Resend provider failed:', error?.message || error);
    }
  }

  throw new Error(failures.length
    ? 'All configured transactional email providers failed: ' + failures.join(', ')
    : 'Transactional email is not configured. Add valid Gmail OAuth, EmailJS notification-template, or Resend credentials.');
}

module.exports = { sendOtpWithFallback, otpContent, sendGmailOtp, sendGmailTemplate, sendTransactionalEmail, sendResendOtp };
