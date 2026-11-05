'use strict';

const { ApiError } = require('../middleware/errors');

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

async function verifyTurnstile({ token, action, hostname, remoteIp, secret = process.env.TURNSTILE_SECRET_KEY, fetchImpl = globalThis.fetch } = {}) {
  const configured = String(secret || '').trim();
  if (!configured) {
    const local = String(process.env.NETLIFY_DEV || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'development';
    if (local) return { skipped: true };
    throw new ApiError(503, 'TURNSTILE_NOT_CONFIGURED', 'Security verification is not configured.');
  }

  const responseToken = String(token || '').trim();
  if (!responseToken || responseToken.length > 2048) {
    throw new ApiError(403, 'TURNSTILE_REQUIRED', 'Please complete the security check and try again.');
  }

  if (typeof fetchImpl !== 'function') {
    throw new ApiError(503, 'TURNSTILE_UNAVAILABLE', 'Security verification is temporarily unavailable.');
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
    const error = new ApiError(503, 'TURNSTILE_UNAVAILABLE', 'Security verification is temporarily unavailable. Please try again.');
    error.cause = cause;
    throw error;
  }

  const errorCodes = Array.isArray(result?.['error-codes']) ? result['error-codes'] : [];
  if (errorCodes.includes('invalid-input-secret') || errorCodes.includes('missing-input-secret')) {
    throw new ApiError(503, 'TURNSTILE_CONFIG_INVALID', 'Security verification is misconfigured. Please contact support.');
  }
  const validHost = String(hostname || '').toLowerCase().replace(/\.$/, '');
  const returnedHost = String(result?.hostname || '').toLowerCase().replace(/\.$/, '');
  const validAction = !action || result?.action === action;
  const hostMatches = !validHost || returnedHost === validHost;

  if (result?.success !== true || !validAction || !hostMatches) {
    throw new ApiError(403, 'TURNSTILE_FAILED', 'Security check failed or expired. Please try again.');
  }
  return { success: true, action: result.action, hostname: result.hostname };
}

module.exports = { VERIFY_URL, verifyTurnstile };
