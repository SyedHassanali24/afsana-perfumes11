# Afsana Perfumes — Project Handoff (after Phase 7, Orders + Dashboard wired, first real run done, Phase 8 step 1 = Coupons admin written)

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
**FIRST REAL RUN DONE (user's Windows PC, Oct 2026):** seed + index sync OK, `netlify dev` runs, admin login works, Dashboard (empty DB) and Products list (3 seeded perfumes) render from the real API. EVERYTHING ELSE below is still unverified in a browser/real DB (inventory, orders, staff, roles, audit, returns, storefront, and the new Coupons screen). Older text follows: **Nothing had been run against a real MongoDB or in a browser before that.** The sandbox Claude works in has no npm network, so code was checked only by: `node --check` on every backend file, `node tools/check-syntax.js` (JSX parses), and **72 passing unit tests** for the pure logic. The first real run will probably reveal small bugs (typos, wrong field names, a missing import). **Step 0 below is mandatory before building more.**

| Phase | Status |
|---|---|
| 1 UI Foundation | Admin UI shell + components done. All admin screens built so far are live (no mock data left). |
| 2 Database | Done: 48 Mongoose models, constants, seed, index sync. |
| 3 API layer | Done: auth, products, inventory, orders. |
| 3b Wire admin to API | Login/guard ✔, Products ✔, Inventory ✔, **Orders ✔ (unverified in browser/DB)**, **Dashboard ✔ (unverified in browser/DB)**. |
| 4 Auth/RBAC | Done: staff / roles / permissions / temporary access / sessions / audit log APIs + UI; forced password change; customer register/login/reset (API + pages). |
| 5 Catalog & Inventory | Done: taxonomy, suppliers, purchase orders, stock screens, richer product form. (Inferred scope, see Roadmap.) |
| 6 Shopping system / storefront | Done (unverified, see STATUS): server-priced cart (guest + account), wishlist, saved addresses, customer order history, home / shop / product / cart / checkout / success / track pages, account area. |
| 7 Returns & refunds | Done (unverified against real DB/browser, see STATUS). Shopper requests/cancels returns; staff approve/decline/receive/refund; stock, payment, order status, audit all wired. Scope was INFERRED (spec unavailable). |
| 8 Marketing | Step 1 **Coupons admin** written (code only, unverified in browser/real DB): see "Phase 8 step 1" below. Flash sales, bundles, gift cards, loyalty, campaigns: not started. |
| CMS step 1 | **Banners, FAQs, Announcements admin** written (code only, unverified in browser/real DB): see "CMS step 1" below. Homepage sections, menus, pages, email templates: not started. Storefront does NOT read banners/FAQs/announcements yet. |
| 9–12 | Not started. |

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
Then in `main.jsx`: `<BrowserRouter><AuthProvider><CustomerAuthProvider><CartProvider><WishlistProvider><App/></WishlistProvider></CartProvider></CustomerAuthProvider></AuthProvider></BrowserRouter>` (order matters; `CartProvider` is in `src/shop/CartContext`, `WishlistProvider` in `src/shop/WishlistContext`); ALL routes (admin + storefront) are in `src/App.jsx` (copy into their App; it replaces the old `AdminRoutes.example.jsx`). Manual checklist (admin): login at `/admin/login` → sidebar shows → Products list shows 3 seeded perfumes → create/edit/delete/restore a product → Inventory adjust (password) → Catalog setup add a brand → Supplier → Purchase order → order → receive → stock rises + history row → Staff page create a staff (temp password shown once) → that staff logs in and is forced to change password → Roles matrix edit → Audit log shows all of it. Manual checklist (storefront, Phase 6): `/` shows hero + categories + product rows → `/shop` filters / sort / search / pagination work → open a product, pick a size, Add to cart (header count rises) → `/cart` change qty / remove / coupon → refresh the page (cart survives) → `/checkout` as guest, place a COD order → success page; order visible in admin Orders and stock reserved → `/track` with order number + the SAME phone text → register/login → guest cart is merged into the account cart → checkout again as a customer → `/account` lists that order, detail page + progress timeline → add/edit/remove/default address → wishlist heart on a product (guest is sent to /login) → `/wishlist` → logout empties the cart. Fix any bug found before new features.

## Local dev on the user's Windows PC (learned in the first real run — read before debugging "it does not start")
- Project folder = the one holding `package.json` and `.env`: `C:\Users\Sat\Downloads\afsana-perfumes11-main\afsana-perfumes11-main\afsana-perfumes\afsana-perfumes`. `Downloads\afsana-full-repo-phase3b5` is only an unzipped copy (no package.json) — never run commands there. Never ask the user to paste `.env`/screenshots of it (a screenshot once showed secrets; they were told to rotate `JWT_SECRET`, `ADMIN_PASSWORD` and the Mongo password BEFORE going live and not to keep real values in `.env.example`).
- Start the server with **`npx netlify dev --functions netlify/functions`** (plain `npx netlify dev` gave 404 "Function not found" for every `/api` call; cause not found, the flag is the workaround). Then open `http://localhost:8888/admin/login`. Vite alone (`:5173`) has no API.
- `database/connection.js` now (1) loads `dotenv` itself (netlify dev did not inject `.env` into functions) and (2) keeps its "already connecting/connected" cache ON the mongoose instance instead of `global`: netlify dev reloads modules per request, which made the models wait 10 s on a connection that belonged to an old mongoose copy (`users.findOne() buffering timed out`).
- The user's `vite.config.js` (not in the repo) got `server.watch.ignored: [/\.netlify/]` because Vite crashed with `EBUSY` while watching the bundled functions in `.netlify\functions-serve`.
- `db:seed` only creates the owner if the email does not exist yet; it does NOT update the password. If login says "Invalid email or password" while `.env` is right, reset the hash with a one-off script that bcrypt-hashes `ADMIN_PASSWORD` into that User (and clears `failedLoginCount`/`lockedUntil`). The owner's email/password are only in the user's `.env`.
- Leftovers to clean: `netlify/functions/ping.js` (test file, delete), a parent folder `...\afsana-perfumes11-main\netlify.toml.bak` + `node_modules` (harmless, was suspected but was NOT the cause), and a simple start script so the long command need not be typed.
- Windows PowerShell tips for this user: one-line commands only; copy/paste from chat can eat backticks and `*` — prefer commands without them.

## Phase 8 step 1 — Coupons admin (written; verify in browser)
- Checkout side already existed and was NOT changed: `services/pricing.js` (`validateCoupon`, `calcDiscount`), `cartService` quote, `orderService` (atomic `usedCount` +1). Types: `percentage | fixed | free_shipping`; checks: active, start/expiry, min order, total usage limit, per-customer limit, first-order-only, customer list, product/category restriction, `maxDiscount` cap.
- API group `coupons` (`netlify/functions/coupons`), all staff-only: `GET /api/coupons/admin?q&status&trash&page&limit` (`coupons.view`), `GET /admin/:id`, `POST /admin` (`coupons.create`), `PATCH /admin/:id` and `PATCH /admin/:id/active {isActive}` (`coupons.edit`), `DELETE /admin/:id` and `POST /admin/:id/restore` (`coupons.delete`). Soft delete (`isDeleted`; delete also sets inactive; restore keeps it INACTIVE on purpose). Audit actions: `coupon.created|updated|active_changed|deleted|restored`. No password re-confirmation (not in `HIGH_RISK`).
- Fields (same in API and UI): `code, type, value, minOrder, maxDiscount, firstOrderOnly, usageLimit, perCustomerLimit (0 = unlimited), startsAt, expiresAt, isActive`; read-only: `usedCount, status, createdAt`. `status` = Active | Scheduled | Expired | Used up | Inactive (`couponRules.couponStatus`; a test checks it agrees with `validateCoupon`).
- Rules (pure, tested): `services/couponRules.js` — code `A-Z 0-9 _ -` 3-30 chars (upper-cased); percentage whole 1-100; fixed > 0; free_shipping value forced 0; `maxDiscount` only on percentage; expiry after start; code locked once `usedCount > 0`; a code in Trash blocks re-use (message says "restore it"). Zod (`couponBody/couponPatch`) does shape; `crossFieldErrors` does the business rules, and a PATCH re-checks the MERGED coupon in `couponService.update`.
- UI: `admin/coupons/CouponsList.jsx` + `CouponDrawer.jsx`, mapper `src/services/mappers/coupons.js`, `couponsApi` in `src/services/index.js`. The existing Sidebar "Marketing" link (`/admin/marketing`, `coupons.view`) now opens the Coupons page (route added in `AppRoutes.example.jsx`). Dates are whole Pakistan days: start = 00:00, expiry = 23:59:59 (UTC+5).
- NOT done on purpose: product / category / customer pickers (the DB fields and checkout logic exist; no UI), coupon usage history screen, bulk create, flash sales and the rest of Phase 8.
- UNTESTED: the Mongo `statusFilter` (uses `$expr` + null checks), the Zod schemas (Zod is not installed in the sandbox), the whole screen in a browser. Manual checklist: `/admin/marketing` shows "No coupons yet" -> Add coupon `EID10`, 10%, max 500, min 2000, expires next month -> row appears as Active -> Add a fixed `FLAT300` and a `FREESHIP` (no value field) -> try a bad code `AB`, percent 150, expiry before start: inline errors -> duplicate code: "already exists" -> Power icon turns one Inactive and the status filter finds it -> storefront cart: coupon applies / is refused with a clear message -> place an order with it: `usedCount` becomes 1, the code can no longer be changed -> delete one: it moves to Trash; recreating the same code says "in Trash"; restore -> comes back Inactive -> Audit log has the 5 `coupon.*` actions -> role without `coupons.edit`/`delete` sees no buttons.

## Orders server fixes (step 3a) — written, verify on a real DB
Pure rules in `services/orderRules.js` (tested), wired into `services/orderService.js`:
- (a) **Returned now restocks.** Moving Shipped / Out For Delivery -> Returned (the parcel came back) puts the units back on the shelf (`restockItems(..., 'return')`, stock-history type `return`). ASSUMPTION: returned parcels are unopened/resellable. If the owner wants a manual check first, remove `restock_return` in `orderRules.stockEffect` and use the Returns screen instead. Cancelled behaves exactly as before. Returned is final, so no double restock; Delivered-order returns are still handled only by `returnService`.
- (b) **`PATCH /orders/admin/:id/payment` refuses Refunded / Partially Refunded orders** (409 with a clear message), with a compare-and-set inside the transaction so a refund landing at the same moment wins.
- (c) **Order search ignores the phone for roles whose `customer.phone` is denied** (`listOrders(q, scopes, uid, deniedFields)`; the route passes `ctx.perms.deniedFields`). Search by order number / customer name still works.
- Manual checklist: ship an order (stock drops), mark it Returned -> stock goes back, history row type `return` -> a second click is impossible (no buttons) -> mark a bank-transfer order Paid, refund it via Returns, then try the payment endpoint/drawer: refused -> a role with phone denied: searching a phone number finds nothing, searching a name still works.

## CMS step 1 — Banners, FAQs, Announcements admin (written; verify in browser)
- One API function `netlify/functions/cms` (staff-only, no public reads yet). Routes per section `banners | faqs | announcements`: `GET /api/cms/<section>`, `POST`, `PATCH /<section>/:id`, `PATCH /<section>/:id/active {isActive}`, `DELETE /<section>/:id`. Permissions come from `cmsRules.MODULE_OF`: banners -> `banners.*`, faqs -> `faq.*`, announcements -> `announcements.*` (view/create/edit/delete). Audit actions `banner|faq|announcement .created/.updated/.active_changed/.deleted`.
- Banners are soft-deleted (no Trash screen yet); FAQs and announcements are deleted for good (the audit log keeps the old values).
- Flat API fields: banners `heading, subtitle, desktopImageUrl, desktopImageAlt, mobileImageUrl, mobileImageAlt, buttonText, buttonLink, startsAt, endsAt, sortOrder, isActive` (the DB stores the images nested as `desktopImage/mobileImage {url, alt}`; `cmsRules.fromDoc/toDoc` convert); faqs `question, answer, sortOrder, isActive`; announcements `text, link, startsAt, endsAt, isActive`. Read-only: `id, status (Live|Scheduled|Expired|Inactive), createdAt`.
- Rules (pure, tested, `services/cmsRules.js`): banner needs a heading or desktop image; a button needs text AND link; links/images must be `https://...`/`http://...` or a path starting with `/` (blocks `javascript:`, `data:`, `//host`); end after start; heading <=120, subtitle <=200, button <=40; FAQ question 5-200, answer 1-2000; announcement 3-160. A PATCH is re-checked MERGED with the saved record (`cmsService.update`). Dates are whole Pakistan days (UTC+5).
- UI: `admin/cms/CmsPage.jsx` (tabs, each tab only if the role has `<module>.view`) + one generic `CmsResource.jsx` driven by the section configs in `src/services/mappers/cms.js`; `cmsApi(resource)` in `src/services/index.js`. Route `/admin/cms` in `AppRoutes.example.jsx` (the Sidebar "CMS" link, permission `homepage.view`, so a role needs `homepage.view` to see the page at all).
- NOT done: the storefront still shows its built-in hero/FAQ/announcement; next step is a public read endpoint (live banners ordered by `sortOrder`, active FAQs, the current announcement) and `ShopLayout`/Home using it. Image upload is also not there (addresses are typed in).
- UNTESTED: the Zod schemas (not installed in the sandbox), the Mongo calls, and the screens in a browser. Manual checklist: `/admin/cms` -> three tabs -> Add banner with only a heading -> saved, row shows Live -> add with a bad link `javascript:1` -> inline error -> turn it off with the power icon (Inactive) -> edit and clear the subtitle -> delete -> gone; add an FAQ and an announcement; Audit log shows the actions; a role without `faq.view` does not see the FAQs tab.

## Repo map
```
admin/
  returns/      ReturnsList (tabs by status, search) ReturnDrawer (approve/decline/receive/refund + history) NewReturnDrawer (staff logs a return)
  components/   AdminLayout, Sidebar (permission-gated nav), Topbar, Button, Card, DataTable, Drawer(size md|lg|xl), FormFields(Field, Input, Select, Textarea, Check),
                StatusPill, StatCard, ConfirmDialog (yes/no), ConfirmPasswordModal (re-auth), TempPasswordModal
  dashboard/    Dashboard.jsx (useApi -> analyticsApi.dashboard; loading/error+retry/hidden sections/empty states; mock deleted)
  orders/       OrdersList (filters q/status/paymentStatus + pagination), OrderDetailDrawer (loads by id: status moves, payment, notes, Returns link), OrderTimeline   (live; mock deleted)
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
  services/     mappers/dashboard.js (Dashboard API<->UI shape, pure, no imports; 'hidden' vs '—' rules), mappers/orders.js (API<->UI shape, TRANSITIONS copy, hidden-field handling; tests/orders.test.js guards drift vs server), api.js (fetch wrapper: credentials, X-Requested-With:'afsana', ApiError{status,code,message,details}), index.js (all *Api objects), mappers/products.js
  hooks/        useApi (loading/error/data/reload), useDebounce
  styles/tokens.css   AppRoutes.example.jsx (admin + storefront route table to copy)
database/       constants.js (MODULES, ACTIONS, SCOPES, HIGH_RISK, RESTRICTABLE_FIELDS, status enums), connection.js, models/*, seed/index.js, indexes/sync.js
middleware/     withApi (pipeline), auth (staff), customerAuth, permissions (resolver), redact, errors, http, router, rateLimit, pagination
services/       dashboardService (Mongo aggregates) dashboardRules(pure) returnService returnRules(pure) cartService cartRules(pure) addressRules(pure) productService inventoryService orderService pricing staffService roleService taxonomyService supplierService purchaseOrderService accountService
                accessRules (pure) poRules (pure) permissionGroups phone mailer(stub) audit tx
validation/     common.js (objectId, bool, paging, confirmPassword), schemas.js (all Zod schemas)
netlify/functions/<name>/index.js   one function per group: auth products inventory orders analytics staff roles permissions audit account taxonomy suppliers purchase-orders cart wishlist
tests/          core, access (rules + PO), permissions, mappers, cart, shopLogic, returns, orders, dashboard  -> `node --test` (97 tests)
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

## Dashboard (Phase 3b-5) — what was added
- `GET /api/analytics/dashboard` (function folder `netlify/functions/analytics`). Route permission: **`dashboard.view`** (same key as the Sidebar item and the `/admin` route; `analytics.view` is kept for a future Analytics page). Inside it, sections are ALSO gated: `orders.view` -> `kpis`, `revenueSeries`, `recentOrders`, `topProducts` (and the role's order scope - own / assigned / cities / stores - is applied); `inventory.view` -> `lowStock`. A section the role may not see is `null` (UI shows "hidden"), never partly filled.
- Response `{ success, dashboard: { generatedAt, kpis, revenueSeries, recentOrders, topProducts, lowStock } }`. `kpis`: `todayRevenue, todayOrders, todayRevenueChangePct, monthRevenue, monthRevenueChangePct, totalOrders, pendingOrders, avgOrderValue, avgOrderValueChangePct` (a `*ChangePct` is `null` when there is nothing to compare with -> trend row hidden). `revenueSeries`: 30 Pakistan days `[{date:'YYYY-MM-DD', revenue}]`, empty days = 0. `recentOrders`: last 5 (any status). `topProducts`: `{days:30, items:[{productId,name,units,revenue,profit?}]}`. `lowStock`: `{count, outOfStock, items:[{id,name,label,available,threshold}]}` (5 lowest).
- **Definitions** (written in `services/dashboardRules.js`): **Revenue = sum of `Order.total`** (items - discount + delivery fee) of orders **placed** in the period, **excluding status Cancelled / Returned / Refunded**. Unpaid COD/bank orders still count (booked sales, not cash received). A Partially Refunded order keeps its full total (refund amount is not subtracted yet). "Today" / "this month" are Pakistan time (UTC+5, `Asia/Karachi`). `*vs last month*` compares month-so-far with last month's same elapsed time. `pendingOrders` = New, Confirmed, Processing, Packed. `totalOrders` = all statuses (matches the Orders screen). `lowStock` = available (current - reserved) <= the variant's threshold, out-of-stock included. Top products = last 30 days, by units sold; its `revenue` is unitPrice x quantity per line (before order-level discount/delivery).
- **Field security:** response goes through `redact()` plus one extra rule: `profit` (top products; = revenue - cost) is removed if EITHER `order.profit` OR `product.costPrice` is denied. Profit is `null` when any line lacks a cost snapshot. Mapper: key missing = "hidden", `null` = "—". No phone / address / notes are sent at all.
- UI: 6 cards (Today's revenue, Today's orders, This month, Pending orders, Low stock, Avg. order value) — the old "Total orders" card was replaced by "Today's orders" (the API still returns `totalOrders`). The mock **Security alerts** card was removed (no data source yet; idea: recent failed logins / new-device sessions from the audit log) and its slot now shows **Top products**.
- `orderService.SCOPE_MAP` is now exported (one-word change; no behaviour change) so the dashboard applies the same scopes as the Orders list.
- Manual checklist: `/admin` as Owner -> 6 cards, 30-day chart, low stock list, recent orders, top products (needs some orders: place 2-3 via the storefront, mark one Delivered and cancel one -> the cancelled one must NOT count in Today's revenue) -> compare "Today's revenue" with the sum of that day's non-cancelled orders in Orders -> a brand-new empty DB shows "No sales" / "No orders yet" texts, no crash -> role with `profit` denied: Top products profit shows "hidden" -> role with only `dashboard.view` (no orders/inventory): page says it has no data, no crash -> stop the server: error + "Try again" works.
- UNTESTED against a real DB: the Mongo aggregations (`$dateToString` with timezone, `$lookup` to `OrderItem.collection.name`, `$expr` low-stock count) and the scoped `$match` (scope filters run inside `aggregate`, where Mongoose does not cast ids; `ctx.user._id` is already an ObjectId so it should work, but check with a "createdByMe" scoped role).

## Key design decisions (details in docs/ARCHITECTURE.md)
- **Auth:** staff cookie `afsana_staff`, customer cookie `afsana_customer` (both HTTP-only JWT `{sid,jti}`; a `Session` row checked every request; staff 7 days, customers 30). Lockout after 5 fails (15 min). Staff created/reset by an admin have `mustChangePassword` → API returns `403 PASSWORD_CHANGE_REQUIRED` for everything except me/logout/change-password.
- **RBAC:** User → Staff → Role (+ per-staff overrides with startsAt/expiresAt, allow/deny) → Grants `{module, actions[], scope}`; field-level `deniedFields`; working hours; Owner `isUnrestricted` (`GET /auth/me` returns `permissions.unrestricted:true, modules:{}` for Owner → UI `can()` handles it). Rules in `services/accessRules.js`: manage only strictly-lower level, nobody edits Owner, no self access changes, cannot grant access you don't hold, temporary allow needs expiry ≤ 90 days, system roles keep name/level.
- **High-risk actions** (list in `constants.HIGH_RISK`; price change, stock adjust/receive, delete, staff/role changes…) need `confirmPassword` + AuditLog. Codes `REAUTH_REQUIRED` / `REAUTH_FAILED`.
- **Stock:** one `inventory` doc per variant; `available = current − reserved`; `Inventory.reserve()` atomic. Lifecycle: reserve at checkout → commit at **Shipped** → release on cancel before ship / restock on cancel after ship. PO: Ordered adds `incoming`; receive moves incoming→current (`po_receive` history); cancel returns remainder.
- **Orders:** transition table in `orderService.TRANSITIONS`; compare-and-set on status; Delivered COD → Paid; `Refunded` only via the future refunds flow. Public tracking needs order number + phone.
- **Soft delete** (`isDeleted`) on products/variants/taxonomy/suppliers/staff/roles/customers; AuditLog and PermissionHistory are append-only.

## Next steps (suggested order — one per request)
1. **Step 0** (above). Fix bugs found; add a regression test where the bug was pure logic.
2. ~~Phase 3b-4 Orders screen -> `ordersApi`~~ **DONE (code only, unverified in browser/real DB).** List: search `q` (order #/name/phone), status, paymentStatus, pagination (20/page). Drawer: items/totals, allowed next statuses only (mapper copy of `TRANSITIONS`, test fails if server table changes), optional note on status change, payment status (Pending/Paid/Failed + reference; disabled once Refunded/Partially Refunded), internal notes, timeline. After Delivered / Return Requested / Returned / Refunded: no status buttons, only a "View returns" link to `/admin/returns?q=<orderNumber>` (ReturnsList now reads `?q=`). Hidden fields (phone/address/notes/payments/cost) show as "hidden". Mock deleted. Manual checklist: `/admin/orders` lists seeded/placed orders -> filter by status and payment -> search by order number -> page through (needs >20 orders) -> open one: New -> Mark Confirmed -> ... -> Shipped (stock committed) -> Delivered (COD becomes Paid; buttons vanish, "View returns" appears and opens Returns filtered to that order) -> add a note -> change payment on a bank-transfer order to Paid with a reference -> as a role with phone/address/notes denied, drawer shows "hidden" and nothing crashes.
3. ~~Phase 3b-5 Dashboard -> `GET /api/analytics/dashboard`~~ **DONE (code only, unverified in browser/real DB).** See "Dashboard (Phase 3b-5)" below. Mock deleted.
3a. ~~Fix the 3 known Orders server problems~~ **DONE (code only, unverified on a real DB)** — see "Orders server fixes" below.
4. **Phase 6 follow-ups** (small): storefront theme toggle (`data-theme`) in `ShopLayout`; shopper can cancel an order while `New`; reviews (model exists); reorder button; wishlist page should drop a card right after un-hearting; per-product SEO tags (`seo` fields exist); homepage sections/banners from CMS.
5. Later (inferred from comments/architecture, confirm against the spec): Phase 8 marketing (**coupons admin UI = DONE as code, see Phase 8 step 1**; next: flash sales price application, bundles, gift cards, loyalty, campaigns), shipping (couriers, rates, shipments), CMS (homepage sections, banners, menus, pages, FAQ, announcements), reviews moderation, analytics & finance/expenses, notifications, settings, export/backup, image upload/CDN, real email (`services/mailer.js` is a stub that only logs in dev), then security audit + permission tests, inventory race-condition test on a real DB (spec: "stock = 1, two buyers"), GitHub cleanup, Netlify deploy (env vars, verify API + Mongo, replace in-memory rate limiter).

## Known limits / TODO notes
- In-memory rate limiter (per warm function instance) → replace with a shared store before real traffic.
- Guest customers are matched by raw phone string (no normalisation/unique index); customer accounts are NOT auto-linked to guest orders (phone unverified — needs OTP/email verification first). `services/phone.js` normalises to +92… for accounts only.
- Shipping fee flat 250, free ≥ 5000, overridable by `Setting` key `shipping`. Flash-sale prices not applied at checkout yet; coupons work (admin screen written in Phase 8 step 1).
- `PATCH /products/admin/:id` replaces nested objects (`fragrance`, `notes`, `content`, `media`…) wholesale — UI must send the full object (mapper does). A product's brand can be changed but not cleared. Images are URLs only.
- `setDeleted` on a product also restores individually-deleted sizes on restore.
- Email/SMS/WhatsApp sending not built (password reset link is only logged in dev; no order-confirmation or return/refund messages).
- Found while wiring Orders (server, NOT changed): (FIXED in step 3a, kept for history) (a) `TRANSITIONS` allows Shipped/Out For Delivery -> **Returned** but `changeStatus` did not restock the committed units for `Returned` (only `Cancelled` restocks) -> stock can stay wrong; decide: restock there or remove that move. (b) `PATCH /orders/admin/:id/payment` does not refuse Refunded/Partially Refunded orders (UI hides it; server should too). (c) Search by phone still works for roles whose phone field is redacted (they can probe numbers).
- `HANDOFF` said the master spec JSON would be attached; it was NOT in the upload for the Orders or the Dashboard step, so Phase 8+ numbering is still inferred.
- Dashboard: low-stock list can include variants of soft-deleted products (inventory rows are not joined to `isDeleted`); top-products profit ignores order-level discounts.
- Public tracking (`/track`) matches the phone exactly as typed at checkout (guest phones are not normalised): "0300 1234567" vs "03001234567" will NOT match. Signed-in shoppers use `/account/orders/:no` instead. Fix with phone normalisation + a unique index when guest accounts get linked.
- `BANK_NOTE` in `src/shop/format.js` is PLACEHOLDER text for bank-transfer instructions (real details should come from Settings). Homepage hero / value-prop copy is static.
- Storefront has no theme toggle yet (follows system via tokens.css); product images are URLs only.
- The quote is advisory: stock and prices are re-checked and stock reserved atomically when the order is placed (`OUT_OF_STOCK` / `ITEM_UNAVAILABLE` are shown on checkout).
- `admin/README.md` is outdated.

## Working notes for the next Claude (sandbox gotchas)
- The sandbox has **no npm/network**: you cannot run Vite, Mongo or the API. What you CAN run: `node --check <file>`, `node tools/check-syntax.js` (needs the global `typescript`; skip if missing), `node --test` (pure-logic tests; `tests/core.test.js` etc. work because those modules have no npm deps). Keep new business rules in **pure modules** (like `accessRules.js`, `poRules.js`) so they can be unit-tested here. ESM files in `src/` are tested by loading them as a `data:` module (see `tests/mappers.test.js`).
- The repo root is CommonJS (`require`) for backend + tests; `src/` and `admin/` are ESM/JSX (Vite).
- The user's root `package.json` has `"type": "module"` (Vite needs it), so every backend folder (`database middleware services validation netlify tools tests`) has its own tiny `package.json` = `{ "type": "commonjs" }`. Keep them when copying files; without them `node --test` fails with "require is not defined in ES module scope". The user runs everything from `...\afsana-perfumes\afsana-perfumes` (the folder that holds `package.json`).
- Use `mkdir -p a b c` (not `{a,b}` brace expansion: the shell there is plain `sh`).
- Before saying "done", run: `for f in services/*.js middleware/*.js netlify/functions/*/index.js validation/*.js; do node --check $f; done; node tools/check-syntax.js; node --test`.
- Be honest in the summary that nothing is verified against a real DB/browser; ask the user to run it and paste errors verbatim.
- Deliver as a zip of changed/new files (+ updated HANDOFF.md), then a short Roman-Urdu summary: what was built, what the user must do, what was deliberately not done.

## Later (user asked to do afterwards)
- Backup export script + restore script (free Atlas has no backups), then paid Atlas tier with automatic backups. Not built yet.

## Repo layout note (GitHub / Netlify)
- This repo root IS the project folder (package.json, netlify.toml, .env.example here). `src/App.jsx` now holds the full route table (it replaced `AppRoutes.example.jsx`), and `src/main.jsx` already has the provider order Auth > CustomerAuth > Cart > Wishlist. Old mock-data files and the stray `afsana-phase7*` folders were left out on purpose.
- package.json scripts: dev, build, preview, api (needs Netlify CLI installed globally or via npx), db:seed, db:indexes, test, check. NODE_VERSION=20 is set in netlify.toml.
- Verified here (no DB, no browser, no npm install): node --check on all backend files, tools/check-syntax.js, all 97 tests, every relative import in src/ and admin/ resolves. NOT verified: `npm run build` (Vite) and anything against the real DB.

## Later (user asked to do afterwards)
- Backup export + restore scripts (free Atlas has no backups), then a paid Atlas tier with automatic backups. Not built yet.
