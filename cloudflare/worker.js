import { MongoDBConnection } from "./MongoDBConnection.js";

const SITE_ORIGIN = "https://afsana-perfumes11.eastwala12.workers.dev";
// Keep the PR preview backend aligned with the deployed storefront; use the
// existing main API as a controlled fallback when the preview returns 5xx.
const API_ORIGINS = [
  { url: "https://deploy-preview-7--afsanayaar.netlify.app", name: "netlify-preview-7" },
  { url: "https://afsanayaar.netlify.app", name: "netlify-main" }
];
const SAFE_FALLBACK_POSTS = new Set([
  "/api/auth/login",
  "/api/account/login",
  "/api/cart/quote"
]);
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

function json(data, status, headers = {}) {
  return Response.json(data, { status, headers });
}

function cacheable(pathname, method) {
  if (method !== "GET" && method !== "HEAD") return false;
  return /^\/api\/products(?:\/[^/]+)?\/?$/i.test(pathname) ||
    /^\/api\/taxonomy\/public(?:\/|$)/i.test(pathname) ||
    /^\/api\/settings\/public\/?$/i.test(pathname) ||
    /^\/api\/cms\/public\/?$/i.test(pathname) ||
    /^\/api\/reviews\/product\//i.test(pathname);
}

function safeToFallback(request, pathname) {
  return ["GET", "HEAD"].includes(request.method) ||
    (request.method === "POST" && SAFE_FALLBACK_POSTS.has(pathname));
}

async function requestUpstream(request, pathname, search, upstream) {
  const url = new URL(pathname + search, upstream.url);
  const copy = request.clone();
  const headers = new Headers(copy.headers);

  // The Worker owns browser CORS. The Netlify functions should not reject the
  // workers.dev origin, and the host header must be recalculated per upstream.
  headers.delete("host");
  headers.delete("origin");
  headers.set("X-Afsana-Edge", upstream.name);

  const init = {
    method: copy.method,
    headers,
    redirect: "follow"
  };
  if (!["GET", "HEAD"].includes(copy.method)) init.body = copy.body;

  const response = await fetch(new Request(url.toString(), init));
  return response;
}

async function handleApi(request, ctx) {
  const incoming = new URL(request.url);
  const canCache = cacheable(incoming.pathname, request.method);
  const cacheKey = new Request(
    new URL(incoming.pathname + incoming.search, SITE_ORIGIN).toString(),
    { method: "GET" }
  );

  if (canCache) {
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Afsana-Cache", "HIT");
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }
  }

  const allowFallback = safeToFallback(request, incoming.pathname);
  const candidates = allowFallback ? API_ORIGINS : API_ORIGINS.slice(0, 1);
  let upstreamResponse = null;
  let chosen = null;
  let lastError = null;

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    try {
      upstreamResponse = await requestUpstream(
        request,
        incoming.pathname,
        incoming.search,
        candidate
      );
      chosen = candidate;

      // Only retry safe reads, cart quotes and sign-in requests. Never replay
      // checkout, order creation, registration, or other state-changing calls.
      if (upstreamResponse.status < 500 || i === candidates.length - 1) break;
      console.error("[afsana-upstream-5xx]", candidate.name, upstreamResponse.status, incoming.pathname);
      await upstreamResponse.body?.cancel();
      upstreamResponse = null;
    } catch (error) {
      lastError = error;
      console.error("[afsana-upstream-error]", candidate.name, error?.message || error);
      if (i === candidates.length - 1) break;
    }
  }

  if (!upstreamResponse) {
    return json({
      success: false,
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message: "The AFSANA API is temporarily unavailable."
      }
    }, 502, {
      "X-Afsana-Upstream": chosen?.name || "unavailable",
      "X-Afsana-Upstream-Error": lastError ? "network" : "5xx"
    });
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  const setCookies = typeof upstreamResponse.headers.getSetCookie === "function"
    ? upstreamResponse.headers.getSetCookie()
    : upstreamResponse.headers.get("set-cookie") ? [upstreamResponse.headers.get("set-cookie")] : [];
  if (setCookies.length) {
    responseHeaders.delete("set-cookie");
    for (const cookie of setCookies) {
      responseHeaders.append("set-cookie", cookie.replace(/;\\s*Domain=[^;]+/ig, ""));
    }
  }

  responseHeaders.set("X-Afsana-Upstream", chosen?.name || "unknown");
  responseHeaders.set("X-Afsana-Upstream-Status", String(upstreamResponse.status));
  responseHeaders.set("X-Afsana-Cache", canCache ? "MISS" : "BYPASS");

  if (canCache && upstreamResponse.ok && !setCookies.length) {
    const cacheHeaders = new Headers(responseHeaders);
    cacheHeaders.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
    const cacheResponse = new Response(upstreamResponse.clone().body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: cacheHeaders
    });
    ctx.waitUntil(caches.default.put(cacheKey, cacheResponse));
  } else if (!canCache) {
    responseHeaders.set("Cache-Control", "no-store, private");
    responseHeaders.delete("CDN-Cache-Control");
    responseHeaders.delete("Cloudflare-CDN-Cache-Control");
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders
  });
}

export default {
  async fetch(request, env, ctx) {
    const u = new URL(request.url);
    const origin = request.headers.get("Origin") || SITE_ORIGIN;
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (u.pathname.startsWith("/api/")) {
      try {
        const response = await handleApi(request, ctx);
        const headers = new Headers(response.headers);
        Object.entries(cors(origin)).forEach(([key, value]) => headers.set(key, value));
        headers.set("X-Afsana-Backend", "cloudflare-api");
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      } catch (error) {
        console.error("[cloud-api]", error?.message || error);
        return json({
          success: false,
          error: { code: "INTERNAL", message: "Internal server error." }
        }, 500, cors(origin));
      }
    }

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
};

export { MongoDBConnection };
