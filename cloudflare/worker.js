// Hassan storefront visual baseline redeploy sync
import { MongoDBConnection } from "./MongoDBConnection.js";
import { corsHeaders, securityHeaders } from "./security.js";
import { buildProductSitemapXml } from "./product-sitemap.js";

const SITE_ORIGIN = "https://afsanaperfumes.store";
const WORKER_ORIGIN = "https://afsana-perfumes11.eastwala12.workers.dev";
const PRODUCT_SITEMAP_PATH = "/api/seo/products-sitemap.xml";

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

function mongoStub(env) {
  const id = env.MONGODB_CONNECTION.idFromName("afsana-mongodb");
  return env.MONGODB_CONNECTION.get(id, { locationHint: "me" });
}

async function health(env) {
  return mongoStub(env).health();
}

function addCors(headers, origin) {
  Object.entries(securityHeaders(cors(origin))).forEach(([key, value]) => headers.set(key, value));
  return headers;
}

async function productSitemapResponse(env, ctx) {
  const cacheKey = new Request(`${SITE_ORIGIN}${PRODUCT_SITEMAP_PATH}`, { method: "GET" });
  let cache = null;

  try {
    if (typeof caches !== "undefined" && caches.default) {
      cache = caches.default;
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    }
  } catch {
    // A cache miss or cache API issue must not prevent the public sitemap from being served.
  }

  const products = await mongoStub(env).publicProductSitemapEntries();
  const xml = buildProductSitemapXml(products);
  const response = new Response(xml, {
    status: 200,
    headers: securityHeaders({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Afsana-Backend": "cloudflare-product-sitemap"
    })
  });

  try {
    if (cache) {
      const cacheWrite = cache.put(cacheKey, response.clone());
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(cacheWrite);
      else await cacheWrite;
    }
  } catch {
    // Sitemap generation remains successful even if edge caching is unavailable.
  }

  return response;
}


