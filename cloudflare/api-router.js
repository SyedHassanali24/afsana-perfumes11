import { handler as account } from "../backend/routes/account/index.js";
import { handler as analytics } from "../backend/routes/analytics/index.js";
import { handler as audit } from "../backend/routes/audit/index.js";
import { handler as auth } from "../backend/routes/auth/index.js";
import { handler as backup } from "../backend/routes/backup/index.js";
import { handler as cart } from "../backend/routes/cart/index.js";
import { handler as cms } from "../backend/routes/cms/index.js";
import { handler as coupons } from "../backend/routes/coupons/index.js";
import { handler as customers } from "../backend/routes/customers/index.js";
import { handler as finance } from "../backend/routes/finance/index.js";
import { handler as health } from "../backend/routes/health/index.js";
import { handler as inventory } from "../backend/routes/inventory/index.js";
import { handler as media } from "../backend/routes/media/index.js";
import { handler as notifications } from "../backend/routes/notifications/index.js";
import { handler as orders } from "../backend/routes/orders/index.js";
import { handler as permissions } from "../backend/routes/permissions/index.js";
import { handler as products } from "../backend/routes/products/index.js";
import { handler as purchaseOrders } from "../backend/routes/purchase-orders/index.js";
import { handler as returns } from "../backend/routes/returns/index.js";
import { handler as reviews } from "../backend/routes/reviews/index.js";
import { handler as roles } from "../backend/routes/roles/index.js";
import { handler as settings } from "../backend/routes/settings/index.js";
import { handler as shipping } from "../backend/routes/shipping/index.js";
import { handler as staff } from "../backend/routes/staff/index.js";
import { handler as suppliers } from "../backend/routes/suppliers/index.js";
import { handler as taxonomy } from "../backend/routes/taxonomy/index.js";
import { handler as wishlist } from "../backend/routes/wishlist/index.js";

const ROUTES = {
  account, analytics, audit, auth, backup, cart, cms, coupons, customers, finance,
  health, inventory, media, notifications, orders, permissions, products,
  "purchase-orders": purchaseOrders, returns, reviews, roles, settings, shipping,
  staff, suppliers, taxonomy, wishlist
};

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function dispatchApiRequest(request) {
  const url = new URL(request.url);
  const match = /^\/api\/([^/]+)(?:\/|$)/.exec(url.pathname);
  const group = match?.[1];
  const handler = group ? ROUTES[group] : null;
  if (!handler) return Response.json({ success: false, error: { code: "NOT_FOUND", message: "API route not found." } }, { status: 404 });

  const headers = Object.fromEntries(request.headers.entries());
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) {
    headers["x-nf-client-connection-ip"] = ip;
    headers["x-forwarded-for"] = ip;
  }

  let body;
  if (!["GET", "HEAD"].includes(request.method)) {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > 1_000_000) {
      return Response.json({ success: false, error: { code: "REQUEST_TOO_LARGE", message: "Request too large." } }, { status: 413 });
    }
    body = await request.text();
    if (body.length > 1_000_000) {
      return Response.json({ success: false, error: { code: "REQUEST_TOO_LARGE", message: "Request too large." } }, { status: 413 });
    }
  }

  const event = {
    httpMethod: request.method,
    path: url.pathname,
    headers,
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    body,
    isBase64Encoded: false,
    rawUrl: request.url,
    rawQuery: url.searchParams.toString(),
    requestContext: { identity: { sourceIp: ip || "unknown" } }
  };
  const context = {
    site: { url: url.origin },
    clientContext: { custom: {} }
  };

  try {
    const result = await handler(event, context);
    const status = Number(result?.statusCode || 200);
    const outputHeaders = new Headers(result?.headers || {});
    for (const [name, values] of Object.entries(result?.multiValueHeaders || {})) {
      outputHeaders.delete(name);
      for (const value of Array.isArray(values) ? values : [values]) outputHeaders.append(name, String(value));
    }
    const responseBody = result?.body ?? "";
    const payload = result?.isBase64Encoded ? decodeBase64(responseBody) : (status === 204 || status === 304 ? null : responseBody);
    return new Response(payload, { status, headers: outputHeaders });
  } catch (error) {
    console.error("[afsana-api-router]", group, error?.name || "Error");
    return Response.json({ success: false, error: { code: "INTERNAL", message: "Something went wrong. Please try again." } }, { status: 500 });
  }
}
