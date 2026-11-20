import { DurableObject } from "cloudflare:workers";
import { onRequest as handleApiRequest } from "./api-router.js";
import { connectMongo, dbHealth } from "./mongodb.js";

export class MongoDBConnection extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.state = state;
    this.env = env;
  }

  async health() {
    return dbHealth(this.env);
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
      try {
        // All API handlers, Mongoose models, and DB queries execute in this
        // Durable Object. This keeps MongoDB's TCP client within one actor context.
        return await handleApiRequest({
          request,
          params: { path },
          env: this.env,
          ctx: this.state
        });
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
