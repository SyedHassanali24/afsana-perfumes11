import { useState } from "react";
import { Plus } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import PurchaseOrderFormDrawer from "./PurchaseOrderFormDrawer";
import PurchaseOrderDrawer from "./PurchaseOrderDrawer";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { purchaseOrdersApi } from "../../src/services";

const STATUSES = ["Draft", "Ordered", "Partially Received", "Received", "Cancelled"];

export default function PurchaseOrdersTab() {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [ver, setVer] = useState(0); // refreshes the open detail drawer after an edit
  const [form, setForm] = useState({ open: false, po: null });
  const q = useDebounce(search);
  const { data, loading, error, reload } = useApi(() => purchaseOrdersApi.list({ q, status, page, limit: 20 }), [q, status, page]);
  const pg = data?.pagination;

  const columns = [
    { key: "poNumber", header: "PO" },
    { key: "supplier", header: "Supplier", render: (r) => r.supplier.name || "—" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    { key: "units", header: "Units received", align: "right", render: (r) => `${r.unitsReceived} / ${r.unitsOrdered}` },
    { key: "totalCost", header: "Total", align: "right", render: (r) => (r.totalCost === undefined ? "—" : `PKR ${Number(r.totalCost).toLocaleString("en-PK")}`) },
    { key: "expectedDate", header: "Expected", render: (r) => (r.expectedDate ? new Date(r.expectedDate).toLocaleDateString() : "—") },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Order stock from suppliers and receive it into inventory.</p>
        {can("purchaseOrders.create") && <Button icon={Plus} onClick={() => setForm({ open: true, po: null })}>New purchase order</Button>}
      </div>
      <Card padded={false}>
        <div className="flex flex-wrap gap-3 p-5 border-b border-border">
          <div className="flex-1 min-w-[180px]"><Input placeholder="Search PO number…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <div className="w-48"><Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></div>
        </div>
        <div className="p-5">
          {error ? <div className="py-10 text-center space-y-3"><p className="text-sm text-danger">{error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>
            : <DataTable loading={loading} rows={data?.orders || []} columns={columns} onRowClick={(r) => setDetailId(r.id)} emptyMessage={q || status ? "No purchase orders match." : "No purchase orders yet."} pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }} />}
        </div>
      </Card>
      <PurchaseOrderDrawer poId={detailId} version={ver} onClose={() => setDetailId(null)} onChanged={reload} onEdit={(po) => setForm({ open: true, po })} />
      <PurchaseOrderFormDrawer open={form.open} po={form.po} onClose={() => setForm({ open: false, po: null })}
        onSaved={() => { setForm({ open: false, po: null }); reload(); setVer((n) => n + 1); }} />
    </div>
  );
}
