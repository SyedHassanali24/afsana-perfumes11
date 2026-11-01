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

const auth = await getJson("/api/auth/me");
if (auth.response.status !== 401) {
  throw new Error(`Staff auth session check returned unexpected HTTP ${auth.response.status}`);
}
console.log("Staff authentication route: responding (401 is expected without a login cookie)");
