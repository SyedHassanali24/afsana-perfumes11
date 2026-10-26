import { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import CustomerDrawer from "./CustomerDrawer";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { customersApi } from "../../src/services";

// Route: /admin/customers (permission customers.view). GET /api/customers/admin?q=&segment=&page=&limit= -> { customers, counts, pagination }
const LIMIT = 20;
const GROUPS = ["New", "Repeat", "VIP", "Inactive"];
const TONE = { Repeat: "success", VIP: "gold", Inactive: "warning" }; // StatusPill tones: success | warning | danger | gold ("New" uses the pill's own default)
export const money = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;
export const day = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function CustomersList() {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const q = useDebounce(search);

  const { data, loading, error, reload } = useApi(() => customersApi.list({ q, segment, page, limit: LIMIT }), [q, segment, page]);
  const rows = data?.customers || [];
  const pg = data?.pagination;
  const counts = data?.counts;

  useEffect(() => { if (pg && pg.pages >= 1 && page > pg.pages) setPage(pg.pages); }, [pg, page]);

  const filtered = Boolean(q || segment);
  const pick = (g) => { setSegment(g); setPage(1); };

  const columns = [
    { key: "name", header: "Customer" },
    { key: "phone", header: "Phone", render: (r) => (r.hidden?.phone ? <span className="text-ink-muted">Hidden</span> : r.phone || "—") },
    { key: "city", header: "City", render: (r) => r.city || "—" },
    { key: "orders", header: "Orders", align: "right", render: (r) => r.stats.ordersCount },
    { key: "spent", header: "Spent", align: "right", render: (r) => money(r.stats.totalSpent) },
    { key: "segment", header: "Group", render: (r) => <StatusPill status={r.segment} tone={TONE[r.segment]} /> },
    { key: "last", header: "Last order", align: "right", render: (r) => day(r.stats.lastOrderAt) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Customers</h1>
        <p className="text-sm text-ink-muted mt-1">{pg ? `${pg.total} ${pg.total === 1 ? "customer" : "customers"}${filtered ? " match these filters" : ""}` : " "}</p>
      </div>

      <Card padded={false}>
        <div className="space-y-3 p-4 sm:p-5 border-b border-border">
          <Input placeholder="Search name, email or phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search customers" />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Customer group">
            <button type="button" onClick={() => pick("")} aria-pressed={segment === ""} className={`px-3 py-1.5 rounded-sm text-xs border ${segment === "" ? "border-gold text-ink" : "border-border text-ink-muted"}`}>All</button>
            {GROUPS.map((g) => (
              <button key={g} type="button" onClick={() => pick(g)} aria-pressed={segment === g} className={`px-3 py-1.5 rounded-sm text-xs border ${segment === g ? "border-gold text-ink" : "border-border text-ink-muted"}`}>
                {g}{counts ? ` (${counts[g] ?? 0})` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {error ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-danger">{error.message}</p>
              <Button variant="secondary" onClick={reload}>Try again</Button>
            </div>
          ) : (
            <DataTable
              loading={loading}
              rows={rows.map((r) => ({ ...r, id: r._id }))}
              columns={columns}
              onRowClick={(r) => setDetailId(r._id)}
              emptyMessage={filtered ? "No customers match these filters." : "No customers yet. They appear after the first order."}
              pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }}
            />
          )}
        </div>
      </Card>

      <CustomerDrawer customerId={detailId} onClose={() => setDetailId(null)} onChanged={reload} />
    </div>
  );
}
