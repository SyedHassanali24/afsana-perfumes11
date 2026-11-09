# Afsana Perfumes — Cloudflare deployment

Cloudflare is the only hosting and runtime target for this project.

## Runtime layout
- Storefront: Vite build output in `dist/`.
- API: Cloudflare Worker / Pages Functions under `functions/api/`.
- Shared API handlers: `api/handlers/<group>/index.js`.
- Database: MongoDB Atlas, database name `afsana_live` in production.
- Secrets are configured in Cloudflare Worker settings; never commit credentials.

## Local checks
```bash
npm install
npm run check
npm test
npm run build
```

For local API testing after building:
```bash
npm run api
```
Then run the Vite dev server separately with `npm run dev`; its `/api` proxy targets the local Cloudflare runtime on port 8788.

## Production deployment
The GitHub Actions workflow `.github/workflows/cloudflare-worker.yml` builds the frontend and deploys `cloudflare/wrangler.toml` to Cloudflare when changes reach `main`.

Required GitHub Actions secret:
- `CLOUDFLARE_API_TOKEN`

Required Cloudflare Worker bindings/secrets are documented in `cloudflare/wrangler.toml` and include the MongoDB connection, JWT secret, allowed origins, and any enabled email/WhatsApp integration values.

Do not change or reseed the production MongoDB database as part of a frontend deployment. Run database migrations/index synchronization only when explicitly required and after a backup.
