// Shared, pure Cloudflare edge security helpers. Kept separate so Node tests can
// exercise the policy without importing Cloudflare's Durable Object runtime.
export function corsHeaders(origin, env, siteOrigin) {
  const configured = String(env?.AFSANA_ALLOWED_ORIGINS || "")
    .split(",").map(value => value.trim()).filter(Boolean);
  const allowedOrigins = new Set([siteOrigin, ...configured]);
  const headers = { "Vary": "Origin" };
  if (!origin || !allowedOrigins.has(origin)) return headers;
  return {
    ...headers,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, X-Requested-With, Idempotency-Key, Authorization",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS"
  };
}

export function securityHeaders(headers = {}) {
  return {
    ...headers,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  };
}
