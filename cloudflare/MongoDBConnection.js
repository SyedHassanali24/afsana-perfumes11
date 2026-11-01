import { DurableObject } from "cloudflare:workers";
import { dbHealth } from "./mongodb.js";

export class MongoDBConnection extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.env = env;
  }

  async hitRateLimit(key, limit, windowMs, now = Date.now()) {
    const bucketKey = String(key || "").slice(0, 512);
    if (!bucketKey) return false;
    const safeLimit = Math.max(1, Math.floor(Number(limit) || 1));
    const safeWindow = Math.max(1000, Math.floor(Number(windowMs) || 60000));
    const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const sql = this.ctx.storage.sql;
    sql.exec("CREATE TABLE IF NOT EXISTS afsana_rate_limits (bucket_key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)");
    const row = sql.exec(
      `INSERT INTO afsana_rate_limits (bucket_key, count, reset_at)
       VALUES (?1, 1, ?2)
       ON CONFLICT(bucket_key) DO UPDATE SET
         count = CASE WHEN afsana_rate_limits.reset_at <= ?3 THEN 1 ELSE afsana_rate_limits.count + 1 END,
         reset_at = CASE WHEN afsana_rate_limits.reset_at <= ?3 THEN ?2 ELSE afsana_rate_limits.reset_at END
       RETURNING count`,
      bucketKey, timestamp + safeWindow, timestamp
    ).one();
    if (timestamp % 300000 < 1000) sql.exec("DELETE FROM afsana_rate_limits WHERE reset_at <= ?", timestamp);
    return Number(row.count) <= safeLimit;
  }

  async health() {
    return dbHealth(this.env);
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      try {
        return Response.json({ success: true, service: "mongodb", ...(await this.health()) });
      } catch {
        return Response.json({ success: false, service: "mongodb", connected: false }, { status: 503 });
      }
    }
    return new Response("Not Found", { status: 404 });
  }
}
