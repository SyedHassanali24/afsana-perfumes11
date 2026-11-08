import test from "node:test";
import assert from "node:assert/strict";
import { corsHeaders, securityHeaders } from "../cloudflare/security.js";

test("CORS allows only the AFSANA production origins", () => {
  assert.equal(corsHeaders("https://afsanaperfumes.store")["Access-Control-Allow-Origin"], "https://afsanaperfumes.store");
  assert.equal(corsHeaders("https://www.afsanaperfumes.store")["Access-Control-Allow-Origin"], "https://www.afsanaperfumes.store");
  assert.equal(corsHeaders("https://random.workers.dev")["Access-Control-Allow-Origin"], undefined);
  assert.equal(corsHeaders("https://evil.example")["Access-Control-Allow-Credentials"], undefined);
});

test("security headers are applied without discarding response headers", () => {
  const headers = securityHeaders({ "Cache-Control": "no-store" });
  assert.equal(headers["Cache-Control"], "no-store");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(headers["Strict-Transport-Security"], /max-age=63072000/);
});
