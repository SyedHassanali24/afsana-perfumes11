const { E } = require('../middleware/errors');

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).split('+').join('-').split('/').join('_').replaceAll('=', '');
}

async function sendWithGmail({ to, subject, text, html }) {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const from = process.env.OWNER_EMAIL;
  if (!clientId || !clientSecret || !refreshToken || !from) throw E.serviceUnavailable('Email delivery is not configured. Please try again later.');
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' })
  });
  if (!tokenResponse.ok) throw E.serviceUnavailable('Email delivery is temporarily unavailable.');
  const token = await tokenResponse.json();
  if (!token.access_token) throw E.serviceUnavailable('Email delivery is temporarily unavailable.');
  const boundary = 'afsana_' + crypto.randomUUID().replace(/-/g, '');
  const safeHtml = html || '<p>' + String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
  const mime = [
    'From: AFSANA <' + from + '>', 'To: ' + to, 'Subject: ' + subject, 'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' + boundary + '"', '', '--' + boundary,
    'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', text,
    '--' + boundary, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '',
    safeHtml, '--' + boundary + '--', ''
  ].join(String.fromCharCode(13, 10));
  const bytes = new TextEncoder().encode(mime);
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  const raw = btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '');
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw })
  });
  if (!response.ok) { console.error('[mailer] Gmail API rejected message:', response.status); throw E.serviceUnavailable('Email delivery is temporarily unavailable.'); }
  return { sent: true, provider: 'gmail' };
}

async function sendTransactionalEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.OWNER_EMAIL;
  if (apiKey && from) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, html })
    });
    if (!response.ok) { console.error('[mailer] Resend rejected message:', response.status); throw E.serviceUnavailable('Email delivery is temporarily unavailable.'); }
    return { sent: true, provider: 'resend' };
  }
  return sendWithGmail({ to, subject, text, html });
}

async function sendPasswordReset({ to, url }) {
  const production = process.env.NODE_ENV === 'production' || process.env.CONTEXT === 'production';
  if (!production) { console.info('[mailer:dev] password reset for ' + to + ': ' + url); return { sent: false, development: true }; }
  return sendTransactionalEmail({ to, subject: 'Reset your AFSANA Perfumes password',
    text: 'Use this link to reset your password. It expires in 30 minutes: ' + url,
    html: '<p>Use the link below to reset your AFSANA Perfumes password. It expires in 30 minutes.</p><p><a href="' + url + '">Reset password</a></p>'
  });
}

module.exports = { sendPasswordReset, sendTransactionalEmail };
