# Afsana Perfumes — Project Handoff (after Phase 7)

**How to continue in a NEW Claude account/chat**
1. Paste this whole file as the first message.
2. Attach: `afsana-full-repo.zip` (complete code, everything below is in it) and the master JSON spec file (`afsana-perfumes` spec — it is the source of truth; it was NOT available in earlier chats, so Phase numbers after 4 are partly inferred, see "Roadmap").
3. Also attach (or paste) the user's own `package.json`, `vite.config`, `index.html`, `src/main.jsx` and the file with their router — they are NOT in the repo zip.
4. Then say which step to do (see "Next steps"). One step per request keeps output small and safe.

**Language/style:** the user writes Roman Urdu — reply in Roman Urdu. Keep answers short and practical. The user is not a developer: give exact commands and say what they should see. When you finish a step, give a zip of the new/changed files + a short "aap ko yeh karna hai" list.

---
## Project
"Afsana Perfumes": production-level perfume e-commerce platform.
Stack: React + Vite (frontend), Node.js on Netlify Functions (API), MongoDB Atlas + Mongoose, GitHub + Netlify.
Payments initially: Cash on Delivery and Bank Transfer. Single store (`storeId: 'main'` kept for the future). Currency PKR.
Design: ink-green near-black `#12140F`, antique gold `#C6A15B`, ivory text; fonts Fraunces (headings) + Inter (body); light/dark/system theme via `data-theme`; tokens in `src/styles/tokens.css`, Tailwind config extends them (classes like `bg-bg text-ink text-ink-muted border-border bg-surface text-danger bg-danger-soft ...`).

## Non-negotiable rules (from the spec)
- Frontend never talks to MongoDB. Secrets only in Netlify env vars; never commit `.env`.
- All permissions enforced **server-side**; frontend hiding (`can()`) is only UX.
- Validate every write on the server (Zod); pagination on lists, indexes, soft delete, audit logs for sensitive actions.
- No giant files; reusable components; loading / empty / error states everywhere.
- Never leak stack traces/raw Mongo errors (central `middleware/errors.js`).

## STATUS — read this first
**Nothing has ever been run against a real MongoDB or in a browser.** The sandbox Claude works in has no npm network, so code was checked only by: `node --check` on every backend file, `node tools/check-syntax.js` (JSX parses), and **46 passing unit tests** for the pure logic. The first real run will probably reveal small bugs (typos, wrong field names, a missing import). **Step 0 below is mandatory before building more.**

| Phase | Status |
|---|---|
| 1 UI Foundation | Admin UI shell + components done. Dashboard and Orders screens still on **mock data**. |
| 2 Database | Done: 48 Mongoose models, constants, seed, index sync. |
| 3 API layer | Done: auth, products, inventory, orders. |
| 3b Wire admin to API | Login/guard ✔, Products ✔, Inventory ✔. **Orders ✘, Dashboard ✘.** |
| 4 Auth/RBAC | Done: staff / roles / permissions / temporary access / sessions / audit log APIs + UI; forced password change; customer register/login/reset (API + pages). |
| 5 Catalog & Inventory | Done: taxonomy, suppliers, purchase orders, stock screens, richer product form. (Inferred scope, see Roadmap.) |
| 6 Shopping system / storefront | Done (unverified, see STATUS): server-priced cart (guest + account), wishlist, saved addresses, customer order history, home / shop / product / cart / checkout / success / track pages, account area. |
| 7 Returns & refunds | Done (unverified against real DB/browser, see STATUS). Shopper requests/cancels returns; staff approve/decline/receive/refund; stock, payment, order status, audit all wired. Scope was INFERRED (spec unavailable). |
| 8–12 | Not started. |

