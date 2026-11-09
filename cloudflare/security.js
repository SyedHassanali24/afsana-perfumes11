export const SECURITY_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains"
});

export function normalizeOrigin(value) {
  if (!value || typeof value !== "string" || value === "null") return null;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (url.username || url.password || (url.pathname && url.pathname !== "/") || url.search || url.hash) return null;
    if (url.protocol === "http:" && !["localhost", "127.0.0.1"].includes(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function allowedOrigins(env = {}, requestUrl) {
  const values = [
    "https://afsanaperfumes.store",
    "https://www.afsanaperfumes.store",
    ...String(env.ALLOWED_ORIGINS || "").split(","),
    env.SITE_URL,
    requestUrl ? new URL(requestUrl).origin : null
  ];
  return new Set(values.map(normalizeOrigin).filter(Boolean));
}

export function isAllowedOrigin(origin, env = {}, requestUrl) {
  const normalized = normalizeOrigin(origin);
  return !!normalized && allowedOrigins(env, requestUrl).has(normalized);
}

export function corsHeaders(origin, env = {}, requestUrl) {
  const headers = { "Vary": "Origin" };
  const normalized = normalizeOrigin(origin);
  if (!normalized || !isAllowedOrigin(normalized, env, requestUrl)) return headers;
  return {
    ...headers,
    "Access-Control-Allow-Origin": normalized,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, X-Requested-With, Idempotency-Key, Authorization",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS"
  };
}


export function securityHeaders(extra = {}) {
  return { ...SECURITY_HEADERS, ...extra };
}
