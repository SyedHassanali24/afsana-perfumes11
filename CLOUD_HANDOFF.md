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
- OTP attempts are capped; password reset OTP requests have an atomic per-user cooldown; active admin OTP challenge requests are throttled.
- Password reset tokens are consumed atomically and single-use.
- Staff and customer sessions have an `authVersion`; credential changes invalidate stale sessions even if a bulk session-revocation write fails.
- Password changes clear trusted devices / pending challenges as applicable.
- Cloudflare Turnstile is required for staff login/2FA/password reset, customer register/login/password reset, and checkout. Siteverify validates success, action and hostname. Requests fail closed when production verification is unavailable.
- Turnstile widget currently allows only `afsana-perfumes11.eastwala12.workers.dev`. When a custom domain is purchased, add apex/www hostnames to the Turnstile widget's allowed domains and update `SITE_URL`, `ALLOWED_ORIGINS`, canonical redirects and cookie behavior before launch.
- Turnstile widget name: `AFSANA Production Website`. Public sitekey is in `src/components/TurnstileWidget.jsx` and `cloudflare/wrangler.toml`. Secret is stored as Cloudflare Worker secret `TURNSTILE_SECRET_KEY`; never print or ask user to paste it into chat.
- Password reset email supports EmailJS, Gmail OAuth or Resend. Cloudflare secret names were verified as present, but actual delivery to the owner inbox still needs a real test.

## Backup and recovery
- Admin data export is encrypted locally in browser with PBKDF2-SHA256 + AES-256-GCM and downloads an `.afsana` file.
- Admin account password is still required to authorize export. A separate passphrase (12+ chars) encrypts the file. The passphrase cannot be recovered; store it separately from the backup.
- Restore command: `npm run db:restore -- path-to-file.afsana`. The passphrase is requested via hidden terminal input; `AFSANA_BACKUP_PASSPHRASE` is available for non-interactive runs.
- Legacy plaintext JSON backups remain supported.
- Browser/Node encryption interoperability, tamper and wrong-passphrase unit tests pass.
- This is an encrypted manual backup. Automatic offsite backup scheduling and a real restore drill are not configured. Do not claim otherwise.

## Verified latest smoke coverage
The GitHub Cloudflare deploy workflow runs `tools/cloudflare-smoke.mjs`, which checks:
- MongoDB Durable Object + application DB readiness.
- Full health endpoint reports `ok=true`.
- Browser security headers and exact-origin CORS (trusted origin allowed, untrusted origin rejected).
- Turnstile CSP resources are allowed.
- Missing / invalid Turnstile challenges are rejected and Siteverify is wired.
- Products API and public CMS API.
- Protected analytics/auth endpoints return expected unauthenticated status.
- Existing public media supports MP4 byte-range playback.
Re-check the latest run before relying on these results for the current branch head.

## Launch blockers that need external setup / real verification
1. **Domain:** No custom domain is currently attached. User has not bought one. After purchase, attach the domain/zone to Cloudflare, preserve MX/SPF/DKIM/DMARC records, connect Worker hostname, update Turnstile allowlist, allowed origins and canonical URLs, and test SSL + admin cookies.
2. **WhatsApp:** Meta Developer account confirmation stalled. `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are not configured. Do not mark messages as sent. Once Meta is verified, add these as Cloudflare Worker secrets (never in chat). The template `afsana_first_purchase_reward` also requires Meta approval.
3. **Payment gateway:** No payment provider/account/credentials have been supplied. Current checkout supports COD and bank/manual payment modes. Do not claim card/wallet gateway integration or verified settlement/webhook.
4. **Email:** EmailJS/Gmail credentials exist as Worker secrets, but actual OTP delivery and receipt delivery still need a real inbox verification.
5. **Commerce E2E:** No real staged purchase has been completed. Verify guest + registered checkout, COD/manual bank workflow, shipping/discount, duplicate idempotency, concurrent inventory, email, order tracking, returns/refunds and admin order processing in a dedicated test database. Never use live production inventory as a destructive test bed.
6. **Recovery:** Encrypted export is implemented and unit-tested, but automatic offsite backups and full restore drill against a separate staging DB remain.
7. **WAF:** Managed WAF/zone rules cannot be claimed as configured while the project has only workers.dev and no zone/custom domain. Configure managed rules and bot protections after domain attachment.
8. **Security assessment:** External penetration test and valid-token browser challenge pass have not been performed. Live smoke verifies invalid-token rejection and CSP, not a successful human challenge.

## Safe working rules
- Do not modify production data to test.
- Do not expose credentials, tokens, customer PII, or database connection strings.
- Never mark WhatsApp/email/payment status as sent/paid based only on configuration presence.
- Avoid physical deletion of old CMS documents; current canonical template logic hides legacy duplicates rather than deleting them.
- Preserve the purple luxury design and existing content.
- When a user asks for progress, report concrete commit / CI / deploy evidence and identify external blockers plainly.
