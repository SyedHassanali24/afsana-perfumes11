'use strict';

function emailProviderReadiness(env = process.env) {
  const emailJsConfigured = Boolean(
    env.EMAILJS_SERVICE_ID &&
    env.EMAILJS_TEMPLATE_ID &&
    env.EMAILJS_PUBLIC_KEY &&
    env.EMAILJS_PRIVATE_KEY
  );
  const emailJsPasswordResetConfigured = emailJsConfigured && Boolean(env.EMAILJS_PASSWORD_RESET_TEMPLATE_ID);
  const gmailConfigured = Boolean(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN);
  const resendConfigured = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

  return {
    adminOtp: emailJsConfigured || gmailConfigured || resendConfigured,
    customerPasswordReset: gmailConfigured || resendConfigured || emailJsPasswordResetConfigured,
    providers: {
      emailJsOtp: emailJsConfigured,
      emailJsPasswordReset: emailJsPasswordResetConfigured,
      gmail: gmailConfigured,
      resend: resendConfigured,
    },
  };
}

module.exports = { emailProviderReadiness };
