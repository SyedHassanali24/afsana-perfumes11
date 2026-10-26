import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AlertTriangle, Plus, ShoppingBag, Package, Megaphone, ExternalLink, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import useApi from "../../src/hooks/useApi";
import { analyticsApi } from "../../src/services";
import { toDashboard, money, HIDDEN } from "../../src/services/mappers/dashboard";

const Hidden = () => <p className="text-sm text-ink-muted">{HIDDEN} — your role cannot see this section.</p>;
const Pulse = ({ className = "" }) => <div className={`rounded-sm bg-border/70 animate-pulse ${className}`} />;

const ORDER_COLUMNS = [
  { key: "id", header: "Order Ref" },
  { key: "customer", header: "Client Patron" },
  { key: "total", header: "Total Amount", align: "right" },
  { key: "status", header: "Fulfillment Status", render: (row) => <StatusPill status={row.status} /> },
  { key: "date", header: "Date Placed", align: "right" },
];

const TOP_COLUMNS = [
  { key: "name", header: "Flacon Creation" },
  { key: "units", header: "Bottles Sold", align: "right" },
  { key: "revenue", header: "Gross Sales", align: "right" },
  { key: "profit", header: "Estimated Margin", align: "right" },
];

function Header() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold font-semibold">
            Enterprise Operations Center
          </p>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl text-ink font-normal tracking-tight mt-0.5">
          Executive Command Center
        </h1>
        <p className="text-xs text-ink-muted mt-1">
          Real-time commerce telemetry, sales analytics, stock alerts, and customer orders.
        </p>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-gold hover:bg-gold-hover text-bg text-xs font-semibold uppercase tracking-wider transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Flacon</span>
        </Link>
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-surface hover:bg-surface-raised border border-border text-ink text-xs font-medium transition-colors"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-gold" />
          <span>Orders</span>
        </Link>
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-surface hover:bg-surface-raised border border-border text-ink-muted hover:text-ink text-xs font-medium transition-colors"
        >
          <span>Live Storefront</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useApi(() => analyticsApi.dashboard(), []);
  const vm = useMemo(() => (data ? toDashboard(data.dashboard) : null), [data]);

  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-danger font-medium">{error.message || "Could not retrieve executive telemetry."}</p>
            <Button variant="secondary" onClick={reload}>Retry Telemetry</Button>
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
        <Card><p className="text-sm text-ink-muted py-8 text-center">Your role does not include access to financial or inventory metrics. Contact the House Administrator for elevated privileges.</p></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* 6 Executive Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {vm.cards.map((c) => (
          <StatCard key={c.key} label={c.label} value={c.value} changePct={c.changePct} changeLabel={c.changeLabel} />
        ))}
      </div>

      {/* Charts & Low Stock Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue 30-Day Trend Chart */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg text-ink font-medium tracking-tight">Revenue Trajectory</h2>
              <p className="text-xs text-ink-muted">Gross sales across Pakistan (PKR), past 30 days</p>
            </div>
            <span className="px-2.5 py-1 rounded-sm bg-gold/10 text-gold text-xs font-semibold">
              PKR Currency
            </span>
          </div>

          {!vm.series ? (
            <Hidden />
          ) : vm.seriesIsEmpty ? (
            <p className="text-sm text-ink-muted py-20 text-center">No sales logged in the past 30 days yet. As orders are placed, the trajectory curve will render automatically.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vm.series} margin={{ left: -15, right: 8, top: 10 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      fontSize: 12,
                      color: "var(--ink)",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    }}
                    formatter={(v) => [money(v), "Gross Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--gold)"
                    strokeWidth={2.5}
                    fill="url(#revenueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Low Stock Watch Center */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg text-ink font-medium tracking-tight">Inventory Watch</h2>
              <p className="text-xs text-ink-muted">Flacons nearing low-stock threshold</p>
            </div>
            <Link to="/admin/inventory" className="text-xs text-gold hover:underline">
              Inventory →
            </Link>
          </div>

          {!vm.lowStock ? (
            <Hidden />
          ) : vm.lowStock.items.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-success mx-auto" />
              <p className="text-xs text-ink-muted">All flacons and sizes are optimally stocked.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-3">
                {vm.lowStock.items.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-xs p-2.5 rounded-sm bg-surface-raised border border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                      <span className="text-ink font-medium truncate">{p.name}</span>
                    </div>
                    <span className="text-warning font-mono font-semibold shrink-0 ml-2">
                      {p.stock} / {p.threshold} units
                    </span>
                  </li>
                ))}
              </ul>
              {vm.lowStock.count > vm.lowStock.items.length && (
                <Link to="/admin/inventory" className="block text-center mt-3 text-xs text-gold hover:underline">
                  View all {vm.lowStock.count} alerts {vm.lowStock.outOfStock ? ` (${vm.lowStock.outOfStock} depleted)` : ""}
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Orders & Top Products Data Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2" padded={false}>
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <div>
              <h2 className="font-display text-lg text-ink font-medium tracking-tight">Recent Client Orders</h2>
              <p className="text-xs text-ink-muted">Latest acquisitions from the storefront</p>
            </div>
            <Link to="/admin/orders" className="text-xs text-gold hover:underline">
              All Orders →
            </Link>
          </div>
          <div className="px-6 pb-6">
            {!vm.recentOrders ? (
              <div className="pt-3"><Hidden /></div>
            ) : (
              <DataTable columns={ORDER_COLUMNS} rows={vm.recentOrders} emptyMessage="No orders placed yet. Orders will appear here in real time." />
            )}
          </div>
        </Card>

        <Card padded={false}>
          <div className="px-6 pt-5 pb-2">
            <h2 className="font-display text-lg text-ink font-medium tracking-tight">Top Performing Flacons</h2>
            <p className="text-xs text-ink-muted">Past {vm.topProducts ? vm.topProducts.days : 30} days, sorted by volume</p>
          </div>
          <div className="px-6 pb-6">
            {!vm.topProducts ? (
              <div className="pt-3"><Hidden /></div>
            ) : (
              <DataTable columns={TOP_COLUMNS} rows={vm.topProducts.rows} emptyMessage="No fragrance sales logged yet." />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
