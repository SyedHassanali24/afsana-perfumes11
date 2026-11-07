import { handler as account } from "../netlify/functions/account/index.js";
import { handler as analytics } from "../netlify/functions/analytics/index.js";
import { handler as audit } from "../netlify/functions/audit/index.js";
import { handler as auth } from "../netlify/functions/auth/index.js";
import { handler as backup } from "../netlify/functions/backup/index.js";
import { handler as cart } from "../netlify/functions/cart/index.js";
import { handler as cms } from "../netlify/functions/cms/index.js";
import { handler as coupons } from "../netlify/functions/coupons/index.js";
import { handler as customers } from "../netlify/functions/customers/index.js";
import { handler as finance } from "../netlify/functions/finance/index.js";
import { handler as health } from "../netlify/functions/health/index.js";
import { handler as inventory } from "../netlify/functions/inventory/index.js";
import { handler as media } from "../netlify/functions/media/index.js";
import { handler as notifications } from "../netlify/functions/notifications/index.js";
import { handler as orders } from "../netlify/functions/orders/index.js";
import { handler as permissions } from "../netlify/functions/permissions/index.js";
import { handler as products } from "../netlify/functions/products/index.js";
import { handler as purchaseOrders } from "../netlify/functions/purchase-orders/index.js";
import { handler as returns } from "../netlify/functions/returns/index.js";
import { handler as reviews } from "../netlify/functions/reviews/index.js";
import { handler as roles } from "../netlify/functions/roles/index.js";
import { handler as settings } from "../netlify/functions/settings/index.js";
import { handler as shipping } from "../netlify/functions/shipping/index.js";
import { handler as staff } from "../netlify/functions/staff/index.js";
import { handler as suppliers } from "../netlify/functions/suppliers/index.js";
import { handler as taxonomy } from "../netlify/functions/taxonomy/index.js";
import { handler as wishlist } from "../netlify/functions/wishlist/index.js";

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
