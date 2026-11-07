import { MongoDBConnection } from "./MongoDBConnection.js";
import { connectMongo } from "./mongodb.js";
import { corsHeaders, securityHeaders, isValidNewsletterEmail, newsletterRateLimitExceeded } from "./security.js";

// deploy-sync-2026-10-28
const SITE_ORIGIN = "https://afsana-perfumes11.eastwala12.workers.dev";
const API_ORIGIN = "https://afsanayaar.netlify.app";
const API_PREFIX = "/api";

function json(data, status, headers = {}) { return Response.json(data, { status, headers: { ...securityHeaders(), ...headers } }); }
function cacheable(pathname, method) {
  if (method !== "GET" && method !== "HEAD") return false;
  return /^\/api\/products(?:\/[^/]+)?\/?$/i.test(pathname) ||
    /^\/api\/taxonomy\/public\//i.test(pathname) ||
    /^\/api\/settings\/public\/?$/i.test(pathname) ||
    /^\/api\/cms\/public\/?$/i.test(pathname) ||
    /^\/api\/reviews\/product\//i.test(pathname);
}

async function verifyMetaSignature(rawBody, signature, appSecret) {
  if (!appSecret || !signature || !signature.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = "sha256=" + Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

async function health(env) {
  const id = env.MONGODB_CONNECTION.idFromName("afsana-mongodb");
  return env.MONGODB_CONNECTION.get(id, { locationHint: "me" }).health();
}

export default {
  async fetch(request, env, ctx) {
    const u = new URL(request.url);
    const origin = request.headers.get("Origin") || SITE_ORIGIN;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...securityHeaders(), ...corsHeaders(origin, env, u.origin) } });

    // Cloudflare-native newsletter capture: never stores addresses in browser localStorage.
    if (u.pathname === "/api/newsletter/subscribe" && request.method === "POST") {
      const headers = { ...cors(origin, env, u.origin), "Cache-Control": "no-store", "X-Afsana-Backend": "cloudflare-mongodb" };
      if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
        return json({ success: false, error: { code: "INVALID_CONTENT_TYPE", message: "Send JSON data." } }, 415, headers);
      }
      let body;
      try { body = await request.json(); }
      catch { return json({ success: false, error: { code: "INVALID_JSON", message: "Invalid request body." } }, 400, headers); }
      const email = String(body?.email || "").trim().toLowerCase();
      const consent = body?.consent === true;
      const honeypot = String(body?.website || "").trim();
      if (honeypot) return json({ success: true, received: true }, 202, headers);
      if (!/^[^\s@]{1,64}@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) || email.length > 254 || !consent) {
        return json({ success: false, error: { code: "INVALID_SUBSCRIPTION", message: "Enter a valid email and confirm your consent." } }, 400, headers);
      }
      try {
        const db = await connectMongo(env);
        const collection = db.collection("newsletter_subscribers");
        const rateLimits = db.collection("newsletter_rate_limits");
        await Promise.all([
          collection.createIndex({ email: 1 }, { unique: true }),
          rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
        ]);
        const now = new Date();
        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip)));
        const rateKey = Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
        const rate = await rateLimits.findOneAndUpdate(
          { _id: rateKey },
          { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + 60 * 60 * 1000) } },
          { upsert: true, returnDocument: "after" }
        );
        if (newsletterRateLimitExceeded(rate?.value || rate)) {
          return json({ success: false, error: { code: "RATE_LIMITED", message: "Too many attempts. Please try again later." } }, 429, headers);
        }
        const result = await collection.updateOne(
          { email },
          { $setOnInsert: { email, status: "subscribed", consentAt: now, source: "storefront", createdAt: now } },
          { upsert: true }
        );
        return json({ success: true, subscribed: true, alreadySubscribed: result.matchedCount > 0 }, 200, headers);
      } catch {
        return json({ success: false, error: { code: "SUBSCRIPTION_UNAVAILABLE", message: "We could not save your request. Please try again later." } }, 503, headers);
      }
    }

    if (u.pathname === "/api/health/mongodb" && request.method === "GET") {
      try {
        return json({ success: true, service: "mongodb", ...(await health(env)) }, 200,
          { ...cors(origin, env, u.origin), "Cache-Control": "no-store", "X-Afsana-Backend": "cloudflare-mongodb" });
      } catch {
        return json({ success: false, service: "mongodb", connected: false }, 503,
          { ...cors(origin, env, u.origin), "Cache-Control": "no-store", "X-Afsana-Backend": "cloudflare-mongodb" });
      }
    }


    // Meta WhatsApp Cloud API webhook: verification handshake and signed event intake.
    if (u.pathname === "/api/whatsapp/webhook") {
      if (request.method === "GET") {
        const mode = u.searchParams.get("hub.mode");
        const token = u.searchParams.get("hub.verify_token");
        const challenge = u.searchParams.get("hub.challenge");
        if (mode === "subscribe" && env.WHATSAPP_VERIFY_TOKEN && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
          return new Response(challenge, { status: 200, headers: { ...securityHeaders(), "Content-Type": "text/plain", "Cache-Control": "no-store" } });
        }
        return new Response("Forbidden", { status: 403, headers: securityHeaders() });
      }
      if (request.method === "POST") {
        const rawBody = await request.text();
        const signature = request.headers.get("X-Hub-Signature-256") || "";
        if (!await verifyMetaSignature(rawBody, signature, env.META_APP_SECRET)) {
          return json({ success: false, error: "INVALID_WEBHOOK_SIGNATURE" }, 401, { "Cache-Control": "no-store" });
        }
        let payload;
        try { payload = JSON.parse(rawBody); }
        catch { return json({ success: false, error: "INVALID_JSON" }, 400); }
        try {
          const db = await connectMongo(env);
          await db.collection("whatsapp_webhook_events").insertOne({
            payload,
            receivedAt: new Date(),
            signatureVerified: true
          });
          return json({ success: true, received: true }, 200, { "Cache-Control": "no-store" });
        } catch {
          return json({ success: false, error: "WEBHOOK_STORAGE_UNAVAILABLE" }, 503, { "Cache-Control": "no-store" });
        }
      }
      return new Response("Method Not Allowed", { status: 405, headers: { ...securityHeaders(), Allow: "GET, POST" } });
    }

    if (!u.pathname.startsWith("/api/")) {
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      Object.entries(securityHeaders()).forEach(([k, v]) => headers.set(k, v));
      // Vite asset filenames are content-hashed: keep them in browser + edge cache for a year.
      // The SPA shell is refreshed frequently so new releases become visible quickly.
      if (u.pathname.startsWith("/assets/")) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      } else if (u.pathname === "/" || u.pathname.endsWith(".html")) {
        headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      }
      headers.set("X-Afsana-Backend", "cloudflare-assets");
      return new Response(asset.body, { status: asset.status, headers });
    }

    // Use the tested public Netlify /api rewrite instead of calling the
    // internal /.netlify/functions path directly. This keeps Netlify's
    // production function routing and auth cookie handling intact.
    const upstream = new URL(API_ORIGIN);
    upstream.pathname = `${API_PREFIX}${u.pathname.slice(4)}`;
    upstream.search = u.search;

    const can = cacheable(u.pathname, request.method);
    const key = new Request(u.toString(), { method: "GET" });

    if (can) {
      const hit = await caches.default.match(key);
      if (hit) {
        const headers = new Headers(hit.headers);
        Object.entries(securityHeaders()).forEach(([k, v]) => headers.set(k, v));
        Object.entries(cors(origin, env, u.origin)).forEach(([k, v]) => headers.set(k, v));
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
      return json({ success: false, error: { code: "UPSTREAM_UNAVAILABLE" } }, 502, cors(origin, env, u.origin));
    }

    const outHeaders = new Headers(response.headers);
    Object.entries(securityHeaders()).forEach(([k, v]) => outHeaders.set(k, v));
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
    Object.entries(cors(origin, env, u.origin)).forEach(([k, v]) => out.headers.set(k, v));
    out.headers.set("X-Afsana-Backend", "cloudflare-api");
    out.headers.set("X-Afsana-Cache", can ? "MISS" : "BYPASS");
    if (can && response.ok) ctx.waitUntil(caches.default.put(key, out.clone()));
    return out;
  }
};
export { MongoDBConnection };