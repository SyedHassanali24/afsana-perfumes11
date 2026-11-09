# AFSANA 123 FINAL — LOCKED RESTORE MANIFEST

**Purpose:** This file is the user's authoritative restore instruction for the Afsana Perfumes project. If the user uploads this file in a future ChatGPT conversation and says "Continue", "restore", or equivalent, use the identifiers below directly. Do not ask the user to repeat project details.

## Absolute user instruction

- This is the approved working state, named **AFSANA 123 FINAL**.
- Preserve it exactly. **Do not change, redesign, refactor, upgrade, clean up, replace, or remove even one thing without the user's explicit permission.**
- Never deploy, roll back, edit production settings, alter DNS, change secrets, migrate/reset a database, or modify files unless the user has explicitly authorized that exact action.
- When the user explicitly asks to restore AFSANA 123 FINAL, restore this exact snapshot—not an older "Hassan" checkpoint, not a guessed similar version, and not a newer modified version.
- No Netlify. The project is Cloudflare-based. Do not introduce Netlify files, styling, hosting, redirects, or deployment.
- Preserve the existing storefront, admin dashboard, Tailwind styling, API/backend, permissions, MongoDB integration, products/categories, customer/order data, media, and all working features exactly as they exist in this snapshot.
- If anything cannot be verified or restored exactly, stop and explain the precise limitation. Never substitute a different design or fabricate success.

## Project identity

- Brand: AFSANA / THE ART OF SCENT
- Repository: https://github.com/SyedHassanali24/afsana-perfumes11
- Default branch at capture: `main`
- Locked branch: `afsana-123-final`
- Locked code commit (base snapshot): `f0e67a9f3b370d9c65bc5a65eef1208469b3836d`
- Commit URL: https://github.com/SyedHassanali24/afsana-perfumes11/commit/f0e67a9f3b370d9c65bc5a65eef1208469b3836d
- Production website: https://afsanaperfumes.store
- Admin entry: https://afsanaperfumes.store/admin/login
- Cloudflare Worker: `afsana-perfumes11`
- Worker URL: https://afsana-perfumes11.eastwala12.workers.dev/

## Live Cloudflare deployment captured

The Cloudflare account was read-only inspected at capture time. The live Worker had this active deployment:

- Worker version number: **410**
- Active version ID: `6b01d12a-c0e8-4c22-a343-9fa7d32d4ef2`
- Deployment ID: `27aaa0f8-ce76-4192-83bc-7b8f016c492b`
- Deployment created: `2026-11-09T07:17:19.76041Z`
- Version created: `2026-11-09T07:17:18.746072Z`
- Worker account ID: `eb104cb2498331e8ace489bbf746dc15`
- Compatibility date: `2026-10-31`
- Compatibility flag: `nodejs_compat`
- Placement: `smart`
- Assets routing: SPA fallback; Worker handles `/*`; assets served directly.

**Important provenance note:** GitHub's newest commit visible at capture was the locked code commit above. The Cloudflare live Worker version is separately recorded above as the production authority. Do not assume the Git commit and deployed bundle are byte-for-byte identical unless verified. For exact production rollback, prefer the recorded Cloudflare version/deployment if it is still available; for source restoration, use the exact locked Git commit/branch. Do not deploy automatically.

## Cloudflare configuration inventory (names only; never expose secret values)

The active Worker settings included:

- KV binding: `AFSANA_MEDIA_FREE` (namespace `c0168837510e4188bc655a7b4f25c0a4`)
- Durable Object binding: `MONGODB_CONNECTION` / class `MongoDBConnection` (namespace `4f96f5f149f5403eadf014369491980f`)
- Assets binding: `ASSETS`
- Plain-text settings: `ALLOWED_ORIGINS`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `RATE_LIMIT_FAIL_OPEN`, `SITE_URL`, `TURNSTILE_SITE_KEY`
- Secret bindings present (values are intentionally not stored here): `EMAILJS_PRIVATE_KEY`, `EMAILJS_PUBLIC_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `JWT_SECRET`, `META_APP_SECRET`, `MONGODB_DB_NAME`, `MONGODB_URI`, `OWNER_EMAIL`, `TURNSTILE_SECRET_KEY`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`

Observed plain-text values:
- `SITE_URL=https://afsanaperfumes.store`
- `ALLOWED_ORIGINS=https://afsanaperfumes.store,https://www.afsanaperfumes.store,https://afsana-perfumes11.eastwala12.workers.dev`
- `EMAILJS_SERVICE_ID=service_jx5mizj`
- `EMAILJS_TEMPLATE_ID=template_36spa09`
- `RATE_LIMIT_FAIL_OPEN=false`
- `TURNSTILE_SITE_KEY=0x4AAAAAAF06iSkhZh8g9mEb`

Never put secret values, tokens, passwords, MongoDB connection strings, or private keys into this file, Git, chat, logs, or a public artifact. Cloudflare API does not reveal secret values; verify presence only. Do not rotate or overwrite them.

## Restore procedure for a future assistant

1. Read this manifest first and treat it as the controlling instruction.
2. Inspect the repository and confirm the locked branch/commit still exists.
3. Inspect Cloudflare Worker `afsana-perfumes11`; check whether version `6b01d12a-c0e8-4c22-a343-9fa7d32d4ef2` or deployment `27aaa0f8-ce76-4192-83bc-7b8f016c492b` is still available.
4. Do not change production just to inspect it. Do not run destructive or write operations during verification.
5. If the user explicitly requested a live restore, restore the exact recorded production version when Cloudflare still supports it. Otherwise restore the repository source from the exact locked commit and explain any deployment step that requires approval.
6. Preserve existing live bindings, secrets, KV data, Durable Object/MongoDB data, assets, custom domains, routes, and DNS. Do not recreate or reset data stores.
7. Do not use old checkpoints such as `HASSAN.md`, PR #7, October snapshots, or any other historical version instead of this lock.
8. After restoration, verify the storefront and admin login URLs, Worker/API health, and database connection without changing content.
9. Report exactly what was verified and what was not. Never claim a successful restore until the checks actually pass.

## Lock meaning and limits

The Git branch and this manifest create a stable source reference. The Cloudflare version/deployment IDs identify the captured live runtime. This file does not contain the full source tree, media bytes, database contents, KV values, DNS zone export, or secret values; those remain in their respective GitHub/Cloudflare/MongoDB services. Keep those services and their data intact. The file is a restore map, not a standalone backup archive.

**User's standing instruction:** AFSANA 123 FINAL is locked. No unapproved changes—zero changes without explicit permission.
