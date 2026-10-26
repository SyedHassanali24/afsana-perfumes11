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
- Login → verify bcrypt hash → create `Session` row (only the SHA-256 of a random `jti` is stored) → set **HTTP-only, Secure, SameSite=Lax cookie** (`afsana_staff`) holding a JWT `{ sid, jti }` signed with `JWT_SECRET` (min 32 chars). Session lives 7 days and is checked against the DB on **every** request, so revoking a session, suspending a user or changing a role takes effect immediately.
- Every request: verify JWT → load session (not revoked/expired, hash matches) → load user + staff (must be Active) → check **working hours** (Owner exempt).
- CSRF: all non-GET requests must carry `X-Requested-With: afsana` (added by `src/services/api.js`); browsers cannot send it cross-origin without a CORS preflight.
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

## 7. Phase 3 — API layer (built)
Pipeline per request (`middleware/withApi.js`): route match → rate limit → CSRF header → DB → authenticate → permission check → validate (Zod) → password re-auth (high-risk) → handler → centralised safe errors.

| Function | Endpoints |
|---|---|
| `auth` | POST `/login` `/logout` `/logout-all`, GET `/me` `/sessions`, DELETE `/sessions/:id` |
| `products` | public: GET `/`, `/:slug` · admin: GET `/admin/list` `/admin/trash` `/admin/:id`, POST `/admin`, PATCH `/admin/:id`, POST `/admin/:id/variants`, PATCH `/admin/:id/variants/:variantId`, DELETE `/admin/:id`, POST `/admin/:id/restore` |
| `inventory` | GET `/`, `/history`, POST `/adjust` |
| `orders` | public: POST `/` (checkout), GET `/track/:orderNumber?phone=` · admin: GET `/admin/list` `/admin/:id`, PATCH `/admin/:id/status` `/admin/:id/payment`, POST `/admin/:id/notes` |

Business rules enforced server-side
- Checkout recomputes every price from the DB, validates the coupon, reserves stock **atomically** inside a transaction (any unavailable unit → whole order rolls back with `OUT_OF_STOCK`).
- Stock lifecycle: reserve at checkout → commit (leaves shelf) at **Shipped** → release on cancel before shipping / restock on cancel after shipping.
- Order status changes follow an allowed-transition table and use compare-and-set (two staff cannot apply the same change twice). Delivered COD orders become Paid.
- Price changes: need `products.managePrice` **and** password re-auth **and** are audit-logged. Stock adjustments, product delete: re-auth + audit. Cost price is never returned publicly and is stripped for staff with `product.costPrice` denied.
- Public tracking requires order number **and** the phone used on the order.

Known limits (planned, not forgotten)
- Rate limiter is per warm function instance — move to a shared store before heavy traffic.
- Guest customers are matched by phone; customer login/registration arrives in Phase 6.
- Shipping fee is flat 250 (free ≥ 5000) until the Settings module exists (`Setting` key `shipping` already overrides it).
- Flash-sale pricing is not applied at checkout yet (Phase 8).

## 8. Run Phase 3 locally
```bash
npm i zod jsonwebtoken            # (mongoose bcryptjs dotenv from Phase 2)
npm i -D netlify-cli
# .env: JWT_SECRET must be 32+ random chars
npx netlify dev                   # serves Vite + /api/* functions together on :8888
node --test tests/core.test.js    # pure-logic tests (no DB needed)
```
Then `POST /api/auth/login` with the seeded Owner email/password.


## Phase 4 addendum — access management
| Group | Endpoints | Permission |
|---|---|---|
| staff | GET /, /:id, /assignable-roles, /:id/sessions; POST /, /:id/reset-password, /:id/overrides; PATCH /:id; DELETE /:id, /:id/overrides/:oid, /:id/sessions | staff.*, temporaryAccess.*, sessions.* (writes need confirmPassword) |
| roles | GET /, /:id; POST /; PATCH /:id; DELETE /:id | roles.* |
| permissions | GET /catalog (any staff), /history | permissions.view |
| audit | GET / (filters: action prefix, module, user, dates) | auditLogs.view |
| account (customer) | POST register, login, logout, forgot-password, reset-password, change-password; GET/PATCH me | own session (`afsana_customer` cookie, 30 days) |

Guards live in `services/accessRules.js` (pure). Staff and customer cookies are different and a customer session can never pass `authenticate()` (kind check).


