const handlerLoaders = {
  account: () => import("../../netlify/functions/account/index.js"),
  analytics: () => import("../../netlify/functions/analytics/index.js"),
  audit: () => import("../../netlify/functions/audit/index.js"),
  auth: () => import("../../netlify/functions/auth/index.js"),
  backup: () => import("../../netlify/functions/backup/index.js"),
  cart: () => import("../../netlify/functions/cart/index.js"),
  cms: () => import("../../netlify/functions/cms/index.js"),
  coupons: () => import("../../netlify/functions/coupons/index.js"),
  customers: () => import("../../netlify/functions/customers/index.js"),
  finance: () => import("../../netlify/functions/finance/index.js"),
  health: () => import("../../netlify/functions/health/index.js"),
  inventory: () => import("../../netlify/functions/inventory/index.js"),
  media: () => import("../../netlify/functions/media/index.js"),
  notifications: () => import("../../netlify/functions/notifications/index.js"),
  orders: () => import("../../netlify/functions/orders/index.js"),
  permissions: () => import("../../netlify/functions/permissions/index.js"),
  products: () => import("../../netlify/functions/products/index.js"),
  "purchase-orders": () => import("../../netlify/functions/purchase-orders/index.js"),
  returns: () => import("../../netlify/functions/returns/index.js"),
  reviews: () => import("../../netlify/functions/reviews/index.js"),
  roles: () => import("../../netlify/functions/roles/index.js"),
  settings: () => import("../../netlify/functions/settings/index.js"),
  shipping: () => import("../../netlify/functions/shipping/index.js"),
  staff: () => import("../../netlify/functions/staff/index.js"),
  suppliers: () => import("../../netlify/functions/suppliers/index.js"),
  taxonomy: () => import("../../netlify/functions/taxonomy/index.js"),
  wishlist: () => import("../../netlify/functions/wishlist/index.js"),
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

async function netlifyEvent(request, path) {
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

function responseFromNetlify(result) {
  const responseHeaders = new Headers(result?.headers || {});
  const multi = result?.multiValueHeaders || {};
  for (const [key, values] of Object.entries(multi)) {
    if (Array.isArray(values)) {
      responseHeaders.delete(key);
      for (const value of values) responseHeaders.append(key, String(value));
    }
  }

  // Netlify-style handlers mark binary media responses as base64. Decode them
  // before constructing the Fetch Response; otherwise browsers receive base64 text.
  let responseBody = result?.body ?? "";
  if (result?.isBase64Encoded && typeof responseBody === "string") {
    const binary = atob(responseBody);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
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
    // Without shared Redis, always use the documented per-isolate fallback. A stale "false" binding must not reject every API request.
    process.env.RATE_LIMIT_FAIL_OPEN = "true";
  }

  const pathParts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const group = pathParts[0];
  const functionPath = "/api/" + pathParts.join("/");
  const handler = await getHandler(group);

  if (!handler) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found." } }, { status: 404 });
  }

  const event = await netlifyEvent(request, functionPath);
  try {
    const response = await handler(event, { ...context, site: { url: new URL(request.url).origin } });
    return responseFromNetlify(response);
  } catch (error) {
    console.error("[afsana-api-adapter]", error?.message || error);
    return Response.json({ success: false, error: { code: "INTERNAL", message: "Internal server error." } }, { status: 500 });
  }
}
