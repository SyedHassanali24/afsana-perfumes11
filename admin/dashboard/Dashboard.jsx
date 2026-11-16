import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  AlertTriangle, ArrowUpRight, BarChart3, Box, ChevronRight, CircleDollarSign,
  Package, ShoppingBag, Sparkles, TrendingUp, Users, Zap,
} from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import StatusPill from "../components/StatusPill";
import useApi from "../../src/hooks/useApi";
import { analyticsApi } from "../../src/services";
import { toDashboard, money, HIDDEN } from "../../src/services/mappers/dashboard";

const DASHBOARD_ORDER_KEY = "afsana-dashboard-stat-order-v1";
const Hidden = () => <p className="text-sm text-[#64748b]">{HIDDEN} — your role cannot see this part.</p>;
const STATUS_COLORS = ["#4f46e5", "#16a34a", "#4f46e5", "#8b5cf6", "#e11d48", "#4f46e5"];
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

const Pulse = ({ className = "" }) => <div className={`rounded-xl bg-[#1e1b4b]/10 animate-pulse ${className}`} />;

const toneClasses = {
  blue: "bg-[#4f46e5]/10 text-[#4f46e5] ring-[#4f46e5]/10",
  green: "bg-[#16a34a]/10 text-[#16a34a] ring-[#16a34a]/10",
  purple: "bg-[#4f46e5]/10 text-[#4f46e5] ring-[#4f46e5]/10",
  orange: "bg-[#8b5cf6]/15 text-[#4f46e5] ring-[#8b5cf6]/15",
  red: "bg-[#fff1f2] text-[#e11d48] ring-[#e11d48]/10",
  indigo: "bg-[#1e1b4b]/10 text-[#1e1b4b] ring-[#1e1b4b]/10",
};

function Header() {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4f46e5]">Store overview</p>
      <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.04em] text-[#172033]">Dashboard</h1>
      <p className="text-sm text-[#64748b]">Welcome back. Here&apos;s what&apos;s happening with your store today.</p><span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#8b5cf6]/35 bg-[#eef2ff] px-2.5 py-1 text-[10px] font-semibold text-[#1e1b4b]"><Zap className="h-3 w-3" /> Fast mode · cached dashboard</span>
    </div>
  );
}

function SectionTitle({ title, subtitle, href, action = "View all" }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-[16px] font-semibold text-[#172033]">{title}</h2>
        {subtitle && <p className="text-xs text-[#64748b] mt-1">{subtitle}</p>}
      </div>
      {href && <Link to={href} className="inline-flex items-center gap-1 text-xs font-semibold text-[#1e1b4b] hover:text-[#4f46e5]">{action}<ChevronRight className="w-3.5 h-3.5" /></Link>}
    </div>
  );
}

