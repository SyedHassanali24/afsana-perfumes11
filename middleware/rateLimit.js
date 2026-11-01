// Distributed rate limiting when Upstash Redis is configured. Local memory is only used when Redis is not configured.
// In production, a configured-but-unavailable Redis must fail closed; otherwise each serverless instance could bypass the global limit.
const buckets = new Map();
const REDIS_URL = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const REDIS_TOKEN = String(process.env.UPSTASH_REDIS_REST_TOKEN || '');

function localHit(key, limit, windowMs, now = Date.now()) {
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { count: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.count += 1;
  return b.count <= limit;
}

async function redisCommand(command, args = []) {
  const res = await fetch(`${REDIS_URL}/${encodeURIComponent(command)}/${args.map((v) => encodeURIComponent(String(v))).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const data = await res.json();
  return data.result;
}

async function hit(key, limit, windowMs, now = Date.now(), env) {
  // Cloudflare Worker: use a Durable Object for globally consistent production rate limits.
  if (env?.MONGODB_CONNECTION) {
    try {
      const id = env.MONGODB_CONNECTION.idFromName("afsana-rate-limit-global");
      const stub = env.MONGODB_CONNECTION.get(id);
      return await stub.hitRateLimit(key, limit, windowMs, now);
    } catch (err) {
      console.error("Cloudflare rate-limit Durable Object unavailable:", err?.message || err);
      return false;
    }
  }
  const production = process.env.NODE_ENV === 'production' || process.env.CONTEXT === 'production';
  if (!REDIS_URL || !REDIS_TOKEN) {
    // Production must use a shared limiter. A per-instance map is not a real global
    // limit on serverless infrastructure, so fail closed until Upstash is configured.
    if (production && process.env.RATE_LIMIT_FAIL_OPEN !== 'true') return false;
    return localHit(key, limit, windowMs, now);
  }
  const redisKey = `afsana:rl:${key}`;
  try {
    const count = Number(await redisCommand('incr', [redisKey]));
    if (count === 1) await redisCommand('pexpire', [redisKey, Math.max(1000, Math.ceil(windowMs))]);
    return count <= limit;
  } catch (err) {
    // A configured Redis failure cannot silently downgrade production to per-instance
    // limiting. Keep local fallback available for explicit local/dev configurations only.
    if (String(process.env.NETLIFY_DEV || '').toLowerCase() === 'true' || process.env.RATE_LIMIT_FAIL_OPEN === 'true') {
      console.error('Distributed rate-limit unavailable; using local fallback:', err?.message || err);
      return localHit(key, limit, windowMs, now);
    }
    console.error('Distributed rate-limit unavailable; failing closed:', err?.message || err);
    return false;
  }
}

module.exports = { hit };