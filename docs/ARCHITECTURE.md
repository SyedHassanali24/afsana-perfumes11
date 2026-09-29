# Afsana Perfumes — Architecture (Phase 2 design)

Spec-mandated design pass. Source of truth: the master JSON. Everything below is what Phases 3–12 build against.

## 1. Collections
All 41 collections from the spec exist in `database/models/`. **Added** (spec implied them but did not list): `sessions`, `permissionHistory`, `bundles`, `flashSales`, `couriers`, `shippingRates`, `counters`.

| File | Models |
|---|---|
| `auth.js` | User, Session, Permission, Role, Staff, PermissionHistory, Customer |
| `catalog.js` | Category, Collection, Brand, FragranceFamily, Product, ProductVariant, Bundle, Review, Wishlist |
| `inventory.js` | Inventory, InventoryTransaction, Supplier, PurchaseOrder |
| `sales.js` | Order, OrderItem, Payment, Courier, ShippingRate, Shipment, Return, Refund, Cart, AbandonedCart, Counter |
| `marketing.js` | Coupon, FlashSale, Campaign, GiftCard, LoyaltyTransaction |
| `cms.js` | Banner, HomepageSection, Menu, Page, Faq, Announcement, EmailTemplate |
| `ops.js` | Notification, Expense, AnalyticsEvent, AuditLog, Setting |

Key decisions
- **users vs staff/customers**: `users` = credentials + status only. `staff` / `customers` = profiles pointing at a user. One login path for both.
- **Stock lives per variant** (`inventory.variantId` unique). `available = current - reserved` is a virtual, never stored.
- **Overselling is prevented inside the DB update** (`Inventory.reserve`): the `available >= qty` check is part of the `findOneAndUpdate` filter, so if stock is 1 and two buyers race, exactly one gets a document back and the other gets `null`. Use it inside a Mongo transaction with order creation (Atlas replica set supports this).
- **Snapshots on orders** (customer, address, item name/price/cost) so later edits never rewrite history.
- **Soft delete** (`isDeleted`) on products, variants, customers, staff, roles, taxonomy, coupons, banners, pages, suppliers. Orders have no delete path.
- **`storeId` = 'main'** on major collections for future multi-store.
- **AuditLog is append-only** — update/delete operations throw at model level.
- **Images**: URLs + metadata only.
- `autoIndex:false` in production; run `npm run db:indexes` after schema changes.

## 2. Authentication
- Login → verify bcrypt hash → create `Session` (random token; only its SHA-256 is stored) → set **HTTP-only, Secure, SameSite=Lax cookie** containing a signed JWT `{ uid, sid }` (15 min) refreshed against the session (sliding, max 7 days).
- Every request: verify JWT → load session → reject if `revokedAt`/expired → load user/staff status (Suspended/Disabled = instant lockout) → check **working hours**.
- Brute force: `failedLoginCount` + `lockedUntil` (5 fails → 15 min) plus IP rate limit on `/auth/*`.
- Session features: list (device, IP, last active), revoke one, logout-all-devices (`revokedAt` on all).
- High-risk actions (see `HIGH_RISK` in `constants.js`) require password re-entry (or a fresh login < 5 min) **and** write an AuditLog row.
- Customers and staff share this flow but use separate cookie names and separate route prefixes.

## 3. RBAC model
`User → Staff → Role (+ overrides) → Grants { module, actions[], scope } → Field rules`

**Resolver** (`middleware/permissions.js`, Phase 4), for request `(module, action, record?)`:
1. Staff status must be Active; working-hours window must pass.
2. Role `isUnrestricted` (Owner) → allow, still audited.
3. Collect role grants + staff overrides where `now ∈ [startsAt, expiresAt]` (expired overrides are ignored automatically).
4. Any matching **deny** override wins. Else allow if any grant covers `module.action`.
5. Apply **scope** to the query (`createdByMe` → `createdBy`, `assigned` → `assignedTo`, `cities`, `categories`, `products`) — done in the DB filter, not after fetching.
6. Strip **denied fields** from responses (`customer.phone`, `product.costPrice`, `order.profit`, `order.internalNotes` …) on the server.
7. Hierarchy: you may only edit staff/roles with a lower `level`; nobody can edit Owner; last Owner cannot be removed.
8. Every grant/override change → `PermissionHistory` + AuditLog.

