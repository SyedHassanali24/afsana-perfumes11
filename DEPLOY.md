# Afsana Perfumes — Cloudflare deployment guide

The live application is deployed as a Cloudflare Worker with static assets. Configure Worker bindings and secrets in Cloudflare, then deploy from the approved GitHub branch using the repository Cloudflare workflow. Do not use Netlify for hosting or API execution.

## Local checks

1. Install dependencies with `npm install`.
2. Run `npm test`, `npm run check`, and `npm run build`.
3. Add local Worker secrets to `.dev.vars` (never commit this file).
4. Run `npm run api` in one terminal and `npm run dev` in another. Vite proxies `/api/*` to the local Worker at port 8787.

## Production

Set `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, `SITE_URL`, `ALLOWED_ORIGINS`, and any enabled integration secrets as Cloudflare Worker secrets/variables. Confirm the `MONGODB_CONNECTION` Durable Object binding and static asset binding are configured in Wrangler. Deploy only after all CI checks pass and the Hassan visual baseline diff is confirmed unchanged.

The Cloudflare Worker serves both the API and the built storefront. The API keeps `Cache-Control: no-store, private` for safety; media and static assets use their route-specific caching rules.
