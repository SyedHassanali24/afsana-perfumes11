import { useState } from "react";
import { useAuth } from "../../src/auth/AuthContext";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Warehouse,
  Tags,
  ShoppingBag,
  Truck,
  RotateCcw,
  Users,
  Star,
  Megaphone,
  LayoutTemplate,
  Landmark,
  ShieldCheck,
  Settings,
  DatabaseBackup,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
} from "lucide-react";

// Each item's `permission` is `${module}.${action}` using module names from database/constants.js.
// Hiding here is UX only; the server enforces permissions.
const NAV_GROUPS = [
  { label: "Overview", items: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/admin", permission: "dashboard.view" },
    { label: "Analytics", icon: BarChart3, href: "/admin/analytics", permission: "analytics.view" },
  ]},
  { label: "Catalog", items: [
    { label: "Products", icon: Package, href: "/admin/products", permission: "products.view" },
    { label: "Catalog setup", icon: Tags, href: "/admin/catalog", permission: "categories.view" },
    { label: "Inventory", icon: Warehouse, href: "/admin/inventory", permission: "inventory.view" },
  ]},
  { label: "Sales", items: [
    { label: "Orders", icon: ShoppingBag, href: "/admin/orders", permission: "orders.view" },
    { label: "Returns", icon: RotateCcw, href: "/admin/returns", permission: "returns.view" },
    { label: "Shipping", icon: Truck, href: "/admin/shipping", permission: "shipping.view" },
    { label: "Customers", icon: Users, href: "/admin/customers", permission: "customers.view" },
    { label: "Reviews", icon: Star, href: "/admin/reviews", permission: "reviews.view" },
  ]},
  { label: "Growth", items: [
    { label: "Marketing", icon: Megaphone, href: "/admin/marketing", permission: "coupons.view" },
    { label: "CMS", icon: LayoutTemplate, href: "/admin/cms", permission: "homepage.view" },
  ]},
  { label: "Operations", items: [
    { label: "Finance", icon: Landmark, href: "/admin/finance", permission: "finance.view" },
    { label: "Staff & roles", icon: ShieldCheck, href: "/admin/staff", permission: "staff.view" },
    { label: "Backup", icon: DatabaseBackup, href: "/admin/backup", permission: "backup.export" },
    { label: "Settings", icon: Settings, href: "/admin/settings", permission: "settings.view" },
  ]},
];

export default function Sidebar({ activeHref = "/admin", onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { can } = useAuth();
  const go = (href) => { onNavigate?.(href); setMobileOpen(false); };
  const groups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => can(i.permission)) }))
    .filter((g) => g.items.length);

  const navContent = (compact = false) => (
    <nav className="flex-1 overflow-y-auto py-4">
      {groups.map((group) => (
        <div key={group.label} className="mb-6 px-3">
          {!compact && (
            <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--nav-muted)]">
              {group.label}
            </p>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const isActive = item.href === "/admin"
                ? activeHref === "/admin"
                : activeHref.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={() => go(item.href)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all border-l-2"
                    style={{
                      color: isActive ? "var(--nav-active)" : "var(--nav-muted)",
                      borderColor: isActive ? "var(--gold)" : "transparent",
                      background: isActive ? "var(--nav-active-bg)" : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.045)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "";
                    }}
                  >
                    <Icon className="w-[17px] h-[17px] shrink-0" />
                    {!compact && <span className={isActive ? "font-semibold" : "font-medium"}>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <aside
        className={`hidden md:flex h-screen sticky top-0 flex-col transition-[width] duration-200 shadow-[1px_0_0_rgba(255,255,255,0.03)] ${collapsed ? "w-[72px]" : "w-64"}`}
        style={{ background: "var(--nav)", borderRight: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between px-4 h-[68px] shrink-0 border-b" style={{ borderColor: "var(--border)" }}>
          {!collapsed && (
            <span className="font-display text-xl font-semibold tracking-wide" style={{ color: "var(--gold)" }}>
              Afsana
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--nav-muted)" }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>
        {navContent(collapsed)}
      </aside>

      <button
        type="button"
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl text-[color:var(--gold)] border border-border shadow-lg"
        style={{ background: "var(--nav)" }}
        onClick={() => setMobileOpen(true)}
        aria-label="Open admin navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r shadow-2xl transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--nav)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between px-4 h-[68px] border-b" style={{ borderColor: "var(--border)" }}>
          <span className="font-display text-xl font-semibold tracking-wide" style={{ color: "var(--gold)" }}>Afsana</span>
          <button type="button" onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-white/5" style={{ color: "var(--nav-muted)" }} aria-label="Close admin navigation">
            <X className="w-5 h-5" />
          </button>
        </div>
        {navContent(false)}
      </aside>
    </>
  );
}
