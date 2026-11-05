# AFSANA Cloudflare Handoff

Last updated: 2026-11-05 (Asia/Karachi)

Continue the AFSANA Perfumes project from this file when the user says **continue**, **next**, or **cloud**. Do not ask the user to repeat known project context.

## Production target
- Live Worker: https://afsana-perfumes11.eastwala12.workers.dev/
- GitHub repository: https://github.com/SyedHassanali24/afsana-perfumes11
- Production branch currently deployed: `feat/universal-afsana-page-builder`
- Default branch: `main` (behind the working branch)
- Do not deploy Netlify. Cloudflare is the production host.
- Preserve the current purple/luxury AFSANA design and existing MongoDB data. Do not change homepage styling or remove CMS content unless explicitly requested.

## GitHub release state
- The working branch includes the latest CMS / store / security work.
- Latest tested application commit deployed: `3fd66da4f9e84ff3a14707f6c6ccfa8a6afb5056` (OTP provider failover + customer email compatibility). Latest WhatsApp regression-test commit: `a98df335f229840431f7dc81d242740cee495522`.
- Latest verified Cloudflare Worker version: `bc746997-0969-455a-b453-757c32c41f60`, 100% traffic. Deployment run: https://github.com/SyedHassanali24/afsana-perfumes11/actions/runs/42053629921 (attempt 2 successful; CI + live smoke passed). WhatsApp tests passed separately in CI; they do not change Worker runtime.
- PR #7 is still Draft, open, unmerged, and GitHub reports it as dirty / not mergeable. Do not force-merge it into `main`.
- Deployments are triggered from the feature branch by `.github/workflows/cloudflare-worker.yml`.
- Re-check branch head and latest GitHub Actions before claiming the very latest code is deployed.
- Do not confuse an earlier successful deployment run with the most recent branch head.

## Cloudflare Worker architecture
- Worker name: `afsana-perfumes11`.
- Worker handles all routes; `cloudflare/wrangler.toml` has `run_worker_first = ["/*"]` so HTML/static responses also receive Worker security headers.
- Static Vite output is served by `env.ASSETS`; hashed assets receive immutable long-lived caching and HTML is short cached.
- `/api/*` is handled through the Worker + `MongoDBConnection` Durable Object and the internal adapter at `functions/api/[[path]].js`, which dispatches the existing `netlify/functions/*` handlers inside the Worker. This is not a Netlify production deployment or Netlify API upstream.
- MongoDB connection and media chunk upload/playback are handled by the existing Durable Object + KV architecture.
- Durable Object namespace: `MONGODB_CONNECTION`.
- Media KV binding: `AFSANA_MEDIA_FREE`.
- Smart Placement and Worker caching are configured.
- API private/auth responses bypass public caching; private responses use no-store behavior.

