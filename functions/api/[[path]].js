import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const handlers = {
  account: require("../../netlify/functions/account").handler,
  analytics: require("../../netlify/functions/analytics").handler,
  audit: require("../../netlify/functions/audit").handler,
  auth: require("../../netlify/functions/auth").handler,
  backup: require("../../netlify/functions/backup").handler,
  cart: require("../../netlify/functions/cart").handler,
  cms: require("../../netlify/functions/cms").handler,
  coupons: require("../../netlify/functions/coupons").handler,
  customers: require("../../netlify/functions/customers").handler,
  finance: require("../../netlify/functions/finance").handler,
  health: require("../../netlify/functions/health").handler,
  inventory: require("../../netlify/functions/inventory").handler,
  media: require("../../netlify/functions/media").handler,
  notifications: require("../../netlify/functions/notifications").handler,
  orders: require("../../netlify/functions/orders").handler,
  permissions: require("../../netlify/functions/permissions").handler,
  products: require("../../netlify/functions/products").handler,
  "purchase-orders": require("../../netlify/functions/purchase-orders").handler,
  returns: require("../../netlify/functions/returns").handler,
  reviews: require("../../netlify/functions/reviews").handler,
  roles: require("../../netlify/functions/roles").handler,
  settings: require("../../netlify/functions/settings").handler,
  shipping: require("../../netlify/functions/shipping").handler,
  staff: require("../../netlify/functions/staff").handler,
  suppliers: require("../../netlify/functions/suppliers").handler,
  taxonomy: require("../../netlify/functions/taxonomy").handler,
  wishlist: require("../../netlify/functions/wishlist").handler,
};

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

async function netlifyEvent(request, path, context) {
  const headers = headersObject(request.headers);
  let body;
  let isBase64Encoded = false;

  if (request.method !== "GET" && request.method !== "HEAD") {
    const bytes = new Uint8Array(await request.arrayBuffer());
    body = Buffer.from(bytes).toString("utf8");
  }

  return {
    httpMethod: request.method,
    path,
    headers,
    queryStringParameters: queryObject(request.url),
    body,
    isBase64Encoded,
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

  const handler = handlers[group];
  if (!handler) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found." } }, { status: 404 });
  }

  // The existing backend services use process.env. Bridge Cloudflare Pages
  // bindings into that interface without exposing any secret to the client.
  process.env.MONGODB_URI = env.MONGODB_URI || "";
  process.env.MONGODB_DB_NAME = env.MONGODB_DB_NAME || "afsana_live";
  process.env.JWT_SECRET = env.JWT_SECRET || "";
  process.env.SITE_URL = env.SITE_URL || new URL(request.url).origin;
  process.env.ALLOWED_ORIGINS = env.ALLOWED_ORIGINS || new URL(request.url).origin;
  if (env.COOKIE_SAMESITE) process.env.COOKIE_SAMESITE = env.COOKIE_SAMESITE;

  const event = await netlifyEvent(request, functionPath, context);
  const netlifyContext = {
    ...context,
    site: { url: new URL(request.url).origin },
  };

  try {
    const result = await handler(event, netlifyContext);
    return responseFromNetlify(result);
  } catch (error) {
    return Response.json(
      { success: false, error: { code: "INTERNAL", message: "Internal server error." } },
      { status: 500 }
    );
  }
}
