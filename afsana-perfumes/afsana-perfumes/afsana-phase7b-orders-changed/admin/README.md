# Afsana Perfumes — Admin Dashboard UI

Phase 1 (UI Foundation) deliverable: reusable admin layout + dashboard page, built against the design tokens in `src/styles/tokens.css`.

## Install

```bash
npm install lucide-react recharts
```

## Wire it up

1. Import the tokens once in `src/main.jsx`:
   ```js
   import "./styles/tokens.css";
   ```
2. Add the Google Fonts `<link>` tags from the top of `tokens.css` to `index.html`.
3. Copy `tailwind.config.js` into your project root (merge with your existing config if you already have Tailwind set up — this just extends `theme.extend`).
4. Route the dashboard:
   ```jsx
   import AdminLayout from "./admin/components/AdminLayout";
   import Dashboard from "./admin/dashboard/Dashboard";

   <Route
     path="/admin"
     element={
       <AdminLayout activeHref="/admin" user={{ name: "Ayesha", role: "Owner" }}>
         <Dashboard />
       </AdminLayout>
     }
   />
   ```

## What's here

| File | Purpose |
|---|---|
| `components/AdminLayout.jsx` | Sidebar + Topbar shell — wrap every admin page with this |
| `components/Sidebar.jsx` | Grouped nav matching `admin_portal.modules`; collapsible; `permission` key on each item is a placeholder for Phase 4 RBAC |
| `components/Topbar.jsx` | Search, light/dark/system theme toggle (persists to `localStorage`), notifications, user menu |
| `components/Card.jsx` | Base surface primitive used everywhere |
| `components/StatCard.jsx` | KPI card with optional trend indicator |
| `components/DataTable.jsx` | Generic table — loading skeleton, empty state, optional pagination footer, optional `onRowClick` for clickable rows |
| `components/StatusPill.jsx` | Status → color mapping for orders/stock/reviews etc. |
| `dashboard/Dashboard.jsx` | Assembles the KPIs + revenue chart + recent orders + low stock + security alerts |
| `dashboard/mockData.js` | Placeholder data shaped like the future `GET /api/analytics/dashboard` response |
| `components/Button.jsx` | Button with primary/secondary/ghost/danger variants |
| `components/FormFields.jsx` | `Field`, `Input`, `Textarea`, `Select` — shared form primitives with label + error state |
| `components/Drawer.jsx` | Right-side panel used for Add/Edit forms across modules |
| `products/ProductsList.jsx` | Search + category/status filters, table with stock-aware coloring, edit/delete row actions |
| `products/ProductFormDrawer.jsx` | Add/Edit product form (reused for both — pass `product` to edit) |
| `products/mockProductsData.js` | Placeholder data shaped like the future `GET /api/products` response |
| `inventory/InventoryList.jsx` | Stock tab (current/reserved/available, low-stock highlighting) + Stock history tab |
| `inventory/StockAdjustDrawer.jsx` | Restock/Damaged/Adjustment form — reason is required since stock changes are audit-logged |
| `inventory/mockInventoryData.js` | Placeholder data shaped like the future `GET /api/inventory` and `/api/inventory/history` responses |
| `orders/OrdersList.jsx` | Live list: search + status + payment filters, pagination, clickable rows open the detail drawer |
| `orders/OrderDetailDrawer.jsx` | Live detail: items, totals, allowed status moves, payment status, internal notes; Returns link after Delivered |
| `orders/OrderTimeline.jsx` | Vertical progress timeline matching the spec's order timeline events |
| `../src/services/mappers/orders.js` | Orders API shape <-> UI shape, allowed status moves, hidden-field handling (tested) |

Add the Orders route:

```jsx
import OrdersList from "./admin/orders/OrdersList";

<Route path="/admin/orders" element={<AdminLayout activeHref="/admin/orders"><OrdersList /></AdminLayout>} />
```

Add the Products and Inventory routes:

```jsx
import ProductsList from "./admin/products/ProductsList";
import InventoryList from "./admin/inventory/InventoryList";

<Route path="/admin/products" element={<AdminLayout activeHref="/admin/products"><ProductsList /></AdminLayout>} />
<Route path="/admin/inventory" element={<AdminLayout activeHref="/admin/inventory"><InventoryList /></AdminLayout>} />
```

## Not done yet (by design)

- **No real data fetching** — `Dashboard.jsx` reads `mockData.js`. Once Phase 3 (API layer) exists, replace that import with a `useEffect` + `fetch("/api/analytics/dashboard")` — the component props won't need to change.
- **No RBAC gating** — `Sidebar.jsx` shows every module to everyone. Each nav item carries a `permission` key already; once Phase 4 auth/permissions land, filter `NAV_GROUPS` by the logged-in user's permission set.
- **No routing library assumed** — examples above use React Router syntax, but `AdminLayout`/`Sidebar` accept an `onNavigate` prop if you're using something else.
- Remaining admin pages (Orders, Customers, Suppliers, Purchase Orders, Marketing, CMS, Finance, Staff, etc.) aren't built yet — they'll reuse `Card`, `Button`, `FormFields`, `Drawer`, `DataTable`, and `StatusPill` so the visual language stays consistent.
- `StockAdjustDrawer` updates `current` stock locally and does not yet touch `reserved` stock — reserving units on checkout is a Phase 6 (Shopping System) concern.