## Step 0 — verify what exists (do this first, ask the user for results verbatim)
```bash
npm i mongoose bcryptjs dotenv zod jsonwebtoken lucide-react recharts react-router-dom
npm i -D netlify-cli typescript
# package.json scripts:
#   "db:seed": "node database/seed/index.js", "db:indexes": "node database/indexes/sync.js",
#   "test": "node --test", "check": "node tools/check-syntax.js"
# .env: MONGODB_URI, MONGODB_DB_NAME=afsana_dev, JWT_SECRET (32+ chars), ADMIN_EMAIL, ADMIN_PASSWORD (10+ chars), SITE_URL=http://localhost:8888
npm test && npm run check
npm run db:seed          # DEV ONLY: refuses if NODE_ENV=production or db name contains "prod". Re-run after constants change.
npx netlify dev          # Vite + /api together on :8888
```
Then in `main.jsx`: `<BrowserRouter><AuthProvider><CustomerAuthProvider><CartProvider><WishlistProvider><App/></WishlistProvider></CartProvider></CustomerAuthProvider></AuthProvider></BrowserRouter>` (order matters; `CartProvider` is in `src/shop/CartContext`, `WishlistProvider` in `src/shop/WishlistContext`); ALL routes (admin + storefront) are in `src/AppRoutes.example.jsx` (copy into their App; it replaces the old `AdminRoutes.example.jsx`). Manual checklist (admin): login at `/admin/login` → sidebar shows → Products list shows 3 seeded perfumes → create/edit/delete/restore a product → Inventory adjust (password) → Catalog setup add a brand → Supplier → Purchase order → order → receive → stock rises + history row → Staff page create a staff (temp password shown once) → that staff logs in and is forced to change password → Roles matrix edit → Audit log shows all of it. Manual checklist (storefront, Phase 6): `/` shows hero + categories + product rows → `/shop` filters / sort / search / pagination work → open a product, pick a size, Add to cart (header count rises) → `/cart` change qty / remove / coupon → refresh the page (cart survives) → `/checkout` as guest, place a COD order → success page; order visible in admin Orders and stock reserved → `/track` with order number + the SAME phone text → register/login → guest cart is merged into the account cart → checkout again as a customer → `/account` lists that order, detail page + progress timeline → add/edit/remove/default address → wishlist heart on a product (guest is sent to /login) → `/wishlist` → logout empties the cart. Fix any bug found before new features.

## Repo map
```
admin/
  returns/      ReturnsList (tabs by status, search) ReturnDrawer (approve/decline/receive/refund + history) NewReturnDrawer (staff logs a return)
  components/   AdminLayout, Sidebar (permission-gated nav), Topbar, Button, Card, DataTable, Drawer(size md|lg|xl), FormFields(Field, Input, Select, Textarea, Check),
                StatusPill, StatCard, ConfirmDialog (yes/no), ConfirmPasswordModal (re-auth), TempPasswordModal
  dashboard/    Dashboard + mockData.js            <- STILL MOCK
  orders/       OrdersList, OrderDetailDrawer, OrderTimeline, mockOrdersData.js   <- STILL MOCK
  products/     ProductsList, ProductFormDrawer (brand, fragrance, notes, collections, picture URLs, sizes)
  inventory/    InventoryList (4 tabs) StockTab HistoryTab StockAdjustDrawer PurchaseOrdersTab PurchaseOrderDrawer PurchaseOrderFormDrawer SuppliersTab VariantPicker
  catalog/      CatalogPage, TaxonomyTab, TaxonomyDrawer (categories/collections/brands/fragrance families)
  staff/        StaffPage (tabs) StaffList StaffFormDrawer StaffDetailDrawer RolesList RoleEditorDrawer PermissionMatrix AuditLogList
  account/      MyAccountPage (own password + own sessions)
  README.md     OUTDATED (Phase 1 wiring notes; AdminLayout no longer takes user/activeHref props)
src/
  shop/         (Phase 6 storefront) ShopLayout, ProductCard, ui.jsx (Container, StateBox, Pager, QtyStepper…), CartContext (guest=localStorage, shopper=server, merge on login), WishlistContext, useQuote, cartLogic (pure), format.js, useTitle
    pages/      HomePage ShopPage ProductPage CartPage CheckoutPage OrderSuccessPage TrackOrderPage
    account/    AccountPage (tabs incl. Returns) ReturnsSection (request/cancel on order page) MyReturns OrderDetailPage MyAddresses MyProfile WishlistPage
  auth/         AuthContext (status, user, permissions, mustChangePassword, can()), RequireAuth, LoginPage, ChangePasswordPage/Form, AuthCard, permissions.js, fieldLabels.js
  customer/     CustomerAuthContext, RequireCustomer, CustomerLoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage   (storefront shell NOT built)
  services/     api.js (fetch wrapper: credentials, X-Requested-With:'afsana', ApiError{status,code,message,details}), index.js (all *Api objects), mappers/products.js
  hooks/        useApi (loading/error/data/reload), useDebounce
  styles/tokens.css   AppRoutes.example.jsx (admin + storefront route table to copy)
database/       constants.js (MODULES, ACTIONS, SCOPES, HIGH_RISK, RESTRICTABLE_FIELDS, status enums), connection.js, models/*, seed/index.js, indexes/sync.js
middleware/     withApi (pipeline), auth (staff), customerAuth, permissions (resolver), redact, errors, http, router, rateLimit, pagination
services/       returnService returnRules(pure) cartService cartRules(pure) addressRules(pure) productService inventoryService orderService pricing staffService roleService taxonomyService supplierService purchaseOrderService accountService
                accessRules (pure) poRules (pure) permissionGroups phone mailer(stub) audit tx
validation/     common.js (objectId, bool, paging, confirmPassword), schemas.js (all Zod schemas)
netlify/functions/<name>/index.js   one function per group: auth products inventory orders staff roles permissions audit account taxonomy suppliers purchase-orders cart wishlist
tests/          core, access (rules + PO), permissions, mappers, cart, shopLogic, returns  -> `node --test` (46 tests)
tools/check-syntax.js   docs/ARCHITECTURE.md   netlify.toml   .env.example
```
NOT in the repo (user has them): `package.json`, `vite.config`, `index.html`, `src/main.jsx`, their router file.

