const handlerLoaders = {
  account: () => import("../../cloudflare/api/account/index.js"),
  analytics: () => import("../../cloudflare/api/analytics/index.js"),
  audit: () => import("../../cloudflare/api/audit/index.js"),
  auth: () => import("../../cloudflare/api/auth/index.js"),
  backup: () => import("../../cloudflare/api/backup/index.js"),
  cart: () => import("../../cloudflare/api/cart/index.js"),
  cms: () => import("../../cloudflare/api/cms/index.js"),
  coupons: () => import("../../cloudflare/api/coupons/index.js"),
  customers: () => import("../../cloudflare/api/customers/index.js"),
  finance: () => import("../../cloudflare/api/finance/index.js"),
  health: () => import("../../cloudflare/api/health/index.js"),
  inventory: () => import("../../cloudflare/api/inventory/index.js"),
  media: () => import("../../cloudflare/api/media/index.js"),
  notifications: () => import("../../cloudflare/api/notifications/index.js"),
  orders: () => import("../../cloudflare/api/orders/index.js"),
  permissions: () => import("../../cloudflare/api/permissions/index.js"),
  products: () => import("../../cloudflare/api/products/index.js"),
  "purchase-orders": () => import("../../cloudflare/api/purchase-orders/index.js"),
  returns: () => import("../../cloudflare/api/returns/index.js"),
  reviews: () => import("../../cloudflare/api/reviews/index.js"),
  roles: () => import("../../cloudflare/api/roles/index.js"),
  settings: () => import("../../cloudflare/api/settings/index.js"),
  shipping: () => import("../../cloudflare/api/shipping/index.js"),
  staff: () => import("../../cloudflare/api/staff/index.js"),
  suppliers: () => import("../../cloudflare/api/suppliers/index.js"),
  taxonomy: () => import("../../cloudflare/api/taxonomy/index.js"),
  wishlist: () => import("../../cloudflare/api/wishlist/index.js"),
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

async function toHandlerEvent(request, path) {
  const headers = headersObject(request.headers);
  let body;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const bytes = new Uint8Array(await request.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    body = btoa(binary);
  }
  return {
    httpMethod: request.method,
    path,
    headers,
    queryStringParameters: queryObject(request.url),
    body,
    isBase64Encoded: Boolean(body),
  };
}

function responseFromHandler(result) {
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
    process.env.RATE_LIMIT_FAIL_OPEN = env.RATE_LIMIT_FAIL_OPEN || "true";
  }

  const pathParts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const group = pathParts[0];
  const functionPath = "/api/" + pathParts.join("/");
  const handler = await getHandler(group);

  if (!handler) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found." } }, { status: 404 });
  }

  const handlerEvent = await toHandlerEvent(request, functionPath);
  try {
    const response = await handler(handlerEvent, { ...context, site: { url: new URL(request.url).origin } });
    return responseFromHandler(response);
  } catch (error) {
    console.error("[afsana-cloudflare-api]", error?.message || error);
    return Response.json({ success: false, error: { code: "INTERNAL", message: "Internal server error." } }, { status: 500 });
  }
}
