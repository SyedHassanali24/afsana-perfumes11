const base = (process.env.AFSANA_BASE_URL || "https://afsana-perfumes11.eastwala12.workers.dev").replace(/\/$/, "");

async function getJson(path) {
  const response = await fetch(new URL(path, base), {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(20000)
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error(`${path}: expected JSON, received HTTP ${response.status}`);
  }
  return { response, data };
}

function findMediaPaths(value, found = new Set()) {
  if (typeof value === "string") {
    const match = value.match(/\/api\/media\/[0-9a-f]{24}/i);
    if (match) found.add(match[0]);
  } else if (Array.isArray(value)) {
    for (const item of value) findMediaPaths(item, found);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) findMediaPaths(item, found);
  }
  return found;
}

const mongo = await getJson("/api/health/mongodb");
if (!mongo.response.ok || mongo.data.connected !== true) {
  throw new Error(`Cloudflare MongoDB health failed (HTTP ${mongo.response.status}, connected=${mongo.data.connected})`);
}
console.log("MongoDB Durable Object: connected");

const health = await getJson("/api/health");
if (health.data.database?.connected !== true) {
  throw new Error(`Application API could not connect to MongoDB (HTTP ${health.response.status})`);
}
if (health.data.ok !== true) {
  throw new Error(`Application health readiness is not green: ${JSON.stringify({ env: health.data.env, emailProviders: health.data.emailProviders, jwtSecret: health.data.jwtSecret, database: health.data.database, fix: health.data.fix })}`);
}
if (health.data.emailProviders?.adminOtp !== true || health.data.emailProviders?.customerPasswordReset !== true) {
  throw new Error(`Production email providers are not fully configured: ${JSON.stringify(health.data.emailProviders || {})}`);
}
console.log(`Application API: connected; database setup=${health.data.database.setupDone ? "ready" : "needs initialization"}; health readiness=OK; admin OTP + customer reset email are configured`);

// Production security regression checks: trusted CORS only + common browser hardening headers.
const siteOrigin = new URL(base).origin;
for (const [header, expected] of [
  ["strict-transport-security", "max-age="],
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
]) {
  const value = health.response.headers.get(header) || "";
  if (!value.toLowerCase().includes(expected.toLowerCase())) {
    throw new Error(`Security header ${header} is missing or incorrect.`);
  }
}
const allowedPreflight = await fetch(new URL("/api/auth/login", base), {
  method: "OPTIONS",
  headers: {
    Origin: siteOrigin,
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type,x-requested-with"
  },
  signal: AbortSignal.timeout(20000)
});
if (allowedPreflight.status !== 204 || allowedPreflight.headers.get("access-control-allow-origin") !== siteOrigin) {
  throw new Error(`Trusted-origin CORS preflight failed (HTTP ${allowedPreflight.status}).`);
}
const rejectedPreflight = await fetch(new URL("/api/auth/login", base), {
  method: "OPTIONS",
  headers: {
    Origin: "https://untrusted-afsana-test.workers.dev",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type,x-requested-with"
  },
  signal: AbortSignal.timeout(20000)
});
if (rejectedPreflight.status !== 403 || rejectedPreflight.headers.has("access-control-allow-origin")) {
  throw new Error(`Untrusted-origin CORS was not rejected (HTTP ${rejectedPreflight.status}).`);
}
console.log("Security headers: present; CORS: trusted origin allowed and untrusted origin rejected");

const homeResponse = await fetch(base, { signal: AbortSignal.timeout(20000) });
const csp = homeResponse.headers.get("content-security-policy") || "";
if (!csp.toLowerCase().includes("https://challenges.cloudflare.com") || !csp.toLowerCase().includes("frame-src")) {
  throw new Error(`Content Security Policy does not permit the configured Cloudflare Turnstile widget (HTTP ${homeResponse.status}, url=${homeResponse.url}, backend=${homeResponse.headers.get("x-afsana-backend") || "n/a"}, csp=${csp || "missing"}).`);
}
console.log("Turnstile browser resources: allowed by the live Content Security Policy");

// Verify every public write/auth entrypoint is guarded before DB access.
const turnstileActions = [
  ["/api/auth/login", { email: "smoke.invalid@example.invalid", password: "not-a-real-password", deviceId: "smoke-test-device-00000000000000000000" }, "staff_login"],
  ["/api/auth/login/2fa/verify", { email: "smoke.invalid@example.invalid", challengeId: "a".repeat(64), otp: "000000", deviceId: "smoke-test-device-00000000000000000000" }, "staff_2fa"],
  ["/api/auth/forgot-password/request", { email: "smoke.invalid@example.invalid" }, "staff_password_reset_request"],
  ["/api/auth/forgot-password/verify", { email: "smoke.invalid@example.invalid", otp: "000000" }, "staff_password_reset_verify"],
  ["/api/auth/forgot-password/reset", { email: "smoke.invalid@example.invalid", resetToken: "a".repeat(64), password: "NotARealPassword123" }, "staff_password_reset_complete"],
  ["/api/account/register", { name: "Smoke Test", phone: "+923001234567", email: "smoke.invalid@example.invalid", password: "NotARealPassword123" }, "customer_register"],
  ["/api/account/login", { identifier: "smoke.invalid@example.invalid", password: "NotARealPassword123" }, "customer_login"],
  ["/api/account/forgot-password", { identifier: "smoke.invalid@example.invalid" }, "customer_password_reset_request"],
  ["/api/account/reset-password", { token: "a".repeat(64), newPassword: "NotARealPassword123" }, "customer_password_reset_complete"],
  ["/api/orders", { items: [], customer: {}, shippingAddress: {}, paymentMethod: "COD" }, "checkout"],
];

