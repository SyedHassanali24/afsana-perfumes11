import { MongoDBConnection } from "./MongoDBConnection.js";
import { connectMongo } from "./mongodb.js";
import { corsHeaders, securityHeaders } from "./security.js";
import { onRequest as handleApiRequest } from "./api-router.js";

const SITE_ORIGIN = "https://afsanaperfumes.store";
const WORKER_ORIGIN = "https://afsana-perfumes11.eastwala12.workers.dev";

function cors(origin) {
  return corsHeaders(origin, SITE_ORIGIN);
}
function json(data, status, headers = {}) {
  return Response.json(data, { status, headers: securityHeaders(headers) });
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

function addCors(headers, origin) {
  Object.entries(securityHeaders(cors(origin))).forEach(([key, value]) => headers.set(key, value));
  return headers;
}

export default {
  async fetch(request, env, ctx) {
    const u = new URL(request.url);
    const origin = request.headers.get("Origin") || SITE_ORIGIN;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: securityHeaders(cors(origin)) });

    if (u.pathname === "/api/health/mongodb" && request.method === "GET") {
      try {
        return json({ success: true, service: "mongodb", ...(await health(env)) }, 200,
          { ...cors(origin), "Cache-Control": "no-store", "X-Afsana-Backend": "cloudflare-mongodb" });
      } catch {
        return json({ success: false, service: "mongodb", connected: false }, 503,
          { ...cors(origin), "Cache-Control": "no-store", "X-Afsana-Backend": "cloudflare-mongodb" });
      }
    }

    // Meta WhatsApp webhook remains on the dedicated Cloudflare route.
    if (u.pathname === "/api/whatsapp/webhook") {
      if (request.method === "GET") {
        const mode = u.searchParams.get("hub.mode");
        const token = u.searchParams.get("hub.verify_token");
        const challenge = u.searchParams.get("hub.challenge");
        if (mode === "subscribe" && env.WHATSAPP_VERIFY_TOKEN && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
          return new Response(challenge, { status: 200, headers: securityHeaders({ "Content-Type": "text/plain", "Cache-Control": "no-store" }) });
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
      return new Response("Method Not Allowed", { status: 405, headers: securityHeaders({ Allow: "GET, POST" }) });
    }

    if (u.pathname.startsWith("/api/")) {
      const path = u.pathname.slice("/api/".length).split("/").filter(Boolean);
      try {
        const response = await handleApiRequest({ request, params: { path }, env });
        const headers = new Headers(response.headers);
        // Keep API reads fresh during restoration; no old proxy/cache responses.
        headers.set("Cache-Control", "no-store, private");
        headers.set("X-Afsana-Backend", "cloudflare-mongodb-api");
        addCors(headers, origin);
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers: securityHeaders(Object.fromEntries(headers.entries())) });
      } catch (error) {
        console.error("[afsana-api] request failed:", error?.message || error);
        return json({ success: false, error: { code: "INTERNAL", message: "Backend request failed." } }, 500,
          { ...cors(origin), "Cache-Control": "no-store", "X-Afsana-Backend": "cloudflare-mongodb-api" });
      }
    }

    const asset = await env.ASSETS.fetch(request);
    const headers = new Headers(asset.headers);
    if (u.pathname.startsWith("/assets/")) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (u.pathname === "/" || u.pathname.endsWith(".html")) {
      headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    }
    headers.set("X-Afsana-Backend", "cloudflare-assets");
    return new Response(asset.body, { status: asset.status, headers: securityHeaders(Object.fromEntries(headers.entries())) });
  }
};
export { MongoDBConnection };
