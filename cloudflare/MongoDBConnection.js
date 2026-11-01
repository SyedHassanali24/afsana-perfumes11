import { DurableObject } from "cloudflare:workers";
import { dbHealth } from "./mongodb.js";
import { onRequest as dispatchApi } from "../functions/api/[[path]].js";

const JWT_SECRET_KEY = "afsana:jwt-secret:v1";

export class MongoDBConnection extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.jwtSecretReady = ctx.blockConcurrencyWhile(async () => {
      const configured = typeof env.JWT_SECRET === "string" ? env.JWT_SECRET.trim() : "";
      if (configured.length >= 32) {
        this.jwtSecret = configured;
        return;
      }

      let stored = await ctx.storage.get(JWT_SECRET_KEY);
      if (typeof stored !== "string" || stored.length < 32) {
        const bytes = crypto.getRandomValues(new Uint8Array(48));
        stored = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
        await ctx.storage.put(JWT_SECRET_KEY, stored);
      }
      this.jwtSecret = stored;
    });
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
      await this.jwtSecretReady;
      const runtimeEnv = {
        ...this.env,
        JWT_SECRET: this.jwtSecret
      };
      return await dispatchApi({
        request,
        params: { path },
        env: runtimeEnv,
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
