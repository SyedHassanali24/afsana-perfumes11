import { DurableObject } from "cloudflare:workers";
import { dbHealth } from "./mongodb.js";
import { onRequest as dispatchApi } from "../functions/api/[[path]].js";

const JWT_SECRET_KEY = "afsana:jwt-secret:v1";
const MEDIA_CHUNK_BYTES = 4 * 1024 * 1024;
const MEDIA_MAX_BYTES = 250 * 1024 * 1024;
const MEDIA_UPLOAD_TTL = 24 * 60 * 60;
function mediaJson(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
function hexId(bytes = 12) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (v) => v.toString(16).padStart(2, "0")).join("");
}
function safeMediaName(value) {
  return String(value || "afsana-video").replace(/[\/\\\0-\x1f\x7f]/g, "-").replace(/[^a-zA-Z0-9._ -]/g, "").slice(0, 120) || "afsana-video";
}


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


  async mediaSigningKey() {
    this.mediaHmacKey ||= crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    return this.mediaHmacKey;
  }

  async makeMediaToken(uploadId, expiresAt) {
    const payload = new TextEncoder().encode(uploadId + "." + expiresAt);
    const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await this.mediaSigningKey(), payload));
    const encoded = btoa(String.fromCharCode(...signature)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    return expiresAt + "." + encoded;
  }

  async verifyMediaToken(uploadId, request) {
    const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const [expiryText, encoded] = token.split(".");
    const expiresAt = Number(expiryText);
    if (!Number.isSafeInteger(expiresAt) || expiresAt < Date.now() || !encoded) return false;
    try {
      const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
      const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
      const signature = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return await crypto.subtle.verify(
        "HMAC",
        await this.mediaSigningKey(),
        signature,
        new TextEncoder().encode(uploadId + "." + expiresAt)
      );
    } catch {
      return false;
    }
  }

  async authorizeMediaInit(request, runtimeEnv, payload) {
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.set("Content-Type", "application/json");
    const authRequest = new Request(new URL("/api/media/chunked/authorize", request.url), {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    return dispatchApi({
      request: authRequest,
      params: { path: ["media", "chunked", "authorize"] },
      env: runtimeEnv,
      ctx: this.ctx,
      waitUntil: (promise) => this.ctx.waitUntil(promise)
    });
  }

  async mediaChunked(request, url, runtimeEnv) {
    const bucket = this.env.AFSANA_MEDIA_FREE;
    if (!bucket) return mediaJson({ success: false, error: { message: "Media storage is not configured." } }, 503);
    const parts = url.pathname.split("/").filter(Boolean);
    if (request.method === "POST" && parts[3] === "init") {
      let payload;
      try { payload = await request.json(); } catch { return mediaJson({ success: false, error: { message: "Invalid upload details." } }, 400); }
      const filename = String((payload && payload.filename) || "");
      const contentType = payload && payload.contentType;
      const size = payload && payload.size;
      if (!["video/mp4", "video/webm"].includes(contentType) || !Number.isSafeInteger(size) || size < 1 || size > MEDIA_MAX_BYTES) {
        return mediaJson({ success: false, error: { message: "Choose an MP4/WebM video up to 250 MB." } }, 400);
      }
      const authResponse = await this.authorizeMediaInit(request, runtimeEnv, { filename, contentType, size });
      if (!authResponse.ok) return authResponse;
      const uploadId = hexId();
      const expiresAt = Date.now() + MEDIA_UPLOAD_TTL * 1000;
      const chunkCount = Math.ceil(size / MEDIA_CHUNK_BYTES);
      const meta = {
        id: uploadId,
        filename: safeMediaName(filename),
        contentType,
        size,
        chunkSize: MEDIA_CHUNK_BYTES,
        chunkCount,
        status: "uploading",
        createdAt: new Date().toISOString()
      };
      await bucket.put("media:" + uploadId + ":meta", JSON.stringify(meta), { expirationTtl: MEDIA_UPLOAD_TTL });
      return mediaJson({
        success: true,
        uploadId,
        token: await this.makeMediaToken(uploadId, expiresAt),
        chunkSize: MEDIA_CHUNK_BYTES,
        chunkCount,
        maxBytes: MEDIA_MAX_BYTES
      });
    }

    const chunkMatch = url.pathname.match(/^\/api\/media\/chunked\/([a-f0-9]{24})\/(\d+)$/i);
    if (request.method === "PUT" && chunkMatch) {
      const uploadId = chunkMatch[1];
      if (!(await this.verifyMediaToken(uploadId, request))) return mediaJson({ success: false, error: { message: "Upload authorization expired. Start the upload again." } }, 401);
      const rawMeta = await bucket.get("media:" + uploadId + ":meta");
      if (!rawMeta) return mediaJson({ success: false, error: { message: "Upload session expired." } }, 404);
      const meta = JSON.parse(rawMeta);
      const index = Number(chunkMatch[2]);
      if (meta.status !== "uploading" || !Number.isInteger(index) || index < 0 || index >= meta.chunkCount) {
        return mediaJson({ success: false, error: { message: "Invalid upload chunk." } }, 400);
      }
      const bytes = await request.arrayBuffer();
      if (index === 0) {
        const signature = new Uint8Array(bytes);
        const isMp4 = meta.contentType === "video/mp4" && signature.length >= 12 &&
          String.fromCharCode(...signature.slice(4, 8)) === "ftyp";
        const isWebm = meta.contentType === "video/webm" && signature.length >= 4 &&
          signature[0] === 0x1a && signature[1] === 0x45 && signature[2] === 0xdf && signature[3] === 0xa3;
        if (!isMp4 && !isWebm) return mediaJson({ success: false, error: { message: "The selected file is not a valid MP4/WebM video." } }, 400);
      }
      const expected = Math.min(meta.chunkSize, meta.size - index * meta.chunkSize);
      if (bytes.byteLength !== expected) return mediaJson({ success: false, error: { message: "The uploaded chunk size does not match." } }, 400);
      await bucket.put("media:" + uploadId + ":chunk:" + index, bytes);
      return mediaJson({ success: true, index, receivedBytes: bytes.byteLength });
    }

    const completeMatch = url.pathname.match(/^\/api\/media\/chunked\/([a-f0-9]{24})\/complete$/i);
    if (request.method === "POST" && completeMatch) {
      const uploadId = completeMatch[1];
      if (!(await this.verifyMediaToken(uploadId, request))) return mediaJson({ success: false, error: { message: "Upload authorization expired. Start the upload again." } }, 401);
      const rawMeta = await bucket.get("media:" + uploadId + ":meta");
      if (!rawMeta) return mediaJson({ success: false, error: { message: "Upload session expired." } }, 404);
      const meta = JSON.parse(rawMeta);
      if (meta.status === "complete") return mediaJson({ success: true, url: "/api/media/" + uploadId, size: meta.size });
      if (meta.status !== "uploading") return mediaJson({ success: false, error: { message: "Invalid upload state." } }, 409);
      for (let index = 0; index < meta.chunkCount; index += 1) {
        const key = "media:" + uploadId + ":chunk:" + index;
        const bytes = await bucket.get(key, { type: "arrayBuffer" });
        const expected = Math.min(meta.chunkSize, meta.size - index * meta.chunkSize);
        if (!bytes || bytes.byteLength !== expected) return mediaJson({ success: false, error: { message: "Video upload is incomplete (part " + (index + 1) + " of " + meta.chunkCount + ")." } }, 409);
        await bucket.put(key, bytes);
      }
      meta.status = "complete";
      meta.completedAt = new Date().toISOString();
      await bucket.put("media:" + uploadId + ":meta", JSON.stringify(meta));
      return mediaJson({ success: true, url: "/api/media/" + uploadId, size: meta.size });
    }
    return mediaJson({ success: false, error: { message: "Chunked media route not found." } }, 404);
  }

  async serveKVMedia(request, uploadId) {
    const bucket = this.env.AFSANA_MEDIA_FREE;
    if (!bucket) return null;
    const rawMeta = await bucket.get("media:" + uploadId + ":meta");
    if (!rawMeta) return null;
    let meta;
    try { meta = JSON.parse(rawMeta); } catch { return new Response("Media metadata is invalid.", { status: 500 }); }
    if (meta.status !== "complete") return new Response("Media not found.", { status: 404 });
    const headers = new Headers({
      "Content-Type": meta.contentType,
      "Content-Disposition": "inline; filename*=UTF-8''" + encodeURIComponent(meta.filename || "afsana-video"),
      "Content-Length": String(meta.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") return new Response(null, { status: 200, headers });
    let start = 0, end = meta.size - 1, status = 200;
    const range = request.headers.get("Range");
    if (range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      if (!match || (!match[1] && !match[2])) {
        headers.set("Content-Range", "bytes */" + meta.size);
        return new Response(null, { status: 416, headers });
      }
      if (!match[1]) {
        const suffix = Number(match[2]);
        start = Math.max(0, meta.size - suffix);
      } else {
        start = Number(match[1]);
        if (match[2]) end = Math.min(meta.size - 1, Number(match[2]));
      }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= meta.size || end < start) {
        headers.set("Content-Range", "bytes */" + meta.size);
        return new Response(null, { status: 416, headers });
      }
      status = 206;
      headers.set("Content-Range", "bytes " + start + "-" + end + "/" + meta.size);
      headers.set("Content-Length", String(end - start + 1));
    }
    let cursor = start;
    const body = new ReadableStream({
      pull: async (controller) => {
        try {
          if (cursor > end) { controller.close(); return; }
          const index = Math.floor(cursor / meta.chunkSize);
          const bytes = await bucket.get("media:" + uploadId + ":chunk:" + index, { type: "arrayBuffer" });
          if (!bytes) throw new Error("Missing media chunk " + index);
          const chunkStart = index * meta.chunkSize;
          const from = cursor - chunkStart;
          const to = Math.min(bytes.byteLength, end - chunkStart + 1);
          if (to <= from) throw new Error("Invalid media chunk boundary.");
          controller.enqueue(new Uint8Array(bytes, from, to - from));
          cursor = chunkStart + to;
        } catch (error) {
          controller.error(error);
        }
      }
    });
    return new Response(body, { status, headers });
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
      if (url.pathname.startsWith("/api/media/chunked/")) {
        return await this.mediaChunked(request, url, runtimeEnv);
      }
      const publicMedia = url.pathname.match(/^\/api\/media\/([a-f0-9]{24})$/i);
      if (publicMedia && ["GET", "HEAD"].includes(request.method)) {
        const stored = await this.serveKVMedia(request, publicMedia[1]);
        if (stored) return stored;
      }
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
