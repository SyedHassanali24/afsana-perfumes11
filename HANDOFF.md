# Afsana Perfumes — project handoff

## Current project target
Cloudflare only. The production domain is `https://afsana-perfumes.store`; the admin route is `https://afsana-perfumes.store/admin`. The Worker endpoint is `https://afsana-perfumes11.eastwala12.workers.dev/`.

## Preserve these
- Hassan purple Tailwind admin/dashboard baseline.
- Storefront and existing content/design.
- MongoDB Atlas production database `afsana_live`; do not reseed, reset or delete data.
- Existing authentication, roles, permissions, session security and audit controls.
- Referral/affiliate, commission, traffic analytics and advanced CMS functionality.

## Source layout
- `src/`: storefront and app routes.
- `admin/`: admin dashboard UI.
- `api/handlers/`: shared API route handlers.
- `functions/api/`: Cloudflare API adapter.
- `database/`, `services/`, `middleware/`, `validation/`: data and business logic.
- `cloudflare/`: Worker configuration and entry point.

## Required verification before production
1. `npm install`
2. `npm run check`
3. `npm test`
4. `npm run build`
5. Verify Cloudflare Worker routes and MongoDB connectivity without changing production data.
6. Browser-check storefront, /admin login, categories, products, CMS, referrals and analytics.

No production deployment should be described as complete until the Cloudflare workflow and live smoke checks pass.
