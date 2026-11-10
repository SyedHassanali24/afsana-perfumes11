# Afsana Perfumes — Cloudflare deployment

Afsana is hosted by the Cloudflare Worker and its Static Assets binding. MongoDB Atlas remains the database.

## Local development
1. Install dependencies: `npm install`.
2. Put local secrets in Wrangler's `.dev.vars` file (never commit secrets).
3. Run `npm run api` to start the Worker on port 8787.
4. In a second terminal run `npm run dev`; Vite proxies `/api/*` to the Worker.
5. Verify with `npm run check`, `npm test`, and `npm run build`.

## Production safety
- Preserve the existing Cloudflare Worker bindings, Durable Object, media KV namespace, domain, and variables.
- Production deployment remains manually gated in `.github/workflows/cloudflare-worker.yml`. Do not trigger it unless the exact reviewed change has been approved with `DEPLOY-HASSAN-APPROVED`.
- Configure Worker secrets in Cloudflare: `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, and only the integration secrets that are enabled.
- Confirm product images upload and read back, authentication, CMS, products, and dashboard APIs before production release.
- The Hassan storefront/dashboard visual baseline must remain unchanged.

## Health checks
- `/api/health` checks application/database configuration.
- `/api/health/mongodb` checks the Cloudflare MongoDB connection.
