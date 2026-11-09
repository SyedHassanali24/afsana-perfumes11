import { responseFromHandler } from "./response.js";

const handlerLoaders = {
  account: () => import("../../api/handlers/account/index.js"),
  analytics: () => import("../../api/handlers/analytics/index.js"),
  audit: () => import("../../api/handlers/audit/index.js"),
  auth: () => import("../../api/handlers/auth/index.js"),
  backup: () => import("../../api/handlers/backup/index.js"),
  cart: () => import("../../api/handlers/cart/index.js"),
  cms: () => import("../../api/handlers/cms/index.js"),
  coupons: () => import("../../api/handlers/coupons/index.js"),
  customers: () => import("../../api/handlers/customers/index.js"),
  finance: () => import("../../api/handlers/finance/index.js"),
  growth: () => import("../../api/handlers/growth/index.js"),
  health: () => import("../../api/handlers/health/index.js"),
  inventory: () => import("../../api/handlers/inventory/index.js"),
  media: () => import("../../api/handlers/media/index.js"),
  notifications: () => import("../../api/handlers/notifications/index.js"),
  orders: () => import("../../api/handlers/orders/index.js"),
  permissions: () => import("../../api/handlers/permissions/index.js"),
  products: () => import("../../api/handlers/products/index.js"),
  "purchase-orders": () => import("../../api/handlers/purchase-orders/index.js"),
  returns: () => import("../../api/handlers/returns/index.js"),
  reviews: () => import("../../api/handlers/reviews/index.js"),
  roles: () => import("../../api/handlers/roles/index.js"),
  settings: () => import("../../api/handlers/settings/index.js"),
  shipping: () => import("../../api/handlers/shipping/index.js"),
  staff: () => import("../../api/handlers/staff/index.js"),
  suppliers: () => import("../../api/handlers/suppliers/index.js"),
  taxonomy: () => import("../../api/handlers/taxonomy/index.js"),
  wishlist: () => import("../../api/handlers/wishlist/index.js"),
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
function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}
async function handlerEvent(request, path) {
  const headers = headersObject(request.headers);
  let body;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = bytesToBase64(new Uint8Array(await request.arrayBuffer()));
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

export async function onRequest(context) {
  const { request, params, env } = context;
  // The Pages wildcard param shape differs between the Pages runtime and the Durable Object
  // adapter. Derive API segments from the original URL so both runtimes resolve identical routes.
  const pathname = new URL(request.url).pathname;
  const pathParts = pathname.startsWith("/api/")
    ? pathname.slice("/api/".length).split("/").filter(Boolean)
    : (Array.isArray(params.path) ? params.path : [params.path].filter(Boolean));
  const group = pathParts[0];
  const functionPath = "/api/" + pathParts.join("/");
  const handler = await getHandler(group);

  if (!handler) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found." } }, { status: 404 });
  }

  // Cloudflare is the production runtime; do not let development defaults
  // silently turn customer password-reset emails into log-only development output.
  process.env.NODE_ENV = "production";
  process.env.CONTEXT = "production";
  process.env.MONGODB_URI = env.MONGODB_URI || "";
  process.env.MONGODB_DB_NAME = env.MONGODB_DB_NAME || "afsana_live";
  process.env.JWT_SECRET = env.JWT_SECRET || "";
  process.env.SITE_URL = env.SITE_URL || new URL(request.url).origin;
  process.env.ALLOWED_ORIGINS = env.ALLOWED_ORIGINS || new URL(request.url).origin;
  process.env.ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || new URL(request.url).origin;
  process.env.RATE_LIMIT_FAIL_OPEN = env.RATE_LIMIT_FAIL_OPEN || "false";
  process.env.DURABLE_RATE_LIMIT_ENABLED = env.MONGODB_CONNECTION ? "true" : "false";
  if (env.COOKIE_SAMESITE) process.env.COOKIE_SAMESITE = env.COOKIE_SAMESITE;
  if (env.RESEND_API_KEY) process.env.RESEND_API_KEY = env.RESEND_API_KEY;
  if (env.EMAIL_FROM) process.env.EMAIL_FROM = env.EMAIL_FROM;
  if (env.UPSTASH_REDIS_REST_URL) process.env.UPSTASH_REDIS_REST_URL = env.UPSTASH_REDIS_REST_URL;
  if (env.UPSTASH_REDIS_REST_TOKEN) process.env.UPSTASH_REDIS_REST_TOKEN = env.UPSTASH_REDIS_REST_TOKEN;
  if (env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = env.ADMIN_EMAIL;
  if (env.EASTWALA_EMAIL) process.env.EASTWALA_EMAIL = env.EASTWALA_EMAIL;
  if (env.OWNER_EMAIL) process.env.OWNER_EMAIL = env.OWNER_EMAIL;
  if (env.GMAIL_CLIENT_ID) process.env.GMAIL_CLIENT_ID = env.GMAIL_CLIENT_ID;
  if (env.GMAIL_CLIENT_SECRET) process.env.GMAIL_CLIENT_SECRET = env.GMAIL_CLIENT_SECRET;
  if (env.GMAIL_REFRESH_TOKEN) process.env.GMAIL_REFRESH_TOKEN = env.GMAIL_REFRESH_TOKEN;
  if (env.GMAIL_SENDER_EMAIL) process.env.GMAIL_SENDER_EMAIL = env.GMAIL_SENDER_EMAIL;
  if (env.EMAILJS_SERVICE_ID) process.env.EMAILJS_SERVICE_ID = env.EMAILJS_SERVICE_ID;
  if (env.EMAILJS_TEMPLATE_ID) process.env.EMAILJS_TEMPLATE_ID = env.EMAILJS_TEMPLATE_ID;
  if (env.EMAILJS_PUBLIC_KEY) process.env.EMAILJS_PUBLIC_KEY = env.EMAILJS_PUBLIC_KEY;
  if (env.EMAILJS_PRIVATE_KEY) process.env.EMAILJS_PRIVATE_KEY = env.EMAILJS_PRIVATE_KEY;
  if (env.EMAILJS_PASSWORD_RESET_TEMPLATE_ID) process.env.EMAILJS_PASSWORD_RESET_TEMPLATE_ID = env.EMAILJS_PASSWORD_RESET_TEMPLATE_ID;
  if (env.GMAIL_SENDER_EMAIL) process.env.GMAIL_SENDER_EMAIL = env.GMAIL_SENDER_EMAIL;
  if (env.TURNSTILE_SECRET_KEY) process.env.TURNSTILE_SECRET_KEY = env.TURNSTILE_SECRET_KEY;
  if (env.WHATSAPP_ACCESS_TOKEN) process.env.WHATSAPP_ACCESS_TOKEN = env.WHATSAPP_ACCESS_TOKEN;
  if (env.WHATSAPP_PHONE_NUMBER_ID) process.env.WHATSAPP_PHONE_NUMBER_ID = env.WHATSAPP_PHONE_NUMBER_ID;
  if (env.WHATSAPP_GRAPH_VERSION) process.env.WHATSAPP_GRAPH_VERSION = env.WHATSAPP_GRAPH_VERSION;


  const event = await handlerEvent(request, functionPath);
  try {
    return responseFromHandler(await handler(event, { ...context, site: { url: new URL(request.url).origin } }));
  } catch (error) {
    console.error("[api-adapter]", error?.message || error);
    return Response.json({ success: false, error: { code: "INTERNAL", message: "Internal server error." } }, { status: 500 });
  }
}