## How the API layer works (copy this pattern for new endpoints)
Each `netlify/functions/<group>/index.js` exports `handler = createHandler('<group>', routes)`; the folder name MUST equal the group string (`/api/<group>/...` → function). A route:
```js
{ method:'PATCH', path:'/:id', permission:['staff','edit'],   // [module, action] from constants; omit for auth-only; public:true for no auth
  body: S.zodSchema, query: S.zodQuery, reauth: true,          // reauth = requires body.confirmPassword (re-checks password)
  rateLimit:{limit,windowMs}, cache: 60 /*public GET*/, audience:'customer' /*storefront session*/, allowPasswordChange:true,
  handler: async ({ ctx, params, query, body, req, ip, scopes }) => data /* or res(201, data, headers) */ }
```
- Put **static paths before `/:id`** (router is first-match). Response: `{success:true,...data}` / `{success:false,error:{code,message,details?}}`; validation → `VALIDATION_ERROR` with `details:[{path,message}]`. Lists: `{ items|<name>, pagination:{total,page,limit,pages} }` via `paging()`/`pageMeta()`.
- Pipeline: route match → rate limit → CSRF header (non-GET need `X-Requested-With: afsana`) → connectDB → authenticate → forced-password-change gate → permission → validate → reauth → handler → safe errors.
- Business logic lives in `services/*` (routes stay thin). Money/stock writes use `withTx` (Mongo transaction; fn may retry → all writes must use the `session`). Sensitive writes call `audit(ctx, {action, module, recordId, oldValue, newValue}, session)`.
- Field-level security: `redact(data, ctx.perms.deniedFields)` on responses containing cost/profit/phone/address/etc.
- Frontend pattern: `useApi(() => xApi.list(q), [deps])` for reads; a `*Api` object in `src/services/index.js`; one mapper per module if API shape ≠ UI shape; buttons gated with `can('module.action')`; high-risk writes open `ConfirmPasswordModal` and send `confirmPassword`; errors shown inline (`err.message`, `err.details`); every list has loading/empty/error/retry.

## Phase 6 — what was added (API)
- `POST /api/cart/quote` (public, guest + shopper): body `{items:[{variantId,quantity}], couponCode?}` → server-priced `lines` (each has `status`: ok | limited | out_of_stock | unavailable, and `available`), plus `subtotal, discount, shipping, total, freeShippingRemaining, canCheckout, coupon:{code,valid,message?}`. Never throws for stale items or a bad coupon. The client never sends prices.
- `GET/PUT /api/cart`, `POST /api/cart/merge` (shopper cookie): saved cart. Frontend: guest cart in localStorage; on login `merge` once, then debounced `PUT`.
- `GET /api/wishlist` → `{ids, products}`; `PUT|DELETE /api/wishlist/:productId`.
- `/api/account/orders`, `/orders/:orderNumber` (own orders only; no costs / internal notes), `/addresses` CRUD (max 10, exactly one default).
- `POST /api/orders` now has `optionalCustomer: true` (new route flag in `withApi`): with a valid shopper cookie the order is created on that account (`customerId`) and the saved cart is deleted; guests behave as before.
- `GET /api/products` gained `brand=<slug>`.
- `src/services/api.js`: a 401 from `/account`, `/cart`, `/wishlist` no longer fires the staff-logout event.

