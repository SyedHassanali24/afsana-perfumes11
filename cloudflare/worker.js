const SITE_ORIGIN = "https://afsanaperfume.netlify.app";
const API_TTL = 60;
const PAGE_TTL = 120;

function cors(origin) {
  const allowed = origin === SITE_ORIGIN || /^https:\/\/.*\.workers\.dev$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : SITE_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, X-Requested-With, Idempotency-Key, Authorization",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
    "Vary": "Origin",
  };
}

function withHeaders(response, extra = {}) {
  const h = new Headers(response.headers);
  for (const [k,v] of Object.entries(extra)) h.set(k,v);
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers:h});
}

function cacheableApi(path, method) {
  if (method !== "GET" && method !== "HEAD") return false;
  if (/^\/api\/(auth|admin|account|cart|checkout|orders|wishlist|customers)(\/|$)/i.test(path)) return false;
  return true;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:cors(request.headers.get("Origin") || SITE_ORIGIN)});

    const upstream = new URL(SITE_ORIGIN);
    upstream.pathname = url.pathname;
    upstream.search = url.search;

    const origin = request.headers.get("Origin") || "";
    const isApi = url.pathname.startsWith("/api/");
    const cacheKey = new Request(url.toString(), {method:"GET"});
    const canCache = isApi ? cacheableApi(url.pathname, request.method) : ["GET","HEAD"].includes(request.method);
    const cache = caches.default;

    if (canCache) {
      const hit = await cache.match(cacheKey);
      if (hit) return withHeaders(hit, {
        ...cors(origin),
        "X-Afsana-Backend":"cloudflare-edge",
        "X-Afsana-Cache":"HIT",
      });
    }

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("X-Afsana-Edge","cloudflare");
    const upstreamRequest = new Request(upstream.toString(), {
      method: request.method,
      headers,
      body: ["GET","HEAD"].includes(request.method) ? undefined : request.body,
      redirect:"follow",
    });

    let response;
    try {
      response = await fetch(upstreamRequest);
    } catch {
      return new Response(JSON.stringify({success:false,error:{code:"UPSTREAM_UNAVAILABLE",message:"Service temporarily unavailable."}}),{
        status:502,headers:{"Content-Type":"application/json",...cors(origin)}
      });
    }

    const ttl = isApi ? API_TTL : (url.pathname.startsWith("/assets/") ? 31536000 : PAGE_TTL);
    const final = withHeaders(response, {
      ...cors(origin),
      "X-Afsana-Backend":"cloudflare-edge",
      "X-Afsana-Cache": canCache ? "MISS" : "BYPASS",
      "Cache-Control": canCache ? `public, max-age=${ttl}, stale-while-revalidate=${ttl}` : "no-store",
    });

    if (canCache && response.ok) {
      ctx.waitUntil(cache.put(cacheKey, final.clone()));
    }
    return final;
  }
};
