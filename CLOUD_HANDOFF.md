# AFSANA Cloudflare Handoff

Last updated: 2026-10-30 (Asia/Karachi)

When the user says **"cloud"** in a new chat, continue this project from this checkpoint without asking them to repeat context.

## Goal
Use the latest AFSANA design from this visual reference as the source of truth:
https://deploy-preview-7--afsanayaar.netlify.app/?afsanaPreview=1&afsanaPageKey=home

The production/live target is Cloudflare Worker:
https://afsana-perfumes11.eastwala12.workers.dev/

Netlify is only a visual/reference source and API upstream; do not deploy Netlify production. Preserve real React commerce, auth, cart, checkout, CMS and backend. Do not merge feature branch / PR #7 into main unless explicitly asked.

## Repository
https://github.com/SyedHassanali24/afsana-perfumes11
Working branch: feat/universal-afsana-page-builder
Latest branch head: 39257f3ea9d5edb366ca5d6f204f1033391a3470 (application code; latest reference-only CMS filtering changes)

## Work completed
1. Removed old conflicting global olive/forest storefront CSS from src/index.css; kept the shared base minimal and aligned loader to the violet/acid-lime reference style. src/styles/luxury-v3.css remains the main detailed storefront stylesheet.
2. Removed the duplicate old LuxuryExperienceLayer overlay from src/shop/ShopLayout.jsx and aligned storefront shell colors/branding to reference palette.
3. Fixed CMS merge in src/shop/AfsanaSignatureHome.jsx: if a page has canonical template rows where config.templateId is "afsana-neon-experience-v1", render those rows only, not legacy rows.
4. Fixed admin/cms/HomepageBuilder.jsx: when canonical template rows exist for a page, show those in the builder list instead of old merged sections.
5. Fixed services/cmsService.js public API: if canonical template rows exist for a page, return those rows only; otherwise return its existing sections.

Recent commits:
- 78974b23c39454a77305e905f719e341b58f2111 — remove legacy storefront CSS conflicts
- bb67e91bd21a71543d007f8100e40b97028604cc — canonical reference storefront shell
- d2d0873dcb15e3e3662e37c43c8977f36d2a0441 — render canonical template sections only
- ec12f8dc611f2fed1d29fe4ba9185fcf990dfa67 — hide old merged rows in CMS builder
- 0af66718ea181cbef1f5cc65254e0e873bde3f4b — filter old rows in CMS public API

Important: Old MongoDB CMS documents have NOT been physically deleted. They are hidden/excluded when a canonical template exists. Do not say they were deleted. Only physically delete if user explicitly asks and relevant records/backups are checked.

## Latest Cloudflare deployment
Latest deployment ID: 457359c4-f1db-4811-92c1-601ae1365fd6
Latest Worker version: 260cfeb9-75a2-41a8-8a1e-5fb5d7670a3f
Traffic: 100%
Latest commit sent for deployment: 39257f3ea9d5edb366ca5d6f204f1033391a3470
Cloudflare build trigger is already configured for this Worker; caching is enabled.

## Existing Worker architecture
- Static Vite dist served by Cloudflare Worker assets.
- Immutable hashed assets cached for one year; HTML shell cached 60 seconds with stale-while-revalidate.
- API requests proxied to https://afsanayaar.netlify.app/api
- Selected public GET endpoints cache; private/auth API bypasses cache and uses no-store.
- Mongo health endpoint: /api/health/mongodb using the existing Durable Object binding.
- cloudflare/wrangler.toml uses worker.js, ../dist assets, SPA fallback, /api routed through Worker first, MongoDBConnection Durable Object and smart placement.
Do not silently change API upstream without testing existing backend.

## Next tasks when continuing
1. Confirm branch HEAD is latest and check Cloudflare build + deployment 100% traffic.
2. Runtime-check live Worker: /, /shop, /admin/login, /admin/cms, Mongo health, /api/cms/public, asset cache headers.
3. Verify only canonical sections are returned/rendered; investigate any old CMS rows still appearing.
4. Run tests/build and fix actual errors; never claim all errors are cleared without evidence.
5. Keep the Cloud home strictly reference-only: canonical/neon/reference section rows are allowed; legacy homepage rows must never be resurrected when the canonical layout is absent.

User prefers quick, direct progress and does not want repeated questions or long recaps.
