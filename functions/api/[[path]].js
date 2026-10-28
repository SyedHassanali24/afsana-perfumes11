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
    body = btoa(String.fromCharCode(...bytes));
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
  return new Response(result?.body ?? "", {
    status: result?.statusCode || 200,
    headers: responseHeaders,
  });
}

export async function onRequest(context) {
  const { request, params, env } = context;
  const pathParts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const group = pathParts[0];
  const functionPath = "/" + pathParts.join("/");
  const handler = await getHandler(group);

  if (!handler) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found." } }, { status: 404 });
  }

  process.env.MONGODB_URI = env.MONGODB_URI || "";
  process.env.MONGODB_DB_NAME = env.MONGODB_DB_NAME || "afsana_live";
  process.env.JWT_SECRET = env.JWT_SECRET || "";
  process.env.SITE_URL = env.SITE_URL || new URL(request.url).origin;
  process.env.ALLOWED_ORIGINS = env.ALLOWED_ORIGINS || new URL(request.url).origin;
  if (env.COOKIE_SAMESITE) process.env.COOKIE_SAMESITE = env.COOKIE_SAMESITE;

  const event = await netlifyEvent(request, functionPath);
  try {
    return responseFromNetlify(await handler(event, { ...context, site: { url: new URL(request.url).origin } }));
  } catch {
    return Response.json({ success: false, error: { code: "INTERNAL", message: "Internal server error." } }, { status: 500 });
  }
}
