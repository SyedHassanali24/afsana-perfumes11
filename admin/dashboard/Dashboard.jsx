import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  AlertTriangle, ArrowUpRight, BarChart3, Box, ChevronRight, CircleDollarSign,
  Package, ShoppingBag, Sparkles, TrendingUp, Users,
} from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import StatusPill from "../components/StatusPill";
import useApi from "../../src/hooks/useApi";
import { analyticsApi } from "../../src/services";
import { toDashboard, money, HIDDEN } from "../../src/services/mappers/dashboard";

const Hidden = () => <p className="text-sm text-[#182308]-muted">{HIDDEN} — your role cannot see this part.</p>;
const STATUS_COLORS = ["#748e40", "#3d6b3d", "#748e40", "#b4bf41", "#9b3f3f", "#748e40"];
const STATUS_LABELS = {
  pending: "Pending",
  processing: "Processing",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const STAT_STYLES = [
  { icon: ShoppingBag, tone: "blue" },
  { icon: CircleDollarSign, tone: "green" },
  { icon: Users, tone: "purple" },
  { icon: Package, tone: "orange" },
  { icon: AlertTriangle, tone: "red" },
  { icon: TrendingUp, tone: "indigo" },
];

const Pulse = ({ className = "" }) => <div className={`rounded-xl bg-[#263e0e]/10 animate-pulse ${className}`} />;

const toneClasses = {
  blue: "bg-[#748e40]/10 text-[#748e40] ring-[#748e40]/10",
  green: "bg-[#3d6b3d]/10 text-[#3d6b3d] ring-[#3d6b3d]/10",
  purple: "bg-[#748e40]/10 text-[#748e40] ring-[#748e40]/10",
  orange: "bg-[#b4bf41]/15 text-[#748e40] ring-[#b4bf41]/15",
  red: "bg-[#f7e7e5] text-[#9b3f3f] ring-[#9b3f3f]/10",
  indigo: "bg-[#263e0e]/10 text-[#263e0e] ring-[#263e0e]/10",
};

const ORDER_COLUMNS = [
  { key: "id", header: "Order" },
  { key: "customer", header: "Customer" },
  { key: "total", header: "Total", align: "right" },
  { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
  { key: "date", header: "Date", align: "right" },
];

function Header() {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#748e40]">Store overview</p>
      <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.04em] text-[#182308]">Dashboard</h1>
      <p className="text-sm text-[#182308]-muted">Welcome back. Here&apos;s what&apos;s happening with your store today.</p>
    </div>
  );
}

function SectionTitle({ title, subtitle, href, action = "View all" }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-[16px] font-semibold text-[#182308]">{title}</h2>
        {subtitle && <p className="text-xs text-[#182308]-muted mt-1">{subtitle}</p>}
      </div>
      {href && <Link to={href} className="inline-flex items-center gap-1 text-xs font-semibold text-[#263e0e] hover:text-[#748e40]">{action}<ChevronRight className="w-3.5 h-3.5" /></Link>}
    </div>
  );
}

function StatCard({ card, index }) {
  const style = STAT_STYLES[index % STAT_STYLES.length];
  const Icon = style.icon;
  const hasChange = typeof card.changePct === "number";
  const isUp = hasChange && card.changePct >= 0;

  return (
    <div className="dashboard-stat-card rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] p-4 sm:p-5 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${toneClasses[style.tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {hasChange && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-bold ${isUp ? "bg-[#3d6b3d]/10 text-[#3d6b3d]" : "bg-[#f7e7e5] text-[#9b3f3f]"}`}>
            <ArrowUpRight className="w-3 h-3" />
            {Math.abs(card.changePct)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-medium text-[#182308]-muted">{card.label}</p>
      <p className="mt-1 text-[25px] leading-tight font-semibold tracking-[-0.035em] text-[#182308]">{card.value}</p>
      {card.changeLabel && <p className="mt-1 text-[11px] text-[#182308]-muted">{card.changeLabel}</p>}
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, text, tone }) {
  return (
    <Link to={href} className="group flex items-center gap-3 min-w-0 rounded-xl px-3 py-2 transition-colors hover:bg-[#263e0e]/5">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClasses[tone]}`}><Icon className="w-4.5 h-4.5" /></span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[#182308]">{title}</span>
        <span className="block truncate text-[11px] text-[#182308]-muted">{text}</span>
      </span>
      <ChevronRight className="ml-auto w-4 h-4 shrink-0 text-[#182308]-muted group-hover:text-[#748e40]" />
    </Link>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useApi(() => analyticsApi.dashboard(), []);
  const vm = useMemo(() => (data ? toDashboard(data.dashboard) : null), [data]);
  const statusBreakdown = useMemo(() => {
    const map = new Map();
    (vm?.recentOrders || []).forEach((o) => map.set(o.status, (map.get(o.status) || 0) + 1));
    return Array.from(map, ([key, value]) => ({ name: STATUS_LABELS[key] || key, value })).filter((x) => x.value);
  }, [vm?.recentOrders]);

  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-[#9b3f3f]">{error.message || "Could not load the dashboard."}</p>
            <Button variant="secondary" onClick={reload}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loading || !vm) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Card key={i}><Pulse className="h-11 w-11" /><Pulse className="h-3 w-1/2 mt-5" /><Pulse className="h-7 w-3/4 mt-2" /></Card>)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Card className="xl:col-span-2"><Pulse className="h-[300px] w-full" /></Card>
          <Card><Pulse className="h-[300px] w-full" /></Card>
        </div>
      </div>
    );
  }

  if (vm.allHidden) {
    return (
      <div className="space-y-6">
        <Header />
        <Card><p className="text-sm text-[#182308]-muted py-6 text-center">Your role does not include any dashboard data yet. Ask an admin for access to Orders or Inventory.</p></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Header />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {vm.cards.map((card, index) => <StatCard key={card.key} card={card} index={index} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 rounded-2xl">
          <SectionTitle title="Sales overview" subtitle="Revenue for the last 30 days" />
          {!vm.series ? (
            <Hidden />
          ) : vm.seriesIsEmpty ? (
            <p className="text-sm text-[#182308]-muted py-20 text-center">No sales in the last 30 days yet.</p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vm.series} margin={{ left: -16, right: 8, top: 6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFillDashboard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#748e40" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#748e40" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 5" />
                  <XAxis dataKey="date" tick={{ fill: "var(--ink-muted)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={{ fill: "var(--ink-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--ink)", boxShadow: "var(--shadow-hover)" }}
                    formatter={(v) => [money(v), "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#748e40" strokeWidth={3} fill="url(#revenueFillDashboard)" dot={false} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-indigo-950/30 dark:via-surface dark:to-violet-950/30">
          <SectionTitle title="Store snapshot" subtitle="Your latest activity at a glance" />
          <div className="rounded-2xl border border-indigo-100 bg-white/70 p-5 dark:border-indigo-900/50 dark:bg-white/5">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#182308]">Afsana Perfumes</p>
                <p className="text-xs text-[#182308]-muted">Luxury in every scent</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/80 p-3 dark:bg-white/5">
                <p className="text-[11px] text-[#182308]-muted">Recent orders</p>
                <p className="mt-1 text-xl font-semibold text-[#182308]">{vm.recentOrders ? vm.recentOrders.length : HIDDEN}</p>
              </div>
              <div className="rounded-xl bg-white/80 p-3 dark:bg-white/5">
                <p className="text-[11px] text-[#182308]-muted">Low stock</p>
                <p className="mt-1 text-xl font-semibold text-[#182308]">{vm.lowStock ? vm.lowStock.count : HIDDEN}</p>
              </div>
            </div>
            <Link to="/admin/products" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#263e0e] hover:text-[#748e40]">Manage products <ArrowUpRight className="w-3.5 h-3.5" /></Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="rounded-2xl">
          <SectionTitle title="Orders overview" subtitle="Recent order status mix" />
          {statusBreakdown.length ? (
            <>
              <div className="h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={54} outerRadius={76} paddingAngle={3} stroke="none">
                      {statusBreakdown.map((entry, index) => <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--ink)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="text-center"><p className="text-2xl font-semibold text-[#182308]">{(vm.recentOrders || []).length}</p><p className="text-[10px] text-[#182308]-muted">Recent</p></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {statusBreakdown.map((s, i) => (
                  <span key={s.name} className="inline-flex items-center gap-2 text-[11px] text-[#182308]-muted">
                    <i className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                    {s.name}<b className="ml-auto text-[#182308]">{s.value}</b>
                  </span>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-[#182308]-muted py-16 text-center">No recent orders yet.</p>}
        </Card>

        <Card className="xl:col-span-2 rounded-2xl" padded={false}>
          <div className="px-5 pt-5">
            <SectionTitle title="Recent orders" subtitle="Latest customer activity" href="/admin/orders" />
          </div>
          {!vm.recentOrders ? (
            <div className="px-5 pb-5"><Hidden /></div>
          ) : vm.recentOrders.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-[#182308]-muted">No orders yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {vm.recentOrders.slice(0, 5).map((order) => (
                <Link key={order.id} to="/admin/orders" className="flex items-center gap-3 px-5 py-3.5 hover:bg-indigo-500/[0.03] transition-colors">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#263e0e]/10 text-[#263e0e]"><ShoppingBag className="w-4 h-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-[#182308] truncate">{order.id}</span>
                    <span className="block text-[11px] text-[#182308]-muted truncate">{order.customer} · {order.date}</span>
                  </span>
                  <StatusPill status={order.status} />
                  <span className="hidden sm:block w-24 text-right text-xs font-semibold text-[#182308]">{order.total}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 rounded-2xl">
          <SectionTitle title="Top selling products" subtitle={`Last ${vm.topProducts ? vm.topProducts.days : 30} days, by units sold`} href="/admin/products" />
          {!vm.topProducts ? (
            <Hidden />
          ) : vm.topProducts.rows.length === 0 ? (
            <p className="text-sm text-[#182308]-muted py-8">No sales yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {vm.topProducts.rows.slice(0, 6).map((product, index) => (
                <div key={product.id} className="flex items-center gap-3 rounded-xl border border-[#263e0e]/10 bg-[#faf8f4]-raised p-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClasses[STAT_STYLES[index % STAT_STYLES.length].tone]}`}><Box className="w-4.5 h-4.5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#182308]">{product.name}</p>
                    <p className="mt-0.5 text-[11px] text-[#182308]-muted">{product.units} units · {product.revenue}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#182308]">{product.profit === HIDDEN ? HIDDEN : product.profit}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="rounded-2xl">
          <SectionTitle title="Low stock alert" subtitle="Products that need attention" href="/admin/inventory" />
          {!vm.lowStock ? (
            <Hidden />
          ) : vm.lowStock.items.length === 0 ? (
            <div className="rounded-xl bg-[#3d6b3d]/10 p-4 text-sm text-emerald-700">All products are well stocked.</div>
          ) : (
            <div className="space-y-3">
              {vm.lowStock.items.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#b4bf41]/15 text-[#748e40]"><AlertTriangle className="w-4 h-4" /></span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#182308]">{product.name}</span>
                  <span className="shrink-0 text-[11px] font-semibold text-warning">{product.stock} / {product.threshold}</span>
                </div>
              ))}
              {vm.lowStock.count > 5 && <Link to="/admin/inventory" className="inline-flex items-center gap-1 text-xs font-semibold text-[#263e0e]">View all {vm.lowStock.count}<ChevronRight className="w-3 h-3" /></Link>}
            </div>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-violet-50 dark:from-indigo-950/20 dark:via-surface dark:to-violet-950/20">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          <QuickLink href="/admin/inventory" icon={Package} title="Inventory" text="Check low stock & incoming stock" tone="blue" />
          <QuickLink href="/admin/orders" icon={ShoppingBag} title="Orders" text="Review and manage orders" tone="purple" />
          <QuickLink href="/admin/products" icon={Box} title="Products" text="Manage your perfume catalog" tone="orange" />
          <QuickLink href="/admin/analytics" icon={BarChart3} title="Analytics" text="Open detailed store reports" tone="green" />
        </div>
      </Card>
    </div>
  );
}
