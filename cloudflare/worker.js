import { MongoDBConnection } from "./MongoDBConnection.js";

const SITE_ORIGIN = "https://afsana-perfumes11.eastwala12.workers.dev";
const API_OBJECT_NAME = "afsana-api-v1";
const SITE_CSP = "default-src 'self'; script-src 'self' https://ajax.googleapis.com 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; media-src 'self' blob: https:; connect-src 'self' https:; frame-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

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
  if (method !== "GET") return false;
  // Media responses support HTTP Range requests. Keep them out of the custom
  // Cache API because a pathname-only cache key can replay a full 200 response
  // for a later byte-range request and break video seeking.
  return /^\/api\/products(?:\/[^/]+)?\/?$/i.test(pathname) ||
    /^\/api\/taxonomy\/public(?:\/|$)/i.test(pathname) ||
    /^\/api\/settings\/public\/?$/i.test(pathname) ||
    /^\/api\/cms\/public\/?$/i.test(pathname) ||
    /^\/api\/reviews\/product\//i.test(pathname);
}


function enforceMediaRange(request, response, pathname) {
  if (request.method !== "GET" || response.status !== 200 ||
      !/^\/api\/media\/[0-9a-f]{24}$/i.test(pathname)) return response;
  const range = request.headers.get("Range");
  if (!range) return response;
  const total = Number(response.headers.get("Content-Length"));
  const match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
  if (!Number.isSafeInteger(total) || total <= 0 || !match || (!match[1] && !match[2])) return response;
  let start = match[1] ? Number(match[1]) : Math.max(0, total - Number(match[2]));
  let end = match[2] && match[1] ? Math.min(total - 1, Number(match[2])) :
    (match[1] ? total - 1 : total - 1);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= total || end < start) {
    const headers = new Headers(response.headers);
    headers.set("Content-Range", "bytes */" + total);
    headers.set("Content-Length", "0");
    return new Response(null, { status: 416, headers });
  }
  const reader = response.body?.getReader();
  if (!reader) return response;
  const headers = new Headers(response.headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Range", "bytes " + start + "-" + end + "/" + total);
  headers.set("Content-Length", String(end - start + 1));
  let position = 0;
  let finished = false;
  const body = new ReadableStream({
    async pull(controller) {
      try {
        while (!finished) {
          const { value, done } = await reader.read();
          if (done) { finished = true; controller.close(); return; }
          const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
          const chunkStart = position;
          const chunkEnd = position + chunk.byteLength - 1;
          position += chunk.byteLength;
          if (chunkEnd < start) continue;
          if (chunkStart > end) {
            finished = true; await reader.cancel(); controller.close(); return;
          }
          const from = Math.max(0, start - chunkStart);
          const to = Math.min(chunk.byteLength, end - chunkStart + 1);
          if (to > from) controller.enqueue(chunk.subarray(from, to));
          if (chunkEnd >= end) {
            finished = true; await reader.cancel();
            controller.close(); return;
          }
        }
      } catch (error) { controller.error(error); }
    },
    async cancel(reason) { finished = true; await reader.cancel(reason); }
  });
  return new Response(body, { status: 206, headers });
}

async function handleApi(request, env, ctx) {
  const incoming = new URL(request.url);
  const isRangedMedia = /^\/api\/media\/[0-9a-f]{24}$/i.test(incoming.pathname) && request.headers.has("Range");
  const canCache = cacheable(incoming.pathname, request.method) && !isRangedMedia;
  const cacheKey = new Request(
    new URL(incoming.pathname + incoming.search, SITE_ORIGIN).toString(),
    { method: "GET" }
  );

  if (canCache) {
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Afsana-Cache", "HIT");
      headers.set("X-Afsana-API-Processor", "cloudflare-durable-object");
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }
  }

  const id = env.MONGODB_CONNECTION.idFromName(API_OBJECT_NAME);
  const stub = env.MONGODB_CONNECTION.get(id);
  const rawApiResponse = await stub.fetch(request);
  const apiResponse = enforceMediaRange(request, rawApiResponse, incoming.pathname);
  const responseHeaders = new Headers(apiResponse.headers);
  responseHeaders.set("X-Afsana-API-Processor", "cloudflare-durable-object");
  responseHeaders.set("X-Afsana-Cache", canCache ? "MISS" : "BYPASS");

  const hasCookie = responseHeaders.has("set-cookie");
  if (canCache && apiResponse.ok && !hasCookie) {
    const cacheHeaders = new Headers(responseHeaders);
    cacheHeaders.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300"
    );
    const cacheResponse = new Response(apiResponse.clone().body, {
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      headers: cacheHeaders
    });
    ctx.waitUntil(caches.default.put(cacheKey, cacheResponse));
  } else if (!canCache) {
    responseHeaders.set("Cache-Control", "no-store, private");
    responseHeaders.delete("CDN-Cache-Control");
    responseHeaders.delete("Cloudflare-CDN-Cache-Control");
  }

  return new Response(apiResponse.body, {
    status: apiResponse.status,
    statusText: apiResponse.statusText,
    headers: responseHeaders
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || SITE_ORIGIN;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        const response = await handleApi(request, env, ctx);
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
    if (url.pathname.startsWith("/assets/")) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (url.pathname === "/" || url.pathname.endsWith(".html")) {
      headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    }
    headers.set("Content-Security-Policy", SITE_CSP);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Afsana-Backend", "cloudflare-assets");
    return new Response(asset.body, { status: asset.status, headers });
  }
};

export { MongoDBConnection };
