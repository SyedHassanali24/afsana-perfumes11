import { DurableObject } from "cloudflare:workers";
import mongoose from "mongoose";
import { parseMediaByteRange } from "../shared/mediaLimits.mjs";
import { onRequest as handleApiRequest } from "./api-router.js";
import { connectMongo, dbHealth } from "./mongodb.js";
import {
  getPublicApiCacheEpoch,
  readPublicApiCache,
  writePublicApiCache,
  clearPublicApiCache
} from "./public-api-cache.js";

const VIDEO_FILES = "afsana_video_files";
const VIDEO_CHUNKS = "afsana_video_chunks";

function isWhatsAppMarketingOptOut(value) {
  const text = String(value || "").trim().toUpperCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " ");
  return /^(?:STOP|STOP ALL|STOP OFFERS|STOP PROMOTIONS|UNSUBSCRIBE|CANCEL|END|QUIT)$/.test(text);
}

function whatsappPhoneTailRegex(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const tail = digits.slice(-10);
  if (tail.length !== 10) return null;
  return new RegExp(tail.split("").join("[^0-9]*"));
}

function videoChunkBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value && typeof value.value === "function") return Buffer.from(value.value(true));
  if (value && value.buffer) {
    const bytes = Buffer.from(value.buffer);
    return bytes.subarray(0, Number.isInteger(value.position) ? value.position : bytes.length);
  }
  return Buffer.from(value || []);
}

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

    let optOuts = 0;
    const messages = (payload.entry || []).flatMap((entry) =>
      (entry.changes || []).flatMap((change) => change.value && change.value.messages || [])
    );
    for (const message of messages) {
      const text = message.text && message.text.body
        || message.button && message.button.text
        || message.interactive && message.interactive.button_reply && message.interactive.button_reply.title
        || message.interactive && message.interactive.list_reply && message.interactive.list_reply.title
        || "";
      if (!isWhatsAppMarketingOptOut(text)) continue;
      const phoneRegex = whatsappPhoneTailRegex(message.from);
      if (!phoneRegex) continue;
      const now = new Date();
      const [customers, leads] = await Promise.all([
        db.collection("customers").updateMany(
          { phone: { $regex: phoneRegex } },
          { $set: { whatsappMarketingConsent: false, whatsappMarketingUnsubscribedAt: now } }
        ),
        db.collection("offerleads").updateMany(
          { phone: { $regex: phoneRegex } },
          { $set: { marketingConsent: false, status: "Unsubscribed" } }
        )
      ]);
      optOuts += Number(customers.modifiedCount || 0) + Number(leads.modifiedCount || 0);
    }
    return { stored: true, optOuts };
  }

  async serveVideo(request, id) {
    const db = await connectMongo(this.env);
    const videoId = new mongoose.Types.ObjectId(id);
    const file = await db.collection(VIDEO_FILES).findOne({ _id: videoId });
    if (!file || !Number.isSafeInteger(file.size) || file.size < 1 || !Number.isSafeInteger(file.chunkSize) || file.chunkSize < 1) {
      return new Response("Video not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const requestedRange = request.headers.get("range");
    const range = parseMediaByteRange(requestedRange, file.size);
    if (range === false) {
      return new Response(null, {
        status: 416,
        headers: { "Accept-Ranges": "bytes", "Content-Range": `bytes */${file.size}`, "Cache-Control": "no-store" }
      });
    }
    const start = range ? range.start : 0;
    const end = range ? range.end : file.size - 1;
    const firstChunk = Math.floor(start / file.chunkSize);
    const lastChunk = Math.floor(end / file.chunkSize);
    const contentLength = end - start + 1;
    const safeName = String(file.filename || "afsana-video").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120);
    const headers = new Headers({
      "Content-Type": file.contentType,
      "Content-Length": String(contentLength),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin"
    });
    if (range) headers.set("Content-Range", `bytes ${start}-${end}/${file.size}`);
    if (request.method === "HEAD") return new Response(null, { status: range ? 206 : 200, headers });

    const collection = db.collection(VIDEO_CHUNKS);
    let nextChunk = firstChunk;
    const body = new ReadableStream({
      async pull(controller) {
        try {
          if (nextChunk > lastChunk) {
            controller.close();
            return;
          }
          const index = nextChunk;
          const stored = await collection.findOne({ uploadId: videoId, index });
          if (!stored) throw new Error("A stored video part is missing.");
          const bytes = videoChunkBuffer(stored.data);
          const expectedLength = Math.min(file.chunkSize, file.size - index * file.chunkSize);
          if (bytes.length !== expectedLength) throw new Error("A stored video part has an invalid size.");
          const from = index === firstChunk ? start % file.chunkSize : 0;
          const to = index === lastChunk ? (end % file.chunkSize) + 1 : bytes.length;
          controller.enqueue(bytes.subarray(from, to));
          nextChunk += 1;
        } catch (error) {
          controller.error(error);
        }
      }
    });
    return new Response(body, { status: range ? 206 : 200, headers });
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

    const videoMatch = /^\/api\/media\/video\/([a-f0-9]{24})$/i.exec(url.pathname);
    if (videoMatch) {
      if (!["GET", "HEAD"].includes(request.method)) return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
      try {
        return await this.serveVideo(request, videoMatch[1]);
      } catch (error) {
        console.error("[afsana-video] playback failed:", error?.message || error);
        return new Response("Video unavailable", { status: 500, headers: { "Cache-Control": "no-store" } });
      }
    }

    if (url.pathname.startsWith("/api/")) {
      const path = url.pathname.slice("/api/".length).split("/").filter(Boolean);
      const isRead = request.method === "GET" || request.method === "HEAD";
      try {
        // Small, explicitly-public storefront reads are persisted inside this
        // Durable Object so subsequent visitors do not wait on another MongoDB read.
        let cacheEpoch;
        if (isRead) {
          try {
            // Capture the generation before the database read. If a write completes
            // while this GET is in flight, its response cannot repopulate the new cache.
            cacheEpoch = await getPublicApiCacheEpoch(this.state.storage);
            const cached = await readPublicApiCache(this.state.storage, request, Date.now(), cacheEpoch);
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
            await writePublicApiCache(this.state.storage, request, response, Date.now(), cacheEpoch);
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
