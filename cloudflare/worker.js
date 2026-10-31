const SITE_ORIGIN = "https://afsana-perfumes11.eastwala12.workers.dev";
const API_ORIGIN = "https://afsanayaar.netlify.app";
const SITE_CSP = "default-src 'self'; script-src 'self' https://ajax.googleapis.com 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; media-src 'self' blob: https:; connect-src 'self' https:; frame-src 'self' https://app.netlify.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

function cors(origin) {
  const allowed = origin === SITE_ORIGIN || /^https:\/\/[^/]+\.workers\.dev$/.test(origin);
  return {"Access-Control-Allow-Origin": allowed ? origin : SITE_ORIGIN,"Access-Control-Allow-Credentials":"true","Access-Control-Allow-Headers":"Content-Type, X-Requested-With, Idempotency-Key, Authorization","Access-Control-Allow-Methods":"GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS","Vary":"Origin"};
}
function json(data,status,headers={}) { return Response.json(data,{status,headers}); }
function cacheable(pathname,method) {
  if (method !== "GET" && method !== "HEAD") return false;
  return /^\/api\/products(?:\/[^/]+)?\/?$/i.test(pathname) || /^\/api\/taxonomy\/public\//i.test(pathname) || /^\/api\/settings\/public\/?$/i.test(pathname) || /^\/api\/cms\/public\/?$/i.test(pathname) || /^\/api\/reviews\/product\//i.test(pathname);
}
async function handleApi(request) {
  const incoming=new URL(request.url);
  const upstreamUrl=new URL(incoming.pathname+incoming.search,API_ORIGIN);
  const headers=new Headers(request.headers);
  headers.delete("host"); headers.delete("origin"); headers.set("X-Afsana-Edge","cloudflare");
  let upstream;
  try {
    upstream=await fetch(new Request(upstreamUrl.toString(),{method:request.method,headers,body:["GET","HEAD"].includes(request.method)?undefined:request.body,redirect:"follow"}));
  } catch(error) {
    console.error("[afsana-upstream]",error?.message||error);
    return json({success:false,error:{code:"UPSTREAM_UNAVAILABLE",message:"The AFSANA API is temporarily unavailable."}},502);
  }
  const responseHeaders=new Headers(upstream.headers);
  const setCookies=typeof upstream.headers.getSetCookie==="function"?upstream.headers.getSetCookie():upstream.headers.get("set-cookie")?[upstream.headers.get("set-cookie")]:[];
  if(setCookies.length){responseHeaders.delete("set-cookie");for(const cookie of setCookies)responseHeaders.append("set-cookie",cookie.replace(/;\s*Domain=[^;]+/ig,""));}
  if(cacheable(incoming.pathname,request.method)&&upstream.ok) responseHeaders.set("Cache-Control","public, s-maxage=60, stale-while-revalidate=300");
  return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers:responseHeaders});
}
export default {
  async fetch(request,env) {
    const u=new URL(request.url), origin=request.headers.get("Origin")||SITE_ORIGIN;
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors(origin)});
    if(u.pathname.startsWith("/api/")){
      try{
        const response=await handleApi(request),headers=new Headers(response.headers);
        Object.entries(cors(origin)).forEach(([k,v])=>headers.set(k,v));
        headers.set("X-Afsana-Backend","cloudflare-netlify-bridge");
        return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
      }catch(error){return json({success:false,error:{code:"INTERNAL",message:"Internal server error."}},500,cors(origin));}
    }
    const asset=await env.ASSETS.fetch(request),headers=new Headers(asset.headers);
    if(u.pathname.startsWith("/assets/")||/\.(?:js|css|woff2?|png|jpe?g|webp|avif|svg|ico)$/i.test(u.pathname)) headers.set("Cache-Control","public, max-age=31536000, immutable");
    else if(u.pathname==="/"||u.pathname.endsWith(".html")) headers.set("Cache-Control","public, max-age=60, stale-while-revalidate=300");
    headers.set("Content-Security-Policy",SITE_CSP); headers.set("X-Content-Type-Options","nosniff"); headers.set("X-Afsana-Backend","cloudflare-assets");
    return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
  }
};