for (const [path, payload, action] of turnstileActions) {
  const response = await fetch(new URL(path, base), {
    method: "POST",
    headers: {
      Origin: siteOrigin,
      "Content-Type": "application/json",
      "X-Requested-With": "afsana"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000)
  });
  const body = await response.json().catch(() => ({}));
  if (response.status !== 403 || body?.error?.code !== "TURNSTILE_REQUIRED") {
    throw new Error(`Turnstile guard failed for ${action} (HTTP ${response.status}, code=${body?.error?.code || "unknown"}).`);
  }
}
console.log(`Turnstile pre-DB guard: ${turnstileActions.length} staff/customer/checkout entrypoints reject missing tokens`);

// A deliberately invalid token proves Siteverify is reachable and validates real tokens server-side.
const invalidResponse = await fetch(new URL("/api/auth/login", base), {
  method: "POST",
  headers: {
    Origin: siteOrigin,
    "Content-Type": "application/json",
    "X-Requested-With": "afsana"
  },
  body: JSON.stringify({
    email: "turnstile-smoke.invalid@example.invalid",
    password: "not-a-real-password",
    deviceId: "smoke-test-device-00000000000000000000",
    turnstileToken: "afsana-invalid-deployment-smoke-token"
  }),
  signal: AbortSignal.timeout(20000)
});
const invalidBody = await invalidResponse.json().catch(() => ({}));
if (invalidResponse.status !== 403 || invalidBody?.error?.code !== "TURNSTILE_FAILED") {
  throw new Error(`Turnstile Siteverify is not correctly wired (HTTP ${invalidResponse.status}, code=${invalidBody?.error?.code || "unknown"}).`);
}
console.log("Turnstile backend: invalid tokens rejected by Siteverify");
const products = await getJson("/api/products?sort=popular&limit=12");
if (!products.response.ok || products.data.success !== true) {
  throw new Error(`Products API failed (HTTP ${products.response.status})`);
}
const productCount = Number(products.data.pagination?.total ?? products.data.products?.length ?? 0);
console.log(`Products API: HTTP ${products.response.status}; catalog products=${productCount}`);

const cms = await getJson("/api/cms/public");
if (!cms.response.ok || cms.data.success !== true) {
  throw new Error(`CMS API failed (HTTP ${cms.response.status})`);
}
console.log(`CMS API: HTTP ${cms.response.status}; public content endpoint is responding`);

// The audience acquisition endpoint is staff-only. Without a session it must return
// 401 (not 404), proving that the analytics route is registered in the deployed API.
const traffic = await getJson("/api/analytics/traffic?days=30");
if (traffic.response.status !== 401) {
  throw new Error(`Traffic analytics route should be registered and protected (expected HTTP 401 without a session, received HTTP ${traffic.response.status})`);
}
console.log("Traffic analytics route: registered and protected (HTTP 401 expected without a login cookie)");

const mediaPaths = findMediaPaths([products.data, cms.data]);
for (const path of mediaPaths) {
  // Video checks request only the first 16 bytes; never pull a potentially 250 MB file into CI memory.
  const response = await fetch(new URL(path, base), {
    headers: { Range: "bytes=0-15" },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`Uploaded media ${path} returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!/^(image\/(jpeg|png|webp)|video\/(mp4|webm)|model\/gltf-binary)(;|$)/i.test(contentType)) {
    await response.body?.cancel();
    throw new Error(`Uploaded media ${path} returned unexpected content type: ${contentType}`);
  }

  if (contentType.startsWith("video/")) {
    const contentRange = response.headers.get("content-range") || "";
    if (response.status !== 206 || !/^bytes 0-\d+\/\d+$/i.test(contentRange)) {
      await response.body?.cancel();
      throw new Error(`Uploaded video ${path} does not support byte-range playback (HTTP ${response.status}, cache=${response.headers.get('x-afsana-cache') || 'n/a'}, processor=${response.headers.get('x-afsana-api-processor') || 'n/a'}, content-range=${response.headers.get('content-range') || 'n/a'}, content-length=${response.headers.get('content-length') || 'n/a'}, media-size=${response.headers.get('x-afsana-media-size') || 'n/a'}, accept-ranges=${response.headers.get('accept-ranges') || 'n/a'}, debug=${response.headers.get('x-afsana-range-debug') || 'n/a'})`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 16) throw new Error(`Uploaded video ${path} returned an invalid byte-range payload`);
    console.log(`Uploaded video: HTTP 206, ${contentType}, range ${contentRange}`);
    continue;
  }

  // Existing MongoDB image/GLB media does not use the KV video range reader.
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`Uploaded media ${path} returned an empty file`);
  console.log(`Uploaded media: HTTP ${response.status}, ${contentType}, ${bytes.length} bytes`);
}
if (!mediaPaths.size) console.log("No existing public records reference an uploaded /api/media asset yet.");

const auth = await getJson("/api/auth/me");
if (auth.response.status !== 401) {
  throw new Error(`Staff auth session check returned unexpected HTTP ${auth.response.status}`);
}
console.log("Staff authentication route: responding (401 is expected without a login cookie)");