## Phase 7 — what was added (returns & refunds)
Full rules in `docs/ARCHITECTURE.md` ("Phase 7 addendum"). Summary:
- API group `returns` (`netlify/functions/returns`): shopper `/mine…` (own returns only) and staff `/admin…`. Refund = `POST /admin/:id/refund`, needs `refunds.refund` + `confirmPassword`, writes `Refund` + AuditLog `refund.issued`.
- Models: `Return` (returnNumber RET-000001, item snapshots, timeline, condition), `Refund` (method, reference), `Order.returnRevision` (concurrency lock). New constants `RETURN_STATUSES/REASONS/CONDITIONS`, `REFUND_METHODS`. Run `npm run db:indexes` (new unique index on `returnNumber`).
- Order status after delivery is now **derived from returns** (never edited manually). `orderService.TRANSITIONS` has no moves out of Delivered.
- Window: 7 days from delivery, overridable via `Setting` key `returns` `{ windowDays }`. Delivery fee refunded only when the shop was at fault and all units are back.
- Seeded roles: Owner/Super Admin/Admin can refund; Manager can handle returns but NOT refund (no `refunds` grant); Staff sees nothing. Change in Roles UI.
- `tools/check-syntax.js` now uses esbuild (TypeScript 7 removed the JS API the old version needed).
- Verified here: 46 unit tests + a 32-check integration run of `returnService` against a Mongo-compatible DB (no transactions there, so `withTx` was stubbed; the real transaction path is still UNTESTED).
- Not done on purpose: emails/SMS to customers (mailer is a stub), automatic bank payout, guest (not signed-in) return requests (staff can log those from **New return**), restock of `incoming`, refunds for orders without a return, reports for returns.
- Manual checklist (Phase 7): place a COD order as a shopper -> in admin mark it Shipped -> Delivered -> as the shopper open `/account/orders/<no>` -> "Request a return" (pick item + reason) -> admin `/admin/returns` shows it under Pending -> Approve -> Items received (Resellable) -> stock +1 and a `return` row in Stock history -> Issue refund (password) -> order shows Partially Refunded/Refunded, shopper sees "Refunded PKR …" -> Audit log has `refund.issued`. Also try: decline with a note (shopper sees it), shopper cancels a Pending return, staff "New return" on a late order, Manager role cannot see the refund button.

## Key design decisions (details in docs/ARCHITECTURE.md)
- **Auth:** staff cookie `afsana_staff`, customer cookie `afsana_customer` (both HTTP-only JWT `{sid,jti}`; a `Session` row checked every request; staff 7 days, customers 30). Lockout after 5 fails (15 min). Staff created/reset by an admin have `mustChangePassword` → API returns `403 PASSWORD_CHANGE_REQUIRED` for everything except me/logout/change-password.
- **RBAC:** User → Staff → Role (+ per-staff overrides with startsAt/expiresAt, allow/deny) → Grants `{module, actions[], scope}`; field-level `deniedFields`; working hours; Owner `isUnrestricted` (`GET /auth/me` returns `permissions.unrestricted:true, modules:{}` for Owner → UI `can()` handles it). Rules in `services/accessRules.js`: manage only strictly-lower level, nobody edits Owner, no self access changes, cannot grant access you don't hold, temporary allow needs expiry ≤ 90 days, system roles keep name/level.
- **High-risk actions** (list in `constants.HIGH_RISK`; price change, stock adjust/receive, delete, staff/role changes…) need `confirmPassword` + AuditLog. Codes `REAUTH_REQUIRED` / `REAUTH_FAILED`.
- **Stock:** one `inventory` doc per variant; `available = current − reserved`; `Inventory.reserve()` atomic. Lifecycle: reserve at checkout → commit at **Shipped** → release on cancel before ship / restock on cancel after ship. PO: Ordered adds `incoming`; receive moves incoming→current (`po_receive` history); cancel returns remainder.
- **Orders:** transition table in `orderService.TRANSITIONS`; compare-and-set on status; Delivered COD → Paid; `Refunded` only via the future refunds flow. Public tracking needs order number + phone.
- **Soft delete** (`isDeleted`) on products/variants/taxonomy/suppliers/staff/roles/customers; AuditLog and PermissionHistory are append-only.

