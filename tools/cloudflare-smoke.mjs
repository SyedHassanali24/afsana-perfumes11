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
  throw new Error(`Application health could not connect to MongoDB (HTTP ${health.response.status})`);
}
console.log(`Application API: connected; database setup=${health.data.database.setupDone ? "ready" : "needs initialization"}`);

for (const path of ["/api/products?limit=1", "/api/cms/public"]) {
  const result = await getJson(path);
  if (!result.response.ok || result.data.success !== true) {
    throw new Error(`${path} failed (HTTP ${result.response.status})`);
  }
  console.log(`${path}: HTTP ${result.response.status}, API success`);
}
