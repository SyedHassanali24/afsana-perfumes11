import { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Warehouse,
  ShoppingBag,
  Truck,
  Users,
  Megaphone,
  LayoutTemplate,
  Landmark,
  ShieldCheck,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

// Grouped to match the spec's admin_portal.modules. Each item's `permission`
// is a placeholder key — wire it up to the RBAC permission check in Phase 4.
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/admin", permission: "dashboard.view" },
      { label: "Analytics", icon: BarChart3, href: "/admin/analytics", permission: "analytics.view" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", icon: Package, href: "/admin/products", permission: "products.view" },
      { label: "Inventory", icon: Warehouse, href: "/admin/inventory", permission: "inventory.view" },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Orders", icon: ShoppingBag, href: "/admin/orders", permission: "orders.view" },
      { label: "Shipping", icon: Truck, href: "/admin/shipping", permission: "shipping.view" },
      { label: "Customers", icon: Users, href: "/admin/customers", permission: "customers.view" },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "Marketing", icon: Megaphone, href: "/admin/marketing", permission: "marketing.view" },
      { label: "CMS", icon: LayoutTemplate, href: "/admin/cms", permission: "cms.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Finance", icon: Landmark, href: "/admin/finance", permission: "finance.view" },
      { label: "Staff & roles", icon: ShieldCheck, href: "/admin/staff", permission: "staff.view" },
      { label: "Settings", icon: Settings, href: "/admin/settings", permission: "settings.view" },
    ],
  },
];

/**
 * @param {string} activeHref - current route, used to highlight the active item
 * @param {(href: string) => void} [onNavigate] - wire to your router; falls back to <a href>
 */
export default function Sidebar({ activeHref = "/admin", onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col bg-[var(--bg)] border-r border-border transition-[width] duration-200 ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
      style={{ background: "var(--ink)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between px-4 h-16 border-b" style={{ borderColor: "var(--border)" }}>
        {!collapsed && (
          <span className="font-display text-lg tracking-wide" style={{ color: "var(--gold)" }}>
            Afsana
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-sm hover:bg-white/5 transition-colors"
          style={{ color: "var(--ink-muted)" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5 px-3">
            {!collapsed && (
              <p className="px-2 mb-1.5 text-xs text-[color:var(--ink-muted)]">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={(e) => {
                        if (onNavigate) {
                          e.preventDefault();
                          onNavigate(item.href);
                        }
                      }}
                      className={`flex items-center gap-3 pl-3 pr-2.5 py-2 rounded-sm text-sm transition-colors border-l-2 ${
                        isActive ? "font-medium" : "border-transparent hover:bg-white/5"
                      }`}
                      style={{
                        color: isActive ? "var(--gold)" : "var(--ink-muted)",
                        borderColor: isActive ? "var(--gold)" : "transparent",
                        background: isActive ? "rgba(198,161,91,0.08)" : undefined,
                      }}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
