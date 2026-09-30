// Placeholder until the notifications/email phase. Nothing is sent yet.
// In development the reset link is printed to the server console so the flow can be tested.
async function sendPasswordReset({ to, url }) {
  if (process.env.NODE_ENV !== 'production') console.info(`[mailer:dev] password reset for ${to}: ${url}`);
  else console.warn('[mailer] email provider not configured; password reset email NOT sent');
}
module.exports = { sendPasswordReset };