## Phase 5 addendum — catalog & inventory
| Group | Endpoints | Permission |
|---|---|---|
| taxonomy | GET/POST `/{type}`, PATCH/DELETE `/{type}/:id`; GET `/public/:type` | categories / collections / brands (`fragrance-families` uses `categories`) |
| suppliers | GET, POST, PATCH /:id, DELETE /:id | suppliers.* |
| purchase-orders | GET, GET /:id, POST, PATCH /:id (Draft only), POST /:id/order, POST /:id/receive (password), POST /:id/cancel | purchaseOrders.view / create / edit / manageStock |
| inventory (added) | GET /summary, PATCH /:variantId/threshold | inventory.view / edit |
| products (added) | DELETE /admin/:id/variants/:variantId (password) | products.delete |

Stock flow with POs: **Ordered** adds to `incoming`; **receive** moves units `incoming → current` (one atomic pipeline update, `incoming` clamped at 0) and logs `po_receive`; **cancel** returns the un-received remainder of `incoming`. Every step runs in a Mongo transaction with an AuditLog row.


## Phase 6 — Shopping system (storefront)
- **Prices are never client-owned.** The browser stores only `{variantId, quantity}` (guest: `localStorage`; shopper: `carts` collection). Every screen that shows money calls `POST /api/cart/quote`, which reads variants / inventory / coupon from the DB and returns line statuses (`ok | limited | out_of_stock | unavailable`). `placeOrder` still re-prices and reserves stock atomically in a transaction, so a stale cart can never oversell.
- **Guest to shopper merge:** on login the local cart goes to `POST /cart/merge` (quantities add, capped at 20 per line and 30 lines), local storage is cleared, then changes sync with a debounced `PUT /cart`. Logout clears the in-memory and local cart.
- **`optionalCustomer` routes:** a public route can still receive the shopper session (`ctx`); used by `/cart/quote` (per-customer coupon rules) and `POST /orders` (order attached to the account, saved cart cleared). A missing or invalid cookie means guest.
- **Own-data access:** `/account/orders*` and `/addresses*` always filter by the session's `customerId`; the customer order shape omits `costPrice`, internal notes and staff ids.
- **Frontend layout:** `src/shop/` (layout, contexts, pure `cartLogic`), `pages/` (public), `account/` (behind `RequireCustomer`). Every data screen uses `StateBox` (loading / error + retry / empty).


## Phase 7 addendum — returns & refunds
| Group | Endpoints | Permission |
|---|---|---|
| returns (shopper) | GET `/mine`, `/mine/:returnNumber`, `/mine/eligibility/:orderNumber`; POST `/mine`, `/mine/:returnNumber/cancel` | own session (`afsana_customer`), own orders only |
| returns (staff) | GET `/admin/list`, `/admin/:id`, `/admin/eligibility/:orderNumber`; POST `/admin` (log a return for a customer); PATCH `/admin/:id/status` (Approved / Rejected / Received) ; POST `/admin/:id/refund` | returns.view / create / changeStatus; **refunds.refund + confirmPassword** for refund |

Rules (pure, tested in `services/returnRules.js`)
- Return only after **Delivered** and only for a **Paid** order, within the window (default **7 days from the first Delivered entry**; Setting key `returns` = `{ windowDays }`, 1-90). Staff may accept a late return (audited).
- Partial returns: per order line `remaining = bought - units in Pending/Approved/Received/Refunded returns`. Rejected/Cancelled returns give units back.
- Flow: Pending -> Approved -> Received -> **Refunded** (refund action only). Pending/Approved can be Rejected (note required) or Cancelled (shopper).
- Received: Resellable -> units back on shelf (`return` stock tx). Damaged -> only `damaged` counter (+ zero-delta history row), never sellable.
- Refund: amount <= order total minus earlier refunds. Suggested = returned lines minus their share of the order discount, plus delivery fee only when reason is Wrong Product/Damaged AND every unit is back. Refund row + AuditLog `refund.issued`. Payment -> Partially Refunded / Refunded; `customer.stats.totalSpent` reduced.
- **Order status is derived from returns** (`deriveOrderStatus`): Return Requested / Returned / Refunded / back to Delivered. `orderService.TRANSITIONS` no longer allows manual moves out of Delivered.
- Concurrency: every return/refund write first bumps `order.returnRevision` inside the transaction, so two people acting on one order conflict and retry (no over-return / double refund).
