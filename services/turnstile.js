'use strict';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

async function verifyTurnstile({ token, action, hostname, remoteIp, secret = process.env.TURNSTILE_SECRET_KEY, fetchImpl = globalThis.fetch } = {}) {
  const configured = String(secret || '').trim();
  if (!configured) {
    const local = String(process.env.NETLIFY_DEV || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'development';
    if (local) return { skipped: true };
    const error = new Error('Security verification is not configured.');
    error.status = 503;
    error.code = 'TURNSTILE_NOT_CONFIGURED';
    throw error;
  }

  const responseToken = String(token || '').trim();
  if (!responseToken || responseToken.length > 2048) {
    const error = new Error('Please complete the security check and try again.');
    error.status = 403;
    error.code = 'TURNSTILE_REQUIRED';
    throw error;
  }

  if (typeof fetchImpl !== 'function') {
    const error = new Error('Security verification is temporarily unavailable.');
    error.status = 503;
    error.code = 'TURNSTILE_UNAVAILABLE';
    throw error;
  }

  const payload = new URLSearchParams({ secret: configured, response: responseToken });
  if (remoteIp && /^[0-9a-f:.]+$/i.test(String(remoteIp))) payload.set('remoteip', String(remoteIp));

  let result;
  try {
    const res = await fetchImpl(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('Siteverify returned HTTP ' + res.status);
    result = await res.json();
  } catch (cause) {
    const error = new Error('Security verification is temporarily unavailable. Please try again.');
    error.status = 503;
    error.code = 'TURNSTILE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }

  const validHost = String(hostname || '').toLowerCase().replace(/\.$/, '');
  const returnedHost = String(result?.hostname || '').toLowerCase().replace(/\.$/, '');
  const validAction = !action || result?.action === action;
  const hostMatches = !validHost || returnedHost === validHost;

  if (result?.success !== true || !validAction || !hostMatches) {
    const error = new Error('Security check failed or expired. Please try again.');
    error.status = 403;
    error.code = 'TURNSTILE_FAILED';
    throw error;
  }
  return { success: true, action: result.action, hostname: result.hostname };
}

module.exports = { VERIFY_URL, verifyTurnstile };
