# Afsana Perfumes — Cloudflare architecture

## Hosting and runtime
Cloudflare is the sole hosting target. The storefront is built with Vite and deployed as Cloudflare static assets. API requests use the Cloudflare Worker / Pages Functions entry point in `functions/api/[[path]].js`.

## API handlers
Shared route handlers live in `api/handlers/<group>/index.js`. The Cloudflare API adapter resolves the first `/api/<group>` path segment, forwards the request to the matching handler, and converts the handler response to a Web Response.

The handler groups include account, analytics, audit, auth, backup, cart, CMS, coupons, customers, finance, growth, health, inventory, media, notifications, orders, permissions, products, purchase orders, returns, reviews, roles, settings, shipping, staff, suppliers, taxonomy and wishlist.

## Data and security
- MongoDB Atlas remains the persistent application database; production database: `afsana_live`.
- Authentication, session validation, permissions, validation, rate limiting and audit logging are enforced by shared middleware and services.
- Production secrets stay in Cloudflare Worker settings and GitHub Actions secrets. Do not put credentials in source control.
- Do not run seed/reset scripts or modify production records during a code restore.

## Frontend
- Storefront routes live under `src/`.
- Admin routes and dashboard components live under `admin/` and `src/App.jsx`.
- API clients live in `src/services/`.
- Tailwind CSS is the dashboard styling system.

## Development and deployment
See `DEPLOY.md` for the local check commands and the Cloudflare deployment workflow.
