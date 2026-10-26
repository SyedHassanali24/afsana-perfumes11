// Best-effort per-container limiter (each warm Netlify Function instance keeps its own counters).
// Good enough to blunt brute force in early production; move to a shared store (e.g. Upstash Redis) before heavy traffic.
const buckets = new Map();
function hit(key, limit, windowMs, now = Date.now()) {
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { count: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.count += 1;
  return b.count <= limit;
}
module.exports = { hit };
