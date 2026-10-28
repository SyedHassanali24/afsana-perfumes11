import { DurableObject } from "cloudflare:workers";
import { dbHealth } from "./mongodb.js";

export class MongoDBConnection extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.env = env;
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
