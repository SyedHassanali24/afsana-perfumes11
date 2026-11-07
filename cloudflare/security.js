export function corsHeaders(origin, env = {}, requestOrigin = 'https://afsana-perfumes11.eastwala12.workers.dev') {
  const productionOrigin = 'https://afsana-perfumes11.eastwala12.workers.dev';
  const configured = String(env.AFSANA_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  const allowed = origin === productionOrigin || origin === requestOrigin || configured.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : productionOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, Idempotency-Key, Authorization',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
    'Vary': 'Origin'
  };
}

export function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=()'
  };
}

export function isValidNewsletterEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\\s@]{1,64}@[a-z0-9.-]+\\.[a-z]{2,}$/i.test(email);
}

export function newsletterRateLimitExceeded(rateDocument) {
  return Number(rateDocument?.count || 0) > 5;
}
