import { DurableObject } from "cloudflare:workers";
import { dbHealth } from "./mongodb.js";
import { dispatchApiRequest } from "./api-router.js";

export class MongoDBConnection extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.env = env;
  }

  async health() {
    return dbHealth(this.env);
  }

  rateLimit = async (key, limit, windowMs, now = Date.now()) => {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(key))));
    const storageKey = "rate:" + Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
    return this.ctx.storage.transaction(async transaction => {
      const current = await transaction.get(storageKey);
      const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };
      bucket.count += 1;
      await transaction.put(storageKey, bucket, { expirationTtl: Math.max(1, Math.ceil(windowMs / 1000) + 5) });
      return bucket.count <= limit;
    });
  };

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      try {
        return Response.json({ success: true, service: "mongodb", ...(await this.health()) });
      } catch {
        return Response.json({ success: false, service: "mongodb", connected: false }, { status: 503 });
      }
    }
    if (!url.pathname.startsWith("/api/")) return new Response("Not Found", { status: 404 });
    // All API requests share one durable MongoDB connection and one durable rate-limit store.
    globalThis.__AFSANA_RATE_LIMITER__ = this.rateLimit;
    try {
      return await dispatchApiRequest(request);
    } finally {
      globalThis.__AFSANA_RATE_LIMITER__ = this.rateLimit;
    }
  }
}
