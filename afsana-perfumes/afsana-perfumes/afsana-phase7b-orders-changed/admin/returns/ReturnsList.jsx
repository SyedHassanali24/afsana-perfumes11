import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import ReturnDrawer from "./ReturnDrawer";
import NewReturnDrawer from "./NewReturnDrawer";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { returnsApi } from "../../src/services";

// Route: /admin/returns  (permission returns.view). Customers request returns from their account; staff can also log one for a customer.
const TABS = ["All", "Pending", "Approved", "Received", "Refunded", "Rejected", "Cancelled"];
const money = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

export default function ReturnsList() {
  const { can } = useAuth();
  const [params] = useSearchParams(); // /admin/returns?q=AFS-000123 (link from the Orders drawer)
  const initialQ = params.get("q") || "";
  const [tab, setTab] = useState(initialQ ? "All" : "Pending");
  const [search, setSearch] = useState(initialQ);
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [creating, setCreating] = useState(false);
  const q = useDebounce(search);
  const status = tab === "All" ? "" : tab;
  const { data, loading, error, reload } = useApi(() => returnsApi.list({ q, status, page, limit: 20 }), [q, status, page]);
  const counts = data?.counts || {};
  const pg = data?.pagination;

  const columns = [
    { key: "returnNumber", header: "Return" },
    { key: "orderNumber", header: "Order" },
    { key: "customer", header: "Customer", render: (r) => r.customer?.name || "—" },
    { key: "items", header: "Items", align: "right", render: (r) => r.unitCount },
    { key: "value", header: "Value", align: "right", render: (r) => money(r.value) },
    { key: "reason", header: "Reason" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    { key: "createdAt", header: "Requested", render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Returns &amp; refunds</h1>
          <p className="text-sm text-ink-muted mt-1">Approve or decline return requests, receive the goods back, then refund the customer.</p>
        </div>
        {can("returns.create") && <Button icon={Plus} onClick={() => setCreating(true)}>New return</Button>}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setPage(1); }}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${tab === t ? "border-[var(--gold)] text-ink font-medium" : "border-transparent text-ink-muted hover:text-ink"}`}>
            {t}{t !== "All" && counts[t] ? <span className="ml-1.5 text-xs text-ink-muted">({counts[t]})</span> : null}
          </button>
        ))}
      </div>

      <Card padded={false}>
        <div className="p-5 border-b border-border">
          <div className="max-w-sm"><Input placeholder="Search return, order, name or phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        </div>
        <div className="p-5">
          {error ? (
            <div className="py-10 text-center space-y-3"><p className="text-sm text-danger">{error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>
          ) : (
            <DataTable loading={loading} rows={data?.returns || []} columns={columns} onRowClick={(r) => setDetailId(r.id)}
              emptyMessage={q ? "No returns match your search." : status ? `No ${status.toLowerCase()} returns.` : "No returns yet."}
              pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }} />
          )}
        </div>
      </Card>

      <ReturnDrawer returnId={detailId} onClose={() => setDetailId(null)} onChanged={reload} />
      <NewReturnDrawer open={creating} onClose={() => setCreating(false)} onCreated={(r) => { setCreating(false); reload(); setDetailId(r.id); }} />
    </div>
  );
}
