import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import useApi from "../../src/hooks/useApi";
import { analyticsApi } from "../../src/services";
import { toDashboard, money, HIDDEN } from "../../src/services/mappers/dashboard";

const Hidden = () => <p className="text-sm text-ink-muted">{HIDDEN} — your role cannot see this part.</p>;
const STATUS_COLORS = ["#B4874B", "#18845B", "#64748B", "#C94B4B", "#8B5CF6"];
const STATUS_LABELS = { pending: "Pending", processing: "Processing", confirmed: "Confirmed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled", refunded: "Refunded" };

const Pulse = ({ className = "" }) => <div className={`rounded-sm bg-border/70 animate-pulse ${className}`} />;

const ORDER_COLUMNS = [
  { key: "id", header: "Order" },
  { key: "customer", header: "Customer" },
  { key: "total", header: "Total", align: "right" },
  { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
  { key: "date", header: "Date", align: "right" },
];
const TOP_COLUMNS = [
  { key: "name", header: "Product" },
  { key: "units", header: "Units", align: "right" },
  { key: "revenue", header: "Sales", align: "right" },
  { key: "profit", header: "Profit", align: "right" },
];

function Header() {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold mb-1">Overview</p>
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink">Good morning, here’s your store.</h1>
        <p className="text-sm text-ink-muted mt-1">A clear view of sales, orders and stock — without the clutter.</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useApi(() => analyticsApi.dashboard(), []);
  const vm = useMemo(() => (data ? toDashboard(data.dashboard) : null), [data]);
  const statusBreakdown = useMemo(() => {
    const map = new Map();
    (vm.recentOrders || []).forEach((o) => map.set(o.status, (map.get(o.status) || 0) + 1));
    return Array.from(map, ([key, value]) => ({ name: STATUS_LABELS[key] || key, value })).filter((x) => x.value);
  }, [vm.recentOrders]);


  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-danger">{error.message || "Could not load the dashboard."}</p>
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
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><Pulse className="h-3.5 w-1/2" /><Pulse className="h-8 w-3/4 mt-3" /></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2"><Pulse className="h-64 w-full" /></Card>
          <Card><Pulse className="h-64 w-full" /></Card>
        </div>
      </div>
    );
  }

  if (vm.allHidden) {
    return (
      <div className="space-y-6">
        <Header />
        <Card><p className="text-sm text-ink-muted py-6 text-center">Your role does not include any dashboard data yet. Ask an admin for access to Orders or Inventory.</p></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {vm.cards.map((c) => (
          <StatCard key={c.key} label={c.label} value={c.value} changePct={c.changePct} changeLabel={c.changeLabel} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-ink">Revenue, last 30 days</h2>
          </div>
          {!vm.series ? (
            <Hidden />
          ) : vm.seriesIsEmpty ? (
            <p className="text-sm text-ink-muted py-16 text-center">No sales in the last 30 days yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vm.series} margin={{ left: -20, right: 8 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "var(--ink-muted)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={24} />
                  <YAxis
                    tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--ink)" }}
                    formatter={(v) => [money(v), "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--gold)" strokeWidth={2} fill="url(#revenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div><h2 className="text-[15px] font-semibold text-ink">Order status</h2><p className="text-xs text-ink-muted mt-0.5">Recent order mix</p></div>
          </div>
          {statusBreakdown.length ? (
            <div className="h-52 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={3} stroke="none">
                    {statusBreakdown.map((entry, index) => <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--ink)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none"><div className="text-center"><p className="text-2xl font-semibold text-ink">{(vm.recentOrders || []).length}</p><p className="text-[10px] uppercase tracking-wider text-ink-muted">recent</p></div></div>
            </div>
          ) : <p className="text-sm text-ink-muted py-16 text-center">No recent orders yet.</p>}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
            {statusBreakdown.map((s, i) => <span key={s.name} className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted"><i className="w-2 h-2 rounded-full" style={{background:STATUS_COLORS[i % STATUS_COLORS.length]}} />{s.name} <b className="text-ink">{s.value}</b></span>)}
          </div>
        </Card>

        <Card>
          <h2 className="text-[15px] font-semibold text-ink mb-4">Low stock products</h2>
          {!vm.lowStock ? (
            <Hidden />
          ) : vm.lowStock.items.length === 0 ? (
            <p className="text-sm text-ink-muted">All products are well stocked.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {vm.lowStock.items.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                      <span className="text-ink truncate">{p.name}</span>
                    </div>
                    <span className="text-ink-muted shrink-0 ml-2">{p.stock} / {p.threshold}</span>
                  </li>
                ))}
              </ul>
              {vm.lowStock.count > vm.lowStock.items.length && (
                <Link to="/admin/inventory" className="block mt-4 text-sm text-gold hover:underline">
                  View all {vm.lowStock.count}{vm.lowStock.outOfStock ? ` (${vm.lowStock.outOfStock} out of stock)` : ""}
                </Link>
              )}
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2" padded={false}>
          <div className="flex items-center justify-between px-5 pt-5 pb-1">
            <h2 className="font-display text-lg text-ink">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm text-gold hover:underline">View all</Link>
          </div>
          <div className="px-5 pb-5">
            {!vm.recentOrders ? (
              <div className="pt-3"><Hidden /></div>
            ) : (
              <DataTable columns={ORDER_COLUMNS} rows={vm.recentOrders} emptyMessage="No orders yet." />
            )}
          </div>
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-5 pb-1">
            <h2 className="font-display text-lg text-ink">Top products</h2>
            <p className="text-xs text-ink-muted mt-0.5">Last {vm.topProducts ? vm.topProducts.days : 30} days, by units sold</p>
          </div>
          <div className="px-5 pb-5">
            {!vm.topProducts ? (
              <div className="pt-3"><Hidden /></div>
            ) : (
              <DataTable columns={TOP_COLUMNS} rows={vm.topProducts.rows} emptyMessage="No sales yet." />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
