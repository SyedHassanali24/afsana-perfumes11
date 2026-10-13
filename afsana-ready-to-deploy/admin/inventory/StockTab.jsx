import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Check, Input } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import StockAdjustDrawer from "./StockAdjustDrawer";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { inventoryApi } from "../../src/services";

const PILL = { ok: "In Stock", low: "Low Stock", out: "Out of Stock" };

export default function StockTab() {
  const [search, setSearch] = useState("");
  const [low, setLow] = useState(false);
  const [page, setPage] = useState(1);
  const [item, setItem] = useState(null);
  const [notice, setNotice] = useState("");
  const q = useDebounce(search);
  const { data, loading, error, reload } = useApi(() => inventoryApi.list({ q, low: low || undefined, page, limit: 20 }), [q, low, page]);
  const sum = useApi(() => inventoryApi.summary(), []);
  const s = sum.data?.summary;
  const pg = data?.pagination;

  const columns = [
    { key: "name", header: "Product", render: (r) => <span>{r.productName} <span className="text-ink-muted">· {r.label}</span></span> },
    { key: "sku", header: "SKU" },
    { key: "current", header: "On hand", align: "right" },
    { key: "reserved", header: "Reserved", align: "right" },
    { key: "available", header: "Available", align: "right" },
    { key: "incoming", header: "Incoming", align: "right", render: (r) => (r.incoming ? `+${r.incoming}` : "—") },
    { key: "status", header: "Status", render: (r) => <StatusPill status={PILL[r.status]} /> },
    { key: "a", header: "", align: "right", render: (r) => (
      <button onClick={() => setItem(r)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs text-ink-muted hover:bg-bg hover:text-ink transition-colors">
        <SlidersHorizontal className="w-3.5 h-3.5" /> Manage
      </button>
    ) },
  ];
  const stat = (label, v, onClick, tone) => (
    <button onClick={onClick} disabled={!onClick} className={`text-left bg-surface border border-border rounded-md p-4 ${onClick ? "hover:border-[var(--gold)]" : ""}`}>
      <p className={`font-display text-2xl ${tone || "text-ink"}`}>{v ?? "—"}</p><p className="text-xs text-ink-muted mt-1">{label}</p>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stat("Sizes tracked", s?.sizes)}
        {stat("Units on hand", s?.units)}
        {stat("Low stock", s?.lowStock, () => { setLow(true); setPage(1); }, s?.lowStock ? "text-warning" : undefined)}
        {stat("Out of stock", s?.outOfStock, () => { setLow(true); setPage(1); }, s?.outOfStock ? "text-danger" : undefined)}
      </div>
      {notice && <p role="status" className="text-sm rounded-sm px-3 py-2 bg-success-soft text-success">{notice}</p>}
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-4 p-5 border-b border-border">
          <div className="flex-1 min-w-[200px]"><Input placeholder="Search product or SKU…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <Check label="Low & out of stock only" checked={low} onChange={(v) => { setLow(v); setPage(1); }} />
        </div>
        <div className="p-5">
          {error ? (
            <div className="py-10 text-center space-y-3"><p className="text-sm text-danger">{error.status === 403 ? "You don't have access to inventory." : error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>
          ) : (
            <DataTable loading={loading} rows={data?.items || []} columns={columns} emptyMessage={q || low ? "Nothing matches." : "No stock records yet. Add a product first."}
              pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }} />
          )}
        </div>
      </Card>
      <StockAdjustDrawer open={Boolean(item)} item={item} onClose={() => setItem(null)}
        onDone={(msg) => { reload(); sum.reload(); if (msg) { setItem(null); setNotice(msg); setTimeout(() => setNotice(""), 4000); } }} />
    </div>
  );
}
