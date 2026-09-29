# Afsana Perfumes — Project Handoff

Paste this whole file as your first message in the new Claude conversation
(along with re-attaching the original JSON spec if you have it) to continue
exactly where this left off.

## What this project is

"Afsana Perfumes" — a production-level perfume e-commerce platform.
Stack: React + Vite (frontend), Node.js on Netlify Functions (backend),
MongoDB Atlas + Mongoose (database), GitHub + Netlify (hosting). Full spec
(RBAC, inventory, orders, marketing, CMS, finance, audit logs, 12-phase
build plan) was provided as a master JSON — re-share that JSON file if you
still have it, it's the source of truth for everything.

## Decisions made so far

- Starting point chosen: build the **admin dashboard UI first** (React
  components), working directly in chat, GitHub repo to be connected later.
- Payment methods (initial): Cash on Delivery and Bank Transfer.
- Design direction: deep ink-green near-black base (`#12140F`), antique
  gold accent (`#C6A15B`), warm ivory text — luxury/cinematic, not a
  generic SaaS card-kit look. Headline font "Fraunces" (serif), body font
  "Inter". Tokens are in `src/styles/tokens.css`, theme (light/dark/system)
  toggles via `data-theme` attribute + localStorage.

## What's been built (all in `admin/` unless noted)

**Foundation**
- `src/styles/tokens.css` — CSS custom properties for the whole theme
- `tailwind.config.js` — extends Tailwind with the token colors/fonts
- `components/AdminLayout.jsx`, `Sidebar.jsx`, `Topbar.jsx` — the shell
- `components/Card.jsx`, `Button.jsx`, `FormFields.jsx`, `Drawer.jsx`
  (supports `size="md"|"lg"`), `DataTable.jsx` (supports `onRowClick`,
  pagination, loading/empty states), `StatusPill.jsx`, `StatCard.jsx`
  — the shared primitives every module reuses

**Modules (each has a list/page + mock data file shaped like the future
API response, ready to swap for real `fetch` calls in Phase 3)**
- `dashboard/Dashboard.jsx` — KPIs, revenue chart (recharts), recent
  orders, low stock, security alerts
- `products/ProductsList.jsx` + `ProductFormDrawer.jsx` — search/category/
  status filters, add/edit drawer (shared for both)
- `inventory/InventoryList.jsx` + `StockAdjustDrawer.jsx` — stock tab
  (current/reserved/available), stock history tab, adjustment drawer that
  **requires a reason** (feeds the audit log)
- `orders/OrdersList.jsx` + `OrderDetailDrawer.jsx` + `OrderTimeline.jsx`
  — search/status filters, clickable rows open a detail drawer with
  items/totals/status update/timeline/internal notes

Full file-by-file table and wiring instructions are in `admin/README.md`
(already generated — copy it over too).

## Deliberately not done yet

- No real data fetching anywhere — every module reads its local
  `mock*Data.js` file. Phase 3 (API layer) replaces those imports with
  `fetch` calls; component props are already shaped to match.
- No RBAC gating — `Sidebar.jsx` shows every module to everyone. Each nav
  item already carries a `permission` key as a placeholder for Phase 4.
- Not built yet: Customers, Suppliers, Purchase Orders, Shipping,
  Marketing, CMS, Finance, Staff/Roles/Permissions pages, and the entire
  backend (Netlify Functions), MongoDB schemas, auth, and customer-facing
  storefront.

## Suggested next step

Either keep going on admin UI (Customers page next, reusing the same
primitives), or switch to Phase 2 — MongoDB schemas — so the modules
already built can be wired to real data.
