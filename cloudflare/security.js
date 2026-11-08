// Pure Cloudflare edge security policy; safe to unit-test under Node.js.
export function corsHeaders(origin, siteOrigin = "https://afsanaperfumes.store") {
  const allowed = new Set([
    siteOrigin,
    "https://www.afsanaperfumes.store",
    "https://afsana-perfumes11.eastwala12.workers.dev"
  ]);
  const headers = { Vary: "Origin" };
  if (!origin || !allowed.has(origin)) return headers;
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
