# Afsana Perfumes — current handoff

## Hosting and runtime
- Production storefront and API are served by the Cloudflare Worker.
- Static assets are served through the Worker's Cloudflare Assets binding.
- API route modules live in `cloudflare/api/<group>/index.js`.
- `functions/api/[[path]].js` is the Worker request adapter.
- Local API development: `npm run api` (Wrangler on port 8787); Vite proxies `/api/*` to it.
- Production deployment is managed by `.github/workflows/cloudflare-worker.yml`.
- Netlify hosting, Netlify Functions, and Netlify runtime dependencies are not used.

## Important project safety
- Preserve the approved Hassan storefront and dashboard visual baseline.
- Do not make visual/UI changes as part of backend, hosting, or upload fixes.
- Do not deploy to production until CI, API smoke checks, media upload/read-back checks, and baseline comparison pass.
- Keep the existing Cloudflare Worker bindings, Durable Object, MongoDB connection, secrets, domain, and WhatsApp webhook configuration intact.

## Local verification
```sh
npm install
npm run check
npm test
npm run build
npm run api
npm run dev
``

API and media checks must run against a configured test environment before production deployment. Never put secrets in source control.
