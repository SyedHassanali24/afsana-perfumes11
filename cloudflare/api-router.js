const handlerLoaders = {
  account: () => import("./api/account/index.js"),
  analytics: () => import("./api/analytics/index.js"),
  audit: () => import("./api/audit/index.js"),
  auth: () => import("./api/auth/index.js"),
  backup: () => import("./api/backup/index.js"),
  cart: () => import("./api/cart/index.js"),
  cms: () => import("./api/cms/index.js"),
  coupons: () => import("./api/coupons/index.js"),
  customers: () => import("./api/customers/index.js"),
  finance: () => import("./api/finance/index.js"),
  health: () => import("./api/health/index.js"),
  inventory: () => import("./api/inventory/index.js"),
  media: () => import("./api/media/index.js"),
  notifications: () => import("./api/notifications/index.js"),
  orders: () => import("./api/orders/index.js"),
  permissions: () => import("./api/permissions/index.js"),
  products: () => import("./api/products/index.js"),
  "purchase-orders": () => import("./api/purchase-orders/index.js"),
  returns: () => import("./api/returns/index.js"),
  reviews: () => import("./api/reviews/index.js"),
  roles: () => import("./api/roles/index.js"),
  settings: () => import("./api/settings/index.js"),
  shipping: () => import("./api/shipping/index.js"),
  staff: () => import("./api/staff/index.js"),
  suppliers: () => import("./api/suppliers/index.js"),
  taxonomy: () => import("./api/taxonomy/index.js"),
  wishlist: () => import("./api/wishlist/index.js"),
};

const handlerCache = new Map();

async function getHandler(group) {
  if (!handlerLoaders[group]) return null;
  if (!handlerCache.has(group)) {
    const mod = await handlerLoaders[group]();
    handlerCache.set(group, mod.handler || mod.default?.handler || mod.default);
  }
  return handlerCache.get(group);
}

function headersObject(headers) {
  const out = {};
  for (const [key, value] of headers.entries()) out[key.toLowerCase()] = value;
  return out;
}

function queryObject(url) {
  const out = {};
  for (const [key, value] of new URL(url).searchParams.entries()) out[key] = value;
  return out;
}

async function readRequestBodyText(request) {
  // Read the incoming stream directly. Request.text() may use an internal
  // fixed-length buffering path that can fail on larger JSON media uploads.
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

async function cloudflareEvent(request, path) {
  const headers = headersObject(request.headers);
  let body;
  if (request.method !== "GET" && request.method !== "HEAD") {
    // Preserve JSON UTF-8; embedded image data is already base64.
    body = await readRequestBodyText(request);
  }
  return {
    httpMethod: request.method,
    path,
    headers,
    queryStringParameters: queryObject(request.url),
    body,
    isBase64Encoded: false,
  };
}

function responseFromCloudflare(result) {
  const responseHeaders = new Headers(result?.headers || {});
  const multi = result?.multiValueHeaders || {};
  for (const [key, values] of Object.entries(multi)) {
    if (Array.isArray(values)) {
      responseHeaders.delete(key);
      for (const value of values) responseHeaders.append(key, String(value));
    }
  }

  let responseBody = result?.body ?? "";
  if (result?.isBase64Encoded && typeof responseBody === "string") {
    const binary = atob(responseBody);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    responseBody = bytes;
    responseHeaders.delete("content-length");
    responseHeaders.delete("content-encoding");
  }

  return new Response(responseBody, {
    status: result?.statusCode || 200,
    headers: responseHeaders,
  });
}

export async function onRequest(context) {
  const { request, params, env } = context;

  // Populate Node-style environment before loading function modules. In production,
  // use the local isolate limiter only when no shared Redis credentials are configured.
  process.env.MONGODB_URI = env.MONGODB_URI || "";
  process.env.MONGODB_DB_NAME = env.MONGODB_DB_NAME || "afsana_live";
  process.env.JWT_SECRET = env.JWT_SECRET || "";
  process.env.SITE_URL = env.SITE_URL || new URL(request.url).origin;
  process.env.ALLOWED_ORIGINS = env.ALLOWED_ORIGINS || new URL(request.url).origin;
  process.env.ADMIN_EMAIL = env.ADMIN_EMAIL || env.OWNER_EMAIL || process.env.ADMIN_EMAIL || "";
  if (env.COOKIE_SAMESITE) process.env.COOKIE_SAMESITE = env.COOKIE_SAMESITE;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // No shared Redis credentials exist on this Worker. Keep uploads and
    // other API writes available with the isolate-local fallback until Redis
    // is configured; this is a deliberate temporary availability trade-off.
    process.env.RATE_LIMIT_FAIL_OPEN = "true";
  }

  const pathParts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const group = pathParts[0];
  const functionPath = "/api/" + pathParts.join("/");
  const handler = await getHandler(group);

  if (!handler) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found." } }, { status: 404 });
  }

  const event = await cloudflareEvent(request, functionPath);
  try {
    const response = await handler(event, { ...context, site: { url: new URL(request.url).origin } });
    return responseFromCloudflare(response);
  } catch (error) {
    console.error("[afsana-cloudflare-api]", error?.message || error);
    return Response.json({ success: false, error: { code: "INTERNAL", message: "Internal server error." } }, { status: 500 });
  }
}