function StatCard({ card, index }) {
  const style = STAT_STYLES[index % STAT_STYLES.length];
  const Icon = style.icon;
  const hasChange = typeof card.changePct === "number";
  const isUp = hasChange && card.changePct >= 0;

  return (
    <div className="dashboard-stat-card rounded-2xl border border-[#1e1b4b]/10 bg-[#ffffff] p-4 sm:p-5 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${toneClasses[style.tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {hasChange && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-bold ${isUp ? "bg-[#16a34a]/10 text-[#16a34a]" : "bg-[#fff1f2] text-[#e11d48]"}`}>
            <ArrowUpRight className="w-3 h-3" />
            {Math.abs(card.changePct)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-medium text-[#64748b]">{card.label}</p>
      <p className="mt-1 text-[25px] leading-tight font-semibold tracking-[-0.035em] text-[#172033]">{card.value}</p>
      {card.changeLabel && <p className="mt-1 text-[11px] text-[#64748b]">{card.changeLabel}</p>}
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, text, tone }) {
  return (
    <Link to={href} className="group flex items-center gap-3 min-w-0 rounded-xl px-3 py-2 transition-colors hover:bg-[#1e1b4b]/5">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClasses[tone]}`}><Icon className="w-4.5 h-4.5" /></span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[#172033]">{title}</span>
        <span className="block truncate text-[11px] text-[#64748b]">{text}</span>
      </span>
      <ChevronRight className="ml-auto w-4 h-4 shrink-0 text-[#64748b] group-hover:text-[#4f46e5]" />
    </Link>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useApi(() => analyticsApi.dashboard(), []);
  const [draggedCard, setDraggedCard] = useState(null);
  const [cardOrder, setCardOrder] = useState(() => {
    try {
      const saved = window.localStorage.getItem(DASHBOARD_ORDER_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  });
  const vm = useMemo(() => (data ? toDashboard(data.dashboard) : null), [data]);
  const orderedCards = useMemo(() => {
    const cards = vm?.cards || [];
    if (!cardOrder) return cards;
    const byKey = new Map(cards.map((card) => [card.key, card]));
    return cardOrder.map((key) => byKey.get(key)).filter(Boolean).concat(cards.filter((card) => !cardOrder.includes(card.key)));
  }, [vm?.cards, cardOrder]);

  useEffect(() => {
    if (!cardOrder || !vm?.cards?.length) return;
    const validKeys = new Set(vm.cards.map((card) => card.key));
    const next = cardOrder.filter((key) => validKeys.has(key));
    vm.cards.forEach((card) => {
      if (!next.includes(card.key)) next.push(card.key);
    });
    if (next.length !== cardOrder.length || next.some((key, index) => key !== cardOrder[index])) {
      setCardOrder(next);
    }
  }, [vm?.cards, cardOrder]);

  useEffect(() => {
    if (!cardOrder) return;
    try {
      window.localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(cardOrder));
    } catch {
      // Storage may be unavailable in private/restricted browser contexts.
    }
  }, [cardOrder]);

  const reorderCard = (fromKey, toKey) => {
    if (!fromKey || !toKey || fromKey === toKey || !vm?.cards) return;
    const current = orderedCards.map((card) => card.key);
    const from = current.indexOf(fromKey);
    const to = current.indexOf(toKey);
    if (from < 0 || to < 0) return;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setCardOrder(next);
  };

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
            <p className="text-sm text-[#e11d48]">{error.message || "Could not load the dashboard."}</p>
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
        <Card><p className="text-sm text-[#64748b] py-6 text-center">Your role does not include any dashboard data yet. Ask an admin for access to Orders or Inventory.</p></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Header />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {orderedCards.map((card, index) => (
          <div
            key={card.key}
            draggable
            onDragStart={() => setDraggedCard(card.key)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => { reorderCard(draggedCard, card.key); setDraggedCard(null); }}
            onDragEnd={() => setDraggedCard(null)}
            className={`cursor-grab active:cursor-grabbing transition-transform ${draggedCard === card.key ? "scale-[.98] opacity-60" : ""}`}
            title="Drag to reorder"
          >
            <StatCard card={card} index={index} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 rounded-2xl">
          <SectionTitle title="Sales overview" subtitle="Revenue for the last 30 days" />
          {!vm.series ? <Hidden /> : vm.seriesIsEmpty ? <p className="text-sm text-[#64748b] py-20 text-center">No sales in the last 30 days yet.</p> : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vm.series} margin={{ left: -16, right: 8, top: 6, bottom: 0 }}>
                  <defs><linearGradient id="revenueFillDashboard" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity={0.24} /><stop offset="100%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="#1e1b4b1a" vertical={false} strokeDasharray="3 5" />
                  <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #1e1b4b1a", borderRadius: 12, fontSize: 12, color: "#172033", boxShadow: "0 20px 50px rgba(24,35,8,.12)" }} formatter={(v) => [money(v), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fill="url(#revenueFillDashboard)" dot={false} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl bg-gradient-to-br from-[#eef2ff] via-[#ffffff] to-[#f3f4f9]">
          <SectionTitle title="Store snapshot" subtitle="Your latest activity at a glance" />
          <div className="rounded-2xl border border-[#1e1b4b]/10 bg-[#ffffff]/80 p-5">
            <div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#4f46e5] text-white shadow-lg shadow-[#1e1b4b]/20"><Sparkles className="w-6 h-6" /></div><div><p className="text-sm font-semibold text-[#172033]">Afsana Perfumes</p><p className="text-xs text-[#64748b]">Luxury in every scent</p></div></div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/80 p-3"><p className="text-[11px] text-[#64748b]">Recent orders</p><p className="mt-1 text-xl font-semibold text-[#172033]">{vm.recentOrders ? vm.recentOrders.length : HIDDEN}</p></div>
              <div className="rounded-xl bg-white/80 p-3"><p className="text-[11px] text-[#64748b]">Low stock</p><p className="mt-1 text-xl font-semibold text-[#172033]">{vm.lowStock ? vm.lowStock.count : HIDDEN}</p></div>
            </div>
            <Link to="/admin/products" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#1e1b4b] hover:text-[#4f46e5]">Manage products <ArrowUpRight className="w-3.5 h-3.5" /></Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="rounded-2xl">
          <SectionTitle title="Orders overview" subtitle="Recent order status mix" />
          {statusBreakdown.length ? (
            <>
              <div className="h-48 relative">
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={54} outerRadius={76} paddingAngle={3} stroke="none">{statusBreakdown.map((entry, index) => <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #1e1b4b1a", borderRadius: 10, fontSize: 12, color: "#172033" }} /></PieChart></ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none"><div className="text-center"><p className="text-2xl font-semibold text-[#172033]">{(vm.recentOrders || []).length}</p><p className="text-[10px] text-[#64748b]">Recent</p></div></div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">{statusBreakdown.map((s, i) => <span key={s.name} className="inline-flex items-center gap-2 text-[11px] text-[#64748b]"><i className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />{s.name}<b className="ml-auto text-[#172033]">{s.value}</b></span>)}</div>
            </>
          ) : <p className="text-sm text-[#64748b] py-16 text-center">No recent orders yet.</p>}
        </Card>

        <Card className="xl:col-span-2 rounded-2xl" padded={false}>
          <div className="px-5 pt-5"><SectionTitle title="Recent orders" subtitle="Latest customer activity" href="/admin/orders" /></div>
          {!vm.recentOrders ? <div className="px-5 pb-5"><Hidden /></div> : vm.recentOrders.length === 0 ? <p className="px-5 pb-6 text-sm text-[#64748b]">No orders yet.</p> : (
            <div className="divide-y divide-[#1e1b4b]/10">{vm.recentOrders.slice(0, 5).map((order) => <Link key={order.id} to="/admin/orders" className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#1e1b4b]/[0.03] transition-colors"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1e1b4b]/10 text-[#1e1b4b]"><ShoppingBag className="w-4 h-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[#172033] truncate">{order.id}</span><span className="block text-[11px] text-[#64748b] truncate">{order.customer} · {order.date}</span></span><StatusPill status={order.status} /><span className="hidden sm:block w-24 text-right text-xs font-semibold text-[#172033]">{order.total}</span></Link>)}</div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 rounded-2xl">
          <SectionTitle title="Top selling products" subtitle={`Last ${vm.topProducts ? vm.topProducts.days : 30} days, by units sold`} href="/admin/products" />
          {!vm.topProducts ? <Hidden /> : vm.topProducts.rows.length === 0 ? <p className="text-sm text-[#64748b] py-8">No sales yet.</p> : (
            <div className="grid sm:grid-cols-2 gap-3">{vm.topProducts.rows.slice(0, 6).map((product, index) => <div key={product.id} className="flex items-center gap-3 rounded-xl border border-[#1e1b4b]/10 bg-[#ffffff] p-3"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClasses[STAT_STYLES[index % STAT_STYLES.length].tone]}`}><Box className="w-4.5 h-4.5" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#172033]">{product.name}</p><p className="mt-0.5 text-[11px] text-[#64748b]">{product.units} units · {product.revenue}</p></div><span className="text-[11px] font-semibold text-[#172033]">{product.profit === HIDDEN ? HIDDEN : product.profit}</span></div>)}</div>
          )}
        </Card>

        <Card className="rounded-2xl">
          <SectionTitle title="Low stock alert" subtitle="Products that need attention" href="/admin/inventory" />
          {!vm.lowStock ? <Hidden /> : vm.lowStock.items.length === 0 ? <div className="rounded-xl bg-[#16a34a]/10 p-4 text-sm text-[#16a34a]">All products are well stocked.</div> : (
            <div className="space-y-3">{vm.lowStock.items.slice(0, 5).map((product) => <div key={product.id} className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#8b5cf6]/15 text-[#4f46e5]"><AlertTriangle className="w-4 h-4" /></span><span className="min-w-0 flex-1 truncate text-xs font-medium text-[#172033]">{product.name}</span><span className="shrink-0 text-[11px] font-semibold text-[#d97706]">{product.stock} / {product.threshold}</span></div>)}{vm.lowStock.count > 5 && <Link to="/admin/inventory" className="inline-flex items-center gap-1 text-xs font-semibold text-[#1e1b4b]">View all {vm.lowStock.count}<ChevronRight className="w-3 h-3" /></Link>}</div>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl bg-gradient-to-r from-[#eef2ff] via-[#ffffff] to-[#f3f4f9]">
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
