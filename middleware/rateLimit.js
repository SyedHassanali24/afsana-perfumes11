// Durable, per-Worker rate limiting. Cloudflare's SQLite-backed Durable Object storage
// is used in production so counters survive isolate restarts and deployments without Redis.
const crypto = require('crypto');
const buckets = new Map();
const REDIS_URL = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const REDIS_TOKEN = String(process.env.UPSTASH_REDIS_REST_TOKEN || '');
let lastCleanupMinute = 0;

function localHit(key, limit, windowMs, now = Date.now()) {
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { count: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.count += 1;
  return b.count <= limit;
}

function durableSqlHit(storage, key, limit, windowMs, now = Date.now()) {
  const sql = storage?.sql;
  if (!sql || typeof sql.exec !== 'function') return null;
  try {
    // Ensure each Durable Object instance has its own SQLite table; module globals
    // can be shared by multiple objects in an isolate, while their storage is not.
    sql.exec(`
      CREATE TABLE IF NOT EXISTS afsana_rate_limits (
        bucket_key TEXT PRIMARY KEY,
        hit_count INTEGER NOT NULL,
        reset_at INTEGER NOT NULL
      )
    `);

    // Store only a one-way digest of the endpoint/IP key, never a raw IP address.
    const bucketKey = crypto.createHash('sha256').update(String(key)).digest('hex');
    const minute = Math.floor(now / 60000);
    if (minute !== lastCleanupMinute) {
      // Retain a one-day diagnostic window, then compact expired buckets.
      sql.exec('DELETE FROM afsana_rate_limits WHERE reset_at < ?', now - 86400000);
      lastCleanupMinute = minute;
    }

    // A single SQLite UPSERT makes the increment + window rollover atomic.
    const row = sql.exec(`
      INSERT INTO afsana_rate_limits (bucket_key, hit_count, reset_at)
      VALUES (?, 1, ?)
      ON CONFLICT(bucket_key) DO UPDATE SET
        hit_count = CASE
          WHEN afsana_rate_limits.reset_at <= ? THEN 1
          ELSE afsana_rate_limits.hit_count + 1
        END,
        reset_at = CASE
          WHEN afsana_rate_limits.reset_at <= ? THEN excluded.reset_at
          ELSE afsana_rate_limits.reset_at
        END
      RETURNING hit_count
    `, bucketKey, now + Math.max(1000, Math.ceil(windowMs)), now, now).toArray()[0];

    if (!row || !Number.isFinite(Number(row.hit_count))) throw new Error('Durable rate-limit write returned no counter.');
    return Number(row.hit_count) <= limit;
  } catch (error) {
    // Never fall back to isolate memory when durable storage was available but failed.
    console.error('Durable rate-limit unavailable; failing closed:', error?.message || error);
    return false;
  }
}

async function redisCommand(command, args = []) {
  const res = await fetch(`${REDIS_URL}/${encodeURIComponent(command)}/${args.map((v) => encodeURIComponent(String(v))).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const data = await res.json();
  return data.result;
}

async function hit(key, limit, windowMs, now = Date.now(), storage = null) {
  const durableResult = durableSqlHit(storage, key, limit, windowMs, now);
  if (durableResult !== null) return durableResult;

  if (!REDIS_URL || !REDIS_TOKEN) {
    // Only local/dev runtimes may use memory. Production without a shared store fails closed.
    const production = process.env.NODE_ENV === 'production' || process.env.CONTEXT === 'production';
    if (production && process.env.RATE_LIMIT_FAIL_OPEN !== 'true') return false;
    return localHit(key, limit, windowMs, now);
  }
  const redisKey = `afsana:rl:${crypto.createHash('sha256').update(String(key)).digest('hex')}`;
  try {
    const count = Number(await redisCommand('incr', [redisKey]));
    if (count === 1) await redisCommand('pexpire', [redisKey, Math.max(1000, Math.ceil(windowMs))]);
    return count <= limit;
  } catch (err) {
    if (String(process.env.NETLIFY_DEV || '').toLowerCase() === 'true' || process.env.RATE_LIMIT_FAIL_OPEN === 'true') {
      console.error('Distributed rate-limit unavailable; using local fallback:', err?.message || err);
      return localHit(key, limit, windowMs, now);
    }
    console.error('Distributed rate-limit unavailable; failing closed:', err?.message || err);
    return false;
  }
}

module.exports = { hit };
