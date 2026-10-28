const BACKEND_ORIGIN = "https://afsanaperfume.netlify.app";

function cleanSetCookie(value) {
  return value
    .replace(/;\\s*Domain=[^;]+/ig, "")
    .replace(/;\\s*SameSite=[^;]+/ig, "; SameSite=Lax");
}

export async function onRequest(context) {
  const { request, params } = context;
  const pathParts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const functionPath = pathParts.join("/");
  const target = new URL(
    "/.netlify/functions/" + functionPath,
    BACKEND_ORIGIN
  );
  target.search = new URL(request.url).search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("x-afsana-cloudflare-proxy", "1");

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const responseHeaders = new Headers(upstream.headers);

  const cookies = responseHeaders.getSetCookie?.() || [];
  if (cookies.length) {
    responseHeaders.delete("set-cookie");
    for (const cookie of cookies) {
      responseHeaders.append("set-cookie", cleanSetCookie(cookie));
    }
  } else {
    const singleCookie = responseHeaders.get("set-cookie");
    if (singleCookie) {
      responseHeaders.delete("set-cookie");
      responseHeaders.append("set-cookie", cleanSetCookie(singleCookie));
    }
  }

  responseHeaders.delete("content-encoding");
  responseHeaders.set("cache-control", "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
