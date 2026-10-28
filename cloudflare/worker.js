import { MongoDBConnection } from "./MongoDBConnection.js";

const SITE_ORIGIN = "https://afsana-perfumes11.eastwala12.workers.dev";
const API_ORIGIN = "https://afsanaperfume.netlify.app/.netlify/functions";
const API_TTL = 60;

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
  return (method === "GET" || method === "HEAD") &&
    !/^\/api\/(auth|admin|account|cart|checkout|orders|wishlist|customers)(\/|$)/i.test(pathname);
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

    // Website HTML/CSS/JS/images now come directly from Cloudflare Workers Static Assets.
    if (!u.pathname.startsWith("/api/")) {
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      headers.set("X-Afsana-Backend", "cloudflare-assets");
      return new Response(asset.body, { status: asset.status, headers });
    }

    // API remains available through the Cloudflare edge while backend migration continues.
    const upstream = new URL(API_ORIGIN);
    const apiPath = u.pathname.replace(/^\/api\//, "/");
    upstream.pathname = apiPath;
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

    const out = new Response(response.body, { status: response.status, headers: new Headers(response.headers) });
    Object.entries(cors(origin)).forEach(([k, v]) => out.headers.set(k, v));
    out.headers.set("X-Afsana-Backend", "cloudflare-api");
    out.headers.set("X-Afsana-Cache", can ? "MISS" : "BYPASS");
    if (can && response.ok) ctx.waitUntil(caches.default.put(key, out.clone()));
    return out;
  }
};
export { MongoDBConnection };