## Next steps (suggested order — one per request)
1. **Step 0** (above). Fix bugs found; add a regression test where the bug was pure logic.
2. **Phase 3b-4 Orders screen → `ordersApi`**: list (filters status/paymentStatus/search/pagination), detail drawer, status change (respect `TRANSITIONS`; show only allowed next statuses — expose them from API or duplicate table in a mapper), notes, payment status. Mock is `admin/orders/mockOrdersData.js` (compare field names first: `_id` vs `id`, casing). Costs/profit/phone/address may be redacted → UI must tolerate missing fields.
3. **Phase 3b-5 Dashboard**: build `GET /api/analytics/dashboard` (module `dashboard`/`analytics`: today's orders/revenue, low stock count, recent orders, top products) and wire `Dashboard.jsx`; delete `mockData.js`.
4. **Phase 6 follow-ups** (small): storefront theme toggle (`data-theme`) in `ShopLayout`; shopper can cancel an order while `New`; reviews (model exists); reorder button; wishlist page should drop a card right after un-hearting; per-product SEO tags (`seo` fields exist); homepage sections/banners from CMS.
5. Later (inferred from comments/architecture, confirm against the spec; Phase 8 is next by numbering): Phase 8 marketing (coupons admin UI — coupon logic already works at checkout —, flash sales price application, bundles, gift cards, loyalty, campaigns), shipping (couriers, rates, shipments), CMS (homepage sections, banners, menus, pages, FAQ, announcements), reviews moderation, analytics & finance/expenses, notifications, settings, export/backup, image upload/CDN, real email (`services/mailer.js` is a stub that only logs in dev), then security audit + permission tests, inventory race-condition test on a real DB (spec: "stock = 1, two buyers"), GitHub cleanup, Netlify deploy (env vars, verify API + Mongo, replace in-memory rate limiter).

## Known limits / TODO notes
- In-memory rate limiter (per warm function instance) → replace with a shared store before real traffic.
- Guest customers are matched by raw phone string (no normalisation/unique index); customer accounts are NOT auto-linked to guest orders (phone unverified — needs OTP/email verification first). `services/phone.js` normalises to +92… for accounts only.
- Shipping fee flat 250, free ≥ 5000, overridable by `Setting` key `shipping`. Flash-sale prices not applied at checkout yet; coupons work.
- `PATCH /products/admin/:id` replaces nested objects (`fragrance`, `notes`, `content`, `media`…) wholesale — UI must send the full object (mapper does). A product's brand can be changed but not cleared. Images are URLs only.
- `setDeleted` on a product also restores individually-deleted sizes on restore.
- Email/SMS/WhatsApp sending not built (password reset link is only logged in dev; no order-confirmation or return/refund messages).
- Admin Orders screen still on mock data: when wiring it (step 2), do NOT offer manual status moves out of Delivered; link to Returns instead.
- Public tracking (`/track`) matches the phone exactly as typed at checkout (guest phones are not normalised): "0300 1234567" vs "03001234567" will NOT match. Signed-in shoppers use `/account/orders/:no` instead. Fix with phone normalisation + a unique index when guest accounts get linked.
- `BANK_NOTE` in `src/shop/format.js` is PLACEHOLDER text for bank-transfer instructions (real details should come from Settings). Homepage hero / value-prop copy is static.
- Storefront has no theme toggle yet (follows system via tokens.css); product images are URLs only.
- The quote is advisory: stock and prices are re-checked and stock reserved atomically when the order is placed (`OUT_OF_STOCK` / `ITEM_UNAVAILABLE` are shown on checkout).
- `admin/README.md` is outdated.

## Working notes for the next Claude (sandbox gotchas)
- The sandbox has **no npm/network**: you cannot run Vite, Mongo or the API. What you CAN run: `node --check <file>`, `node tools/check-syntax.js` (needs the global `typescript`; skip if missing), `node --test` (pure-logic tests; `tests/core.test.js` etc. work because those modules have no npm deps). Keep new business rules in **pure modules** (like `accessRules.js`, `poRules.js`) so they can be unit-tested here. ESM files in `src/` are tested by loading them as a `data:` module (see `tests/mappers.test.js`).
- The repo root is CommonJS (`require`) for backend + tests; `src/` and `admin/` are ESM/JSX (Vite).
- Use `mkdir -p a b c` (not `{a,b}` brace expansion: the shell there is plain `sh`).
- Before saying "done", run: `for f in services/*.js middleware/*.js netlify/functions/*/index.js validation/*.js; do node --check $f; done; node tools/check-syntax.js; node --test`.
- Be honest in the summary that nothing is verified against a real DB/browser; ask the user to run it and paste errors verbatim.
- Deliver as a zip of changed/new files (+ updated HANDOFF.md), then a short Roman-Urdu summary: what was built, what the user must do, what was deliberately not done.
