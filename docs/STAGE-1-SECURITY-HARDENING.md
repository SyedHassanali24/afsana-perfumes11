# Stage 1 — Cloudflare edge security hardening

## Scope

This change hardens the Cloudflare Worker edge without changing storefront markup, CSS, routes, API payloads, MongoDB data, or the legacy API origin.

## Changes

- CORS now allows only the exact storefront origin by default:
  `https://afsana-perfumes11.eastwala12.workers.dev`.
- The former blanket allowance for every `*.workers.dev` origin has been removed.
- If a verified custom storefront origin is introduced later, add its exact origin to the non-secret Worker environment variable `AFSANA_ALLOWED_ORIGINS`, as a comma-separated list. Do not use wildcards.
- Disallowed origins receive no `Access-Control-Allow-Origin` header. Cached responses have their prior CORS headers removed and are re-evaluated for the current request.
- Security headers are applied at the Worker edge to static assets, API responses, health responses, and webhook responses: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`, and `Permissions-Policy`.
- Existing cache rules and the legacy Netlify API upstream are intentionally unchanged.

## Why the Netlify API upstream remains

The Worker currently forwards `/api/*` to `https://afsanayaar.netlify.app`. Removing this dependency before a complete backend migration and authenticated checkout/session regression test would risk breaking customer and admin workflows. This PR deliberately does not change it.

## Verification required before production deployment

1. Run `npm ci` and `npm run build`.
2. Run the repository's syntax and unit checks (`npm run check` and `node --test`).
3. Verify storefront requests from the exact Worker origin succeed.
4. Verify a request from an unrelated origin receives no `Access-Control-Allow-Origin` header.
5. Verify login cookies, admin APIs, product reads, cart, checkout, order tracking, and WhatsApp webhook handshake/signature behavior.
6. Confirm response headers on `/`, a hashed `/assets/*` file, a public API read, a private API request, and `/api/health/mongodb`.
7. Deploy only after the checks pass and the owner approves.

## Not changed / requires account-side verification

- Upstash credentials and production rate-limit operation. The application already uses shared Redis when configured and fails closed in production if unavailable; this PR does not change those semantics.
- Resend credentials and real inbox delivery.
- Cloudflare/Netlify environment secrets, MongoDB data, WhatsApp phone-number registration, and production deployment.
- CSP policy. A stricter CSP needs a full storefront asset and checkout integration audit first; applying one blindly could break the live shop.
