import { useState } from "react";
import { useAuth } from "../../src/auth/AuthContext";
import {
  LayoutDashboard, BarChart3, Package, Warehouse, Tags, ShoppingBag, Truck, RotateCcw,
  Users, Star, Megaphone, LayoutTemplate, Landmark, ShieldCheck, Settings, DatabaseBackup,
  ChevronsLeft, ChevronsRight, Menu, X,
} from "lucide-react";

const NAV_GROUPS = [
  { label: "Overview", items: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/admin", permission: "dashboard.view" },
    { label: "Analytics", icon: BarChart3, href: "/admin/analytics", permission: "dashboard.view" },
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
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(i.permission)) })).filter((g) => g.items.length);

  const navContent = (compact = false) => (
    <nav className="flex-1 overflow-y-auto py-4">
      {groups.map((group) => (
        <div key={group.label} className="mb-5 px-3">
          {!compact && <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{group.label}</p>}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const isActive = item.href === "/admin" ? activeHref === "/admin" : activeHref.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={() => go(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-all ${isActive ? "bg-white/15 text-white shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                    aria-current={isActive ? "page" : undefined}
                    title={compact ? item.label : undefined}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
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
        className={`hidden md:flex h-screen sticky top-0 flex-col transition-[width] duration-200 shadow-2xl ${collapsed ? "w-[76px]" : "w-64"}`}
        style={{ background: "linear-gradient(180deg, #3438B8 0%, #292E9F 45%, #202675 100%)" }}
      >
        <div className="flex items-center justify-between px-4 h-[82px] shrink-0 border-b border-white/10">
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-xl font-bold tracking-[0.12em] text-white">AFSANA</p>
              <p className="text-[9px] font-semibold tracking-[0.34em] text-white/70">PERFUMES</p>
            </div>
          ) : (
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-sm font-bold text-white">A</span>
          )}
          <button type="button" onClick={() => setCollapsed((c) => !c)} className="p-2 rounded-lg text-white/65 hover:bg-white/10 hover:text-white transition-colors" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>
        {navContent(collapsed)}
        {!collapsed && (
          <div className="m-3 rounded-2xl border border-white/10 bg-white/10 p-3">
            <p className="text-xs font-semibold text-white">Afsana Perfumes</p>
            <p className="mt-1 text-[10px] text-white/60">Luxury in every scent</p>
          </div>
        )}
      </aside>

      <button type="button" className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl text-white shadow-lg" style={{ background: "#3035AD" }} onClick={() => setMobileOpen(true)} aria-label="Open admin navigation">
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && <button type="button" aria-label="Close navigation overlay" className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />}

      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col shadow-2xl transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ background: "linear-gradient(180deg, #3438B8 0%, #202675 100%)" }}>
        <div className="flex items-center justify-between px-5 h-[82px] border-b border-white/10">
          <div><p className="text-xl font-bold tracking-[0.12em] text-white">AFSANA</p><p className="text-[9px] font-semibold tracking-[0.34em] text-white/70">PERFUMES</p></div>
          <button type="button" onClick={() => setMobileOpen(false)} className="p-2 rounded-lg text-white/70 hover:bg-white/10" aria-label="Close admin navigation"><X className="w-5 h-5" /></button>
        </div>
        {navContent(false)}
      </aside>
    </>
  );
}
