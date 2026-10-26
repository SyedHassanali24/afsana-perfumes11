const { E } = require('../middleware/errors');

const provider = () => ({
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
});

async function sendPasswordReset({ to, url }) {
  const { apiKey, from } = provider();

  if (process.env.NODE_ENV !== 'production') {
    console.info(`[mailer:dev] password reset for ${to}: ${url}`);
    return { sent: false, development: true };
  }

  if (!apiKey || !from) {
    throw E.serviceUnavailable('Password reset email is temporarily unavailable. Please try again later.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Reset your Afsana Perfumes password',
      text: `Use this link to reset your password. It expires in 30 minutes: ${url}`,
      html: `<p>Use the link below to reset your Afsana Perfumes password. It expires in 30 minutes.</p><p><a href="${url}">Reset password</a></p>`,
    }),
  });

  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).message || ''; } catch {}
    console.error('[mailer] provider rejected password reset email', detail);
    throw E.serviceUnavailable('Password reset email is temporarily unavailable. Please try again later.');
  }

  return { sent: true };
}

module.exports = { sendPasswordReset };