export default {
  async fetch(request, env, ctx) {
    const u = new URL(request.url);
    // Redirect plaintext requests to the same HTTPS URL before API, webhook,
    // or asset handling. Cloudflare's edge terminates TLS for this Worker.
    if (u.protocol === "http:") {
      u.protocol = "https:";
      return Response.redirect(u.toString(), 301);
    }
    const origin = request.headers.get("Origin") || SITE_ORIGIN;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: securityHeaders({ ...cors(origin), "Cache-Control": "no-store" }) });

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
        return new Response("Forbidden", { status: 403, headers: securityHeaders({ "Cache-Control": "no-store" }) });
      }
      if (request.method === "POST") {
        const rawBody = await request.text();
        const signature = request.headers.get("X-Hub-Signature-256") || "";
        if (!await verifyMetaSignature(rawBody, signature, env.META_APP_SECRET)) {
          return json({ success: false, error: "INVALID_WEBHOOK_SIGNATURE" }, 401, { "Cache-Control": "no-store" });
        }
        let payload;
        try { payload = JSON.parse(rawBody); }
        catch { return json({ success: false, error: "INVALID_JSON" }, 400, { "Cache-Control": "no-store" }); }
        try {
          await mongoStub(env).storeWhatsAppWebhook(payload);
          return json({ success: true, received: true }, 200, { "Cache-Control": "no-store" });
        } catch {
          return json({ success: false, error: "WEBHOOK_STORAGE_UNAVAILABLE" }, 503, { "Cache-Control": "no-store" });
        }
      }
      return new Response("Method Not Allowed", { status: 405, headers: securityHeaders({ Allow: "GET, POST", "Cache-Control": "no-store" }) });
    }

    if (u.pathname === PRODUCT_SITEMAP_PATH) {
      if (!["GET", "HEAD"].includes(request.method)) {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: securityHeaders({ Allow: "GET, HEAD", "Cache-Control": "no-store" })
        });
      }
      try {
        const sitemap = await productSitemapResponse(env, ctx);
        return request.method === "HEAD"
          ? new Response(null, { status: sitemap.status, headers: sitemap.headers })
          : sitemap;
      } catch (error) {
        console.error("[afsana-sitemap] product sitemap unavailable:", error?.message || error);
        return new Response("Product sitemap temporarily unavailable.", {
          status: 503,
          headers: securityHeaders({
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Afsana-Backend": "cloudflare-product-sitemap"
          })
        });
      }
    }

    if (u.pathname.startsWith("/api/")) {
      try {
        // Run every API route inside the MongoDB Durable Object. Cloudflare Workers
        // cannot safely reuse a MongoDB TCP socket across unrelated request contexts.
        const response = await mongoStub(env).fetch(request);
        const headers = new Headers(response.headers);
        const policy = headers.get("Cache-Control") || "";
        const vary = headers.get("Vary") || "";
        const publicCacheable = request.method === "GET"
          && response.status === 200
          && /\bpublic\b/i.test(policy)
          && !/\b(?:private|no-store)\b/i.test(policy)
          && !headers.has("Set-Cookie")
          && vary.trim() !== "*";

        // Workers Cache is enabled in wrangler.toml. Preserve cache policy only for
        // explicitly public GET routes; keep every admin/authenticated API private.
        if (publicCacheable) {
          const varyValues = new Set(vary.split(",").map((value) => value.trim()).filter(Boolean));
          varyValues.add("Origin");
          headers.set("Vary", [...varyValues].join(", "));
          headers.set("X-Afsana-Cache-Policy", "public");
        } else {
          headers.set("Cache-Control", "no-store, private");
          headers.set("X-Afsana-Cache-Policy", "private");
        }
        headers.set("X-Afsana-Backend", "cloudflare-mongodb-api");
        addCors(headers, origin);
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: securityHeaders(Object.fromEntries(headers.entries())),
        });
      } catch (error) {
        console.error("[afsana-api] request failed:", error?.message || error);
        return json({ success: false, error: { code: "INTERNAL", message: "Backend request failed." } }, 500,
          { ...cors(origin), "Cache-Control": "no-store", "X-Afsana-Backend": "cloudflare-mongodb-api" });
      }
    }

    const asset = await env.ASSETS.fetch(request);
    const headers = new Headers(asset.headers);
    const contentType = headers.get("Content-Type") || "";

    // A missing hashed Vite asset must never fall through to SPA index.html.
    // Browsers then receive a real 404 instead of a misleading HTML MIME response.
    if (u.pathname.startsWith("/assets/") && contentType.toLowerCase().includes("text/html")) {
      return new Response("Asset not found", {
        status: 404,
        headers: securityHeaders({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Afsana-Backend": "cloudflare-assets" }),
      });
    }

    // Do not let browsers/CDNs keep an old index.html pointing at removed hashed chunks.
    if (contentType.toLowerCase().includes("text/html")) {
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");
    } else if (u.pathname.startsWith("/assets/")) {
      // Vite assets are content-hashed, so they can safely stay in browser and edge caches.
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Expires", new Date(Date.now() + 31536000000).toUTCString());
    } else if (
      /^(image|font|audio|video)\//i.test(contentType) ||
      /\.(?:ico|svg|png|jpe?g|webp|avif|woff2?|ttf|otf|webmanifest|xml|txt)$/i.test(u.pathname)
    ) {
      // Stable public files (favicon, manifest, fonts and root-level media) need an
      // explicit browser TTL. Keep this shorter than hashed assets so brand files
      // can be refreshed without waiting a full year.
      headers.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
      headers.set("Expires", new Date(Date.now() + 604800000).toUTCString());
    }
    headers.set("X-Afsana-Backend", "cloudflare-assets");
    return new Response(asset.body, { status: asset.status, headers: securityHeaders(Object.fromEntries(headers.entries())) });
  }
};
export { MongoDBConnection };
