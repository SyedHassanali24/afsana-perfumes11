const base = (process.env.AFSANA_BASE_URL || "https://afsana-perfumes11.eastwala12.workers.dev").replace(/\/$/, "");

async function getJson(path) {
  const response = await fetch(new URL(path, base), {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(20000)
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error(`${path}: expected JSON, received HTTP ${response.status}`);
  }
  return { response, data };
}

function findMediaPaths(value, found = new Set()) {
  if (typeof value === "string") {
    const match = value.match(/\/api\/media\/[0-9a-f]{24}/i);
    if (match) found.add(match[0]);
  } else if (Array.isArray(value)) {
    for (const item of value) findMediaPaths(item, found);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) findMediaPaths(item, found);
  }
  return found;
}

const mongo = await getJson("/api/health/mongodb");
if (!mongo.response.ok || mongo.data.connected !== true) {
  throw new Error(`Cloudflare MongoDB health failed (HTTP ${mongo.response.status}, connected=${mongo.data.connected})`);
}
console.log("MongoDB Durable Object: connected");

const health = await getJson("/api/health");
if (health.data.database?.connected !== true) {
  throw new Error(`Application API could not connect to MongoDB (HTTP ${health.response.status})`);
}
console.log(`Application API: connected; database setup=${health.data.database.setupDone ? "ready" : "needs initialization"}`);

const products = await getJson("/api/products?sort=popular&limit=12");
if (!products.response.ok || products.data.success !== true) {
  throw new Error(`Products API failed (HTTP ${products.response.status})`);
}
const productCount = Number(products.data.pagination?.total ?? products.data.products?.length ?? 0);
console.log(`Products API: HTTP ${products.response.status}; catalog products=${productCount}`);

const cms = await getJson("/api/cms/public");
if (!cms.response.ok || cms.data.success !== true) {
  throw new Error(`CMS API failed (HTTP ${cms.response.status})`);
}
console.log(`CMS API: HTTP ${cms.response.status}; public content endpoint is responding`);

const mediaPaths = findMediaPaths([products.data, cms.data]);
for (const path of mediaPaths) {
  // Video checks request only the first 16 bytes; never pull a potentially 250 MB file into CI memory.
  const response = await fetch(new URL(path, base), {
    headers: { Range: "bytes=0-15" },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`Uploaded media ${path} returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!/^(image\/(jpeg|png|webp)|video\/(mp4|webm)|model\/gltf-binary)(;|$)/i.test(contentType)) {
    await response.body?.cancel();
    throw new Error(`Uploaded media ${path} returned unexpected content type: ${contentType}`);
  }

  if (contentType.startsWith("video/")) {
    const contentRange = response.headers.get("content-range") || "";
    if (response.status !== 206 || !/^bytes 0-\d+\/\d+$/i.test(contentRange)) {
      await response.body?.cancel();
      throw new Error(`Uploaded video ${path} does not support byte-range playback (HTTP ${response.status}, cache=${response.headers.get('x-afsana-cache') || 'n/a'}, processor=${response.headers.get('x-afsana-api-processor') || 'n/a'}, content-range=${response.headers.get('content-range') || 'n/a'})`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 16) throw new Error(`Uploaded video ${path} returned an invalid byte-range payload`);
    console.log(`Uploaded video: HTTP 206, ${contentType}, range ${contentRange}`);
    continue;
  }

  // Existing MongoDB image/GLB media does not use the KV video range reader.
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`Uploaded media ${path} returned an empty file`);
  console.log(`Uploaded media: HTTP ${response.status}, ${contentType}, ${bytes.length} bytes`);
}
if (!mediaPaths.size) console.log("No existing public records reference an uploaded /api/media asset yet.");

const auth = await getJson("/api/auth/me");
if (auth.response.status !== 401) {
  throw new Error(`Staff auth session check returned unexpected HTTP ${auth.response.status}`);
}
console.log("Staff authentication route: responding (401 is expected without a login cookie)");