## Current security implementation
- Exact-origin CORS allowlist; arbitrary `*.workers.dev` wildcard has been removed.
- Worker response headers include CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy and Permissions-Policy.
- CSP explicitly permits the Cloudflare Turnstile script and frame origins.
- Distributed rate limits use the Durable Object SQLite storage; counters are keyed by one-way hashes, and a durable storage failure fails closed. No paid Redis is required for the Cloudflare Worker path.
- Client IP extraction prioritizes Cloudflare's edge-provided `CF-Connecting-IP`.
- Staff login: 3 incorrect passwords -> 3-minute lockout; route/IP rate limits also apply.
- Admin / privileged new-device login requires email OTP.
- OTP hashes are HMAC-peppered with the server JWT secret.
- OTP attempts are capped; wrong-code attempt counters use atomic database increments; correct admin/reset OTPs are consumed atomically and cannot be replayed in parallel. Password reset OTP requests have an atomic per-user cooldown; active admin OTP challenge requests are throttled.
- Password reset tokens are consumed atomically and single-use.
- Staff and customer sessions have an `authVersion`; credential changes invalidate stale sessions even if a bulk session-revocation write fails.
- Password changes clear trusted devices / pending challenges as applicable.
- Cloudflare Turnstile is required for staff login/2FA/password reset, customer register/login/password reset, and checkout. Siteverify validates success, action and hostname. Requests fail closed when production verification is unavailable. Live smoke checks 10 guarded routes for missing-token rejection, plus a separate invalid-token Siteverify rejection.
- Turnstile widget currently allows only `afsana-perfumes11.eastwala12.workers.dev`. When a custom domain is purchased, add apex/www hostnames to the Turnstile widget's allowed domains and update `SITE_URL`, `ALLOWED_ORIGINS`, canonical redirects and cookie behavior before launch.
- Turnstile widget name: `AFSANA Production Website`. Public sitekey is in `src/components/TurnstileWidget.jsx` and `cloudflare/wrangler.toml`. Secret is stored as Cloudflare Worker secret `TURNSTILE_SECRET_KEY`; never print or ask user to paste it into chat.
- Admin OTP delivery uses EmailJS -> Gmail OAuth -> Resend failover; partial EmailJS configuration no longer blocks the other configured providers. Customer password-reset email tries Gmail OAuth, Resend, then an optional dedicated EmailJS reset template. Provider outages return safe `503 EMAIL_UNAVAILABLE` / `503 SERVICE_UNAVAILABLE` responses.
- Customer email identifiers are trimmed/lowercased; legacy mixed-case stored emails are queried using case-insensitive anchored exact match. Registration avoids case-only duplicate accounts.
- Cloudflare secret names for EmailJS, Gmail OAuth, Owner mailbox and Turnstile are configured. Health-v3 reports admin OTP and customer password-reset readiness separately. This verifies configuration presence, not actual inbox delivery; a real inbox test still requires owner/customer participation.


## WhatsApp integration