Seeded roles: Owner (unrestricted), Super Admin (everything), Admin (everything except roles/permissions/security/backup/settings/payments), Manager (ops modules: view/create/edit/changeStatus, no cost/profit), Staff (view dashboard/orders/products). All except Owner are editable from the Roles UI.

## 4. API map (Netlify Functions, `/api/*`)
Response shape `{ success, ...data }` / `{ success:false, error:{ code, message } }`. Lists are paginated (`?page&limit&sort&q`), limit capped at 100. Every write validated (Zod) server-side. Centralised error handler returns "Something went wrong. Please try again." for unknown errors.

| Group | Endpoints | Notes |
|---|---|---|
| auth | POST login, logout, logout-all, refresh, register(customer), forgot/reset-password; GET me, sessions; DELETE sessions/:id | rate limited |
| products | GET /products, /products/:slug; POST, PATCH /:id, DELETE /:id (soft), POST /:id/restore; variants CRUD; GET /trash | public read = Active only |
| taxonomy | categories, collections, brands, fragrance-families CRUD | |
| inventory | GET /inventory, /low-stock, /history; POST /adjust (reason required) | atomic; audited |
| suppliers / purchase-orders | CRUD; POST /purchase-orders/:id/receive | receive → stock tx |
| orders | GET list/:id; POST (checkout); PATCH /:id/status; POST /:id/notes; POST /:id/cancel | checkout = reserve stock in a transaction |
| payments | GET; PATCH /:id (mark paid, upload proof) | COD, Bank Transfer |
| shipping | couriers, rates, shipments CRUD; GET /track/:orderNumber (public) | |
| returns / refunds | POST return; PATCH status; POST refund | refund = high-risk |
| customers | GET, PATCH, DELETE(soft), export | export = high-risk |
| cart / wishlist | GET, POST item, PATCH qty, DELETE item, POST apply-coupon | guest token or session |
| reviews | POST (customer); GET public; PATCH moderate | |
| coupons / marketing | coupons, flash-sales, campaigns, gift-cards, loyalty | validate coupon server-side only |
| cms | homepage sections, banners, menus, pages, faqs, announcements | public GET cached |
| analytics | GET dashboard, sales, products, customers; POST /events | |
| staff / roles / permissions | CRUD; POST /staff/:id/overrides; GET /permissions/catalog | |
| notifications | GET, PATCH read | |
| audit / settings / backup | GET /audit-logs; GET/PATCH /settings/:key; POST /export/:type | |

Function layout: `netlify/functions/<group>/<handler>.js`, each wrapped by `middleware/withApi.js` = `connectDB → rateLimit → authenticate → authorize(module, action) → validate → handler → errorHandler`.

## 5. Frontend routes
**Customer** (`src/pages`): `/`, `/shop`, `/category/:slug`, `/collection/:slug`, `/product/:slug`, `/search`, `/cart`, `/checkout`, `/track`, `/wishlist`, `/login`, `/register`, `/account` (orders, addresses, loyalty, coupons, reviews, profile, password), `/page/:slug`, `/faq`.

**Admin** (`admin/`, prefix `/admin`): existing — `/admin`, `/products`, `/inventory`, `/orders`. To build — `/analytics`, `/customers`, `/suppliers`, `/purchase-orders`, `/shipping`, `/payments`, `/returns`, `/marketing/*`, `/cms/*`, `/finance`, `/reports`, `/staff`, `/roles`, `/audit-logs`, `/security`, `/settings`. Route guards call `GET /auth/me` for the permission set (UX only — the server is the authority).

## 6. Running Phase 2
```bash
npm i mongoose bcryptjs dotenv
# package.json scripts:
#   "db:seed": "node database/seed/index.js",
#   "db:indexes": "node database/indexes/sync.js"
cp .env.example .env   # fill MONGODB_URI (DEV cluster/db), MONGODB_DB_NAME=afsana_dev, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:seed
```
Seed refuses to run when `NODE_ENV=production` or the db name contains "prod".
