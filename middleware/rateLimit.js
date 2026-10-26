// Distributed rate limiting when Upstash Redis is configured; local fallback keeps the API usable if Redis is unavailable.
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

async function hit(key, limit, windowMs, now = Date.now()) {
  if (!REDIS_URL || !REDIS_TOKEN) return localHit(key, limit, windowMs, now);
  const redisKey = `afsana:rl:${key}`;
  try {
    const count = Number(await redisCommand('incr', [redisKey]));
    if (count === 1) await redisCommand('pexpire', [redisKey, Math.max(1000, Math.ceil(windowMs))]);
    return count <= limit;
  } catch (err) {
    console.error('Distributed rate-limit unavailable; using local fallback:', err?.message || err);
    return localHit(key, limit, windowMs, now);
  }
}

module.exports = { hit };