import { DurableObject } from "cloudflare:workers";
import { dbHealth } from "./mongodb.js";
export class MongoDBConnection extends DurableObject {
  constructor(state, env) { super(state, env); this.env = env; }
  async health() { return dbHealth(this.env); }
}
