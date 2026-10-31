import { MongoDBConnection } from "./MongoDBConnection.js";

// deploy-sync-2026-10-28
const SITE_ORIGIN = "https://afsana-perfumes11.eastwala12.workers.dev";
// PR #7 backend preview is the current working API while main production remains on the older release.
const API_ORIGIN = "https://afsanayaar.netlify.app";
const API_PREFIX = "/api";
const SITE_CSP = "default-src 'self'; script-src 'self' https://ajax.googleapis.com 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; media-src 'self' blob: https:; connect-src 'self' https:; frame-src 'self' https://app.netlify.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

function cors(origin) {
  const allowed = origin === SITE_ORIGIN || /^https:\/\/[^/]+\.workers\.dev$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : SITE_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, X-Requested-With, Idempotency-Key, Authorization",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
    "Vary": "Origin"
  };
}
function json(data, status, headers = {}) { return Response.json(data, { status, headers }); }
function cacheable(pathname, method) {
  if (method !== "GET" && method !== "HEAD") return false;
  return /^\/api\/products(?:\/[^/]+)?\/?$/i.test(pathname) ||
    /^\/api\/taxonomy\/public\//i.test(pathname) ||
    /^\/api\/settings\/public\/?$/i.test(pathname) ||
    /^\/api\/cms\/public\/?$/i.test(pathname) ||
    /^\/api\/reviews\/product\//i.test(pathname);
}
async function health(env) {
  const id = env.MONGODB_CONNECTION.idFromName("afsana-mongodb");
  return env.MONGODB_CONNECTION.get(id, { locationHint: "me" }).health();
}

export default {
  async fetch(request, env, ctx) {
    const u = new URL(request.url);
    const origin = request.headers.get("Origin") || SITE_ORIGIN;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });

    if (u.pathname === "/api/health/mongodb" && request.method === "GET") {
      try {
        return json({ success: true, service: "mongodb", ...(await health(env)) }, 200,
          { ...cors(origin), "Cache-Control": "no-store", "X-Afsana-Backend": "cloudflare-mongodb" });
      } catch {
        return json({ success: false, service: "mongodb", connected: false }, 503,
          { ...cors(origin), "Cache-Control": "no-store", "X-Afsana-Backend": "cloudflare-mongodb" });
      }
    }

    if (!u.pathname.startsWith("/api/")) {
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      if (u.pathname.startsWith("/assets/")) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      } else if (u.pathname === "/" || u.pathname.endsWith(".html")) {
        headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      }
      headers.set("Content-Security-Policy", SITE_CSP);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Afsana-Backend", "cloudflare-assets");
      return new Response(asset.body, { status: asset.status, headers });
    }

    const upstream = new URL(API_ORIGIN);
    upstream.pathname = `${API_PREFIX}${u.pathname.slice(4)}`;
    upstream.search = u.search;

    const can = cacheable(u.pathname, request.method);
    const key = new Request(u.toString(), { method: "GET" });

    if (can) {
      const hit = await caches.default.match(key);
      if (hit) {
        const headers = new Headers(hit.headers);
        Object.entries(cors(origin)).forEach(([k, v]) => headers.set(k, v));
        headers.set("X-Afsana-Cache", "HIT");
        return new Response(hit.body, { status: hit.status, headers });
      }
    }

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("origin");
    headers.set("X-Afsana-Edge", "cloudflare");

    let response;
    try {
      response = await fetch(new Request(upstream.toString(), {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "follow"
      }));
    } catch {
      return json({ success: false, error: { code: "UPSTREAM_UNAVAILABLE" } }, 502, cors(origin));
    }

    const outHeaders = new Headers(response.headers);
    const setCookies = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")] : []);
    if (setCookies.length) {
      outHeaders.delete("set-cookie");
      for (const cookie of setCookies) {
        outHeaders.append("set-cookie", cookie.replace(/;\s*Domain=[^;]+/ig, ""));
      }
    }

    if (!can) {
      outHeaders.set("Cache-Control", "no-store, private");
      outHeaders.delete("CDN-Cache-Control");
      outHeaders.delete("Cloudflare-CDN-Cache-Control");
    }

    const out = new Response(response.body, { status: response.status, headers: outHeaders });
    Object.entries(cors(origin)).forEach(([k, v]) => out.headers.set(k, v));
    out.headers.set("X-Afsana-Backend", "cloudflare-api");
    out.headers.set("X-Afsana-Cache", can ? "MISS" : "BYPASS");
    if (can && response.ok) ctx.waitUntil(caches.default.put(key, out.clone()));
    return out;
  }
};
export { MongoDBConnection };
