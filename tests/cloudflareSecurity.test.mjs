import test from "node:test";
import assert from "node:assert/strict";
import { corsHeaders, securityHeaders } from "../cloudflare/security.js";

const storefront = "https://afsana-perfumes11.eastwala12.workers.dev";

test("Cloudflare CORS allows the exact storefront origin by default", () => {
  const headers = corsHeaders(storefront, {}, storefront);
  assert.equal(headers["Access-Control-Allow-Origin"], storefront);
  assert.equal(headers["Access-Control-Allow-Credentials"], "true");
});

test("Cloudflare CORS refuses unrelated workers.dev origins", () => {
  const headers = corsHeaders("https://attacker.workers.dev", {}, storefront);
  assert.equal(headers["Access-Control-Allow-Origin"], undefined);
  assert.equal(headers["Access-Control-Allow-Credentials"], undefined);
  assert.equal(headers.Vary, "Origin");
});

test("Cloudflare CORS supports exact explicitly configured custom origins only", () => {
  const custom = "https://shop.afsana.example";
  const env = { AFSANA_ALLOWED_ORIGINS: custom + ", https://admin.afsana.example" };
  assert.equal(corsHeaders(custom, env, storefront)["Access-Control-Allow-Origin"], custom);
  assert.equal(corsHeaders("https://evil.afsana.example", env, storefront)["Access-Control-Allow-Origin"], undefined);
  assert.equal(corsHeaders("https://sub.afsana.example", { AFSANA_ALLOWED_ORIGINS: "https://*.afsana.example" }, storefront)["Access-Control-Allow-Origin"], undefined);
});

test("Cloudflare edge security headers are consistently applied", () => {
  const headers = securityHeaders({ "Cache-Control": "no-store" });
  assert.equal(headers["Cache-Control"], "no-store");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(headers["Strict-Transport-Security"], /max-age=63072000/);
  assert.equal(headers["Permissions-Policy"], "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
});