- Storefront fallback floating WhatsApp link is present and points to `+92 3132956206`; when a CMS `whatsapp_float` widget is active, the duplicate fallback is hidden.
- First-purchase reward flow requires the customer's recorded WhatsApp marketing consent, a confirmed Paid payment (or COD order marked Paid at Delivered), and the growth reward setting enabled.
- Coupon + WhatsApp outbox record are created in the payment/status transaction. The dedupe key is one per customer. Admin can inspect masked recipients and retry failed/setup-required outbox entries after password confirmation.
- A successful Graph API response is labelled `accepted`, not `delivered`; delivery receipts/webhooks are not represented as confirmed delivery.
- Meta Graph API path defaults to `v26.0`, and `WHATSAPP_GRAPH_VERSION` can override it. Meta's v26.0 changelog lists it as the latest Graph API version, released July 29, 2026.
- WhatsApp tests cover Pakistan phone normalization, no-consent behavior, one-per-customer deduplication, missing credentials (`setup_required`), accepted provider requests, and accepted-message no-resend. Tests use mocked providers only.
- Live Meta send remains blocked until `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, Meta app/business verification, and approval of `afsana_first_purchase_reward` are completed by the owner.

## Backup and recovery
- Admin data export is encrypted locally in browser with PBKDF2-SHA256 + AES-256-GCM and downloads an `.afsana` file.
- Admin account password is still required to authorize export. A separate passphrase (12+ chars) encrypts the file. The passphrase cannot be recovered; store it separately from the backup.
- Restore command: `npm run db:restore -- path-to-file.afsana`. The passphrase is requested via hidden terminal input; `AFSANA_BACKUP_PASSPHRASE` is available for non-interactive runs.
- Legacy plaintext JSON backups remain supported.
- Browser/Node encryption interoperability, tamper and wrong-passphrase unit tests pass.
- This is an encrypted manual backup. Browser-to-Node export/restore interoperability, wrong-passphrase and ciphertext-tamper tests pass in CI. Automatic offsite backup scheduling and a full restore drill against a separate staging DB are not configured. Do not claim otherwise.

## Verified latest smoke coverage
The GitHub Cloudflare deploy workflow runs `tools/cloudflare-smoke.mjs`, which checks:
- MongoDB Durable Object + application DB readiness.
- Full health endpoint reports `ok=true`.
- Browser security headers and exact-origin CORS (trusted origin allowed, untrusted origin rejected).
- Turnstile CSP resources are allowed.
- Missing / invalid Turnstile challenges are rejected and Siteverify is wired.
- Products API and public CMS API.
- Protected analytics/auth endpoints return expected unauthenticated status.
- All 10 staff/customer/checkout write and authentication entrypoints reject missing Turnstile before DB access; invalid-token requests are rejected by Siteverify.
- Products and CMS endpoints return expected responses; unauthenticated staff/analytics routes remain protected.
- Existing public media supports MP4 byte-range playback.
- WhatsApp outbox unit tests cover consent gating, Pakistan phone formatting, setup-required state, accepted status, single-send idempotency and template payload. Tests use fake providers; no message is sent.
Latest deployment run on application commit `3fd66da4f9e84ff3a14707f6c6ccfa8a6afb5056` / Worker version `bc746997-0969-455a-b453-757c32c41f60`: MongoDB connected; health readiness OK including admin OTP + customer reset provider configuration; CORS/security headers passed; 10 Turnstile guards passed; Siteverify invalid-token check passed; products=2; CMS=200; 5 images and 2 MP4s returned byte-range HTTP 206; staff auth route returned expected 401 without a cookie. Re-check latest run before relying on results for a later branch head.

## Launch blockers that need external setup / real verification
1. **Domain:** No custom domain is currently attached. User has not bought one. After purchase, attach the domain/zone to Cloudflare, preserve MX/SPF/DKIM/DMARC records, connect Worker hostname, update Turnstile allowlist, allowed origins and canonical URLs, and test SSL + admin cookies.
2. **WhatsApp:** Outbox + first-paid-purchase reward flow is implemented and unit-tested. It only queues a reward when customer WhatsApp marketing consent is recorded, deduplicates per customer, and reports `setup_required` instead of Sent without credentials. Meta Developer/Business verification is not complete; Worker secrets `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are absent. The template `afsana_first_purchase_reward` requires Meta approval and a real opted-in test recipient before any live send. The storefront floating WhatsApp link points to +92 3132956206.
3. **Payment gateway:** No payment provider/account/credentials have been supplied. Current checkout supports COD and bank/manual payment modes. Do not claim card/wallet gateway integration or verified settlement/webhook.
4. **Email:** EmailJS/Gmail credentials exist as Worker secrets, but actual OTP delivery and receipt delivery still need a real inbox verification.
5. **Commerce E2E:** No real staged purchase has been completed. Verify guest + registered checkout, COD/manual bank workflow, shipping/discount, duplicate idempotency, concurrent inventory, email, order tracking, returns/refunds and admin order processing in a dedicated test database. Never use live production inventory as a destructive test bed.
6. **Recovery:** Encrypted `.afsana` export/restore implementation is unit-tested, including cross-runtime decryption and tamper/wrong-passphrase handling. Automatic offsite backups and a full restore drill against a separate staging DB remain; no paid R2 or external backup target has been configured.
7. **WAF:** Managed WAF/zone rules cannot be claimed as configured while the project has only workers.dev and no zone/custom domain. Configure managed rules and bot protections after domain attachment.
8. **Security assessment:** External penetration test and valid-token human browser challenge pass have not been performed. Live smoke verifies missing/invalid-token rejection and CSP, not a successful human challenge.

## Safe working rules
- Do not modify production data to test.
- Do not expose credentials, tokens, customer PII, or database connection strings.
- Never mark WhatsApp/email/payment status as sent/paid based only on configuration presence.
- Avoid physical deletion of old CMS documents; current canonical template logic hides legacy duplicates rather than deleting them.
- Preserve the purple luxury design and existing content.
- When a user asks for progress, report concrete commit / CI / deploy evidence and identify external blockers plainly.
