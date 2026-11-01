import { DurableObject } from "cloudflare:workers";
import { dbHealth } from "./mongodb.js";
import { onRequest as dispatchApi } from "../functions/api/[[path]].js";

export class MongoDBConnection extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
  }

  async health() {
    return dbHealth(this.env);
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health" || url.pathname === "/api/health/mongodb") {
      try {
        return Response.json({
          success: true,
          service: "mongodb",
          ...(await this.health())
        });
      } catch (error) {
        console.error("[afsana-mongodb-health]", error?.message || error);
        return Response.json({
          success: false,
          service: "mongodb",
          connected: false
        }, { status: 503 });
      }
    }

    if (!url.pathname.startsWith("/api/")) {
      return new Response("Not Found", { status: 404 });
    }

    const path = url.pathname.slice("/api/".length).split("/").filter(Boolean);
    try {
      return await dispatchApi({
        request,
        params: { path },
        env: this.env,
        ctx: this.ctx,
        waitUntil: (promise) => this.ctx.waitUntil(promise)
      });
    } catch (error) {
      console.error("[afsana-cloud-api]", error?.message || error);
      return Response.json({
        success: false,
        error: {
          code: "INTERNAL",
          message: "Internal server error."
        }
      }, { status: 500 });
    }
  }
}
