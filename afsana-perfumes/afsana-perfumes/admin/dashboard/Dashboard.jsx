import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import {
  mockKpis,
  mockRevenueSeries,
  mockRecentOrders,
  mockLowStock,
  mockSecurityAlerts,
} from "./mockData";

export default function Dashboard() {
  // Phase 3: replace the mock imports above with a single
  // GET /api/analytics/dashboard call and drive these same props from state.

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Dashboard</h1>
        <p className="text-sm text-ink-muted mt-1">
          Here's how the store is doing today.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Today's revenue" value={mockKpis.todayRevenue} changePct={8.2} changeLabel="vs yesterday" />
        <StatCard label="This month" value={mockKpis.monthRevenue} changePct={14.6} changeLabel="vs last month" />
        <StatCard label="Total orders" value={mockKpis.totalOrders} />
        <StatCard label="Pending orders" value={mockKpis.pendingOrders} changePct={-3.1} changeLabel="vs yesterday" />
        <StatCard label="Low stock" value={mockKpis.lowStockCount} />
        <StatCard label="Avg. order value" value={mockKpis.avgOrderValue} changePct={2.4} changeLabel="vs last month" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-ink">Revenue, last 30 days</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockRevenueSeries} margin={{ left: -20, right: 8 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 13,
                    color: "var(--ink)",
                  }}
                  formatter={(v) => [`PKR ${v.toLocaleString()}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--gold)"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg text-ink mb-4">Low stock products</h2>
          {mockLowStock.length === 0 ? (
            <p className="text-sm text-ink-muted">All products are well stocked.</p>
          ) : (
            <ul className="space-y-3">
              {mockLowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                    <span className="text-ink truncate">{p.name}</span>
                  </div>
                  <span className="text-ink-muted shrink-0 ml-2">
                    {p.stock} / {p.threshold}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" padded={false}>
          <div className="flex items-center justify-between px-5 pt-5 pb-1">
            <h2 className="font-display text-lg text-ink">Recent orders</h2>
            <a href="/admin/orders" className="text-sm text-gold hover:underline">
              View all
            </a>
          </div>
          <div className="px-5 pb-5">
            <DataTable
              columns={[
                { key: "id", header: "Order" },
                { key: "customer", header: "Customer" },
                { key: "total", header: "Total", align: "right" },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <StatusPill status={row.status} />,
                },
                { key: "date", header: "Date", align: "right" },
              ]}
              rows={mockRecentOrders}
            />
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg text-ink mb-4">Security alerts</h2>
          {mockSecurityAlerts.length === 0 ? (
            <p className="text-sm text-ink-muted">No alerts. All clear.</p>
          ) : (
            <ul className="space-y-4">
              {mockSecurityAlerts.map((a) => (
                <li key={a.id} className="flex gap-2.5 text-sm">
                  <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <div>
                    <p className="text-ink">{a.message}</p>
                    <p className="text-ink-muted text-xs mt-0.5">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
