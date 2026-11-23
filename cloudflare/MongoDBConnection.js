import { DurableObject } from "cloudflare:workers";
import { onRequest as handleApiRequest } from "./api-router.js";
import { connectMongo, dbHealth } from "./mongodb.js";
import {
  readPublicApiCache,
  writePublicApiCache,
  clearPublicApiCache
} from "./public-api-cache.js";

export class MongoDBConnection extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.state = state;
    this.env = env;
  }

  async health() {
    return dbHealth(this.env);
  }

  async publicProductSitemapEntries() {
    const db = await connectMongo(this.env);
    return db.collection("products")
      .find(
        { status: "Active", isDeleted: false },
        { projection: { _id: 0, slug: 1, updatedAt: 1 } }
      )
      .sort({ slug: 1 })
      .limit(50000)
      .toArray();
  }

  async storeWhatsAppWebhook(payload) {
    const db = await connectMongo(this.env);
    await db.collection("whatsapp_webhook_events").insertOne({
      payload,
      receivedAt: new Date(),
      signatureVerified: true
    });
    return { stored: true };
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      try {
        return Response.json({ success: true, service: "mongodb", ...(await this.health()) });
      } catch (error) {
        console.error("[afsana-mongodb] health check failed:", error?.message || error);
        return Response.json({ success: false, service: "mongodb", connected: false }, { status: 503 });
      }
    }

    if (url.pathname.startsWith("/api/")) {
      const path = url.pathname.slice("/api/".length).split("/").filter(Boolean);
      const isRead = request.method === "GET" || request.method === "HEAD";
      try {
        // Small, explicitly-public storefront reads are persisted inside this
        // Durable Object so subsequent visitors do not wait on another MongoDB read.
        if (isRead) {
          try {
            const cached = await readPublicApiCache(this.state.storage, request);
            if (cached) return cached;
          } catch (cacheError) {
            console.warn("[afsana-cache] public read cache unavailable:", cacheError?.message || cacheError);
          }
        }

        // All API handlers, Mongoose models, and DB queries execute in this
        // Durable Object. This keeps MongoDB's TCP client within one actor context.
        const response = await handleApiRequest({
          request,
          params: { path },
          env: this.env,
          ctx: this.state
        });

        if (!isRead && response.status >= 200 && response.status < 300) {
          // Successful writes can affect CMS, products, settings, or related public data.
          // Clear the small public cache set before returning the write confirmation.
          try {
            await clearPublicApiCache(this.state.storage);
          } catch (cacheError) {
            console.warn("[afsana-cache] public cache invalidation skipped:", cacheError?.message || cacheError);
          }
        } else if (isRead && response.status === 200) {
          try {
            await writePublicApiCache(this.state.storage, request, response);
          } catch (cacheError) {
            console.warn("[afsana-cache] public response cache write skipped:", cacheError?.message || cacheError);
          }
        }

        return response;
      } catch (error) {
        console.error("[afsana-mongodb] API dispatch failed:", error?.message || error);
        return Response.json({
          success: false,
          error: { code: "INTERNAL", message: "Backend request failed." }
        }, { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
}
