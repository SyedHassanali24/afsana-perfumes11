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

const LIMIT = 20;
const GROUPS = ["New", "Repeat", "VIP", "Inactive"];
const TONE = { Repeat: "success", VIP: "gold", Inactive: "warning" };
export const money = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;
export const day = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function CustomersList() {
  const [view, setView] = useState("customers");
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const q = useDebounce(search);

  const customerQuery = useApi(
    () => view === "customers" ? customersApi.list({ q, segment, page, limit: LIMIT }) : Promise.resolve(null),
    [view, q, segment, page],
  );
  const leadQuery = useApi(
    () => view === "leads" ? customersApi.leads({ q, page, limit: LIMIT }) : Promise.resolve(null),
    [view, q, page],
  );

  const data = view === "customers" ? customerQuery.data : leadQuery.data;
  const loading = view === "customers" ? customerQuery.loading : leadQuery.loading;
  const error = view === "customers" ? customerQuery.error : leadQuery.error;
  const reload = view === "customers" ? customerQuery.reload : leadQuery.reload;
  const rows = view === "customers" ? data?.customers || [] : data?.leads || [];
  const pg = data?.pagination;
  const counts = data?.counts;

  useEffect(() => { if (pg && pg.pages >= 1 && page > pg.pages) setPage(pg.pages); }, [pg, page]);
  const filtered = Boolean(q || segment);
  const pick = (g) => { setSegment(g); setPage(1); };

  const customerColumns = [
    { key: "name", header: "Customer" },
    { key: "phone", header: "Phone", render: (r) => (r.hidden?.phone ? <span className="text-[#182308]-muted">Hidden</span> : r.phone || "—") },
    { key: "city", header: "City", render: (r) => r.city || "—" },
    { key: "orders", header: "Orders", align: "right", render: (r) => r.stats.ordersCount },
    { key: "spent", header: "Spent", align: "right", render: (r) => money(r.stats.totalSpent) },
    { key: "segment", header: "Group", render: (r) => <StatusPill status={r.segment} tone={TONE[r.segment]} /> },
    { key: "last", header: "Last order", align: "right", render: (r) => day(r.stats.lastOrderAt) },
  ];
  const leadColumns = [
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone", render: (r) => r.hidden?.phone ? <span className="text-[#182308]-muted">Hidden</span> : r.phone || "—" },
    { key: "couponCode", header: "10% coupon", render: (r) => <span className="rounded-md bg-[#f3f5ef] px-2 py-1 font-mono text-xs font-bold text-[#194629]">{r.couponCode}</span> },
    { key: "source", header: "Source" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    { key: "consent", header: "Marketing consent", render: (r) => <span className="text-xs text-[#3d6b3d]">{r.marketingConsent ? "Yes" : "No"}</span> },
    { key: "createdAt", header: "Captured", align: "right", render: (r) => day(r.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-[#182308]">Customers</h1>
        <p className="mt-1 text-sm text-[#182308]-muted">{pg ? `${pg.total} ${view === "leads" ? "offer leads" : "customers"}${filtered ? " match these filters" : ""}` : " "}</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Customer records">
        <button type="button" role="tab" aria-selected={view === "customers"} onClick={() => { setView("customers"); setPage(1); setSegment(""); }} className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${view === "customers" ? "border-[#194629] bg-[#194629] text-white" : "border-[#dfe5db] bg-white text-[#42503d] hover:bg-[#f4f6f1]"}`}>Customers</button>
        <button type="button" role="tab" aria-selected={view === "leads"} onClick={() => { setView("leads"); setPage(1); setSegment(""); }} className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${view === "leads" ? "border-[#194629] bg-[#194629] text-white" : "border-[#dfe5db] bg-white text-[#42503d] hover:bg-[#f4f6f1]"}`}>10% Offer Leads</button>
      </div>

      <Card padded={false}>
        <div className="space-y-3 border-b border-[#263e0e]/10 p-4 sm:p-5">
          <Input placeholder={view === "leads" ? "Search email, phone or coupon…" : "Search name, email or phone…"} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search records" />
          {view === "customers" && <div className="flex flex-wrap gap-2" role="group" aria-label="Customer group">
            <button type="button" onClick={() => pick("")} aria-pressed={segment === ""} className={`rounded-sm border px-3 py-1.5 text-xs ${segment === "" ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[#263e0e]/10 text-[#182308]-muted hover:bg-[#f3f1e9]"}`}>All</button>
            {GROUPS.map((g) => <button key={g} type="button" onClick={() => pick(g)} aria-pressed={segment === g} className={`rounded-sm border px-3 py-1.5 text-xs ${segment === g ? "border-[#748e40] text-[#182308]" : "border-[#263e0e]/10 text-[#182308]-muted"}`}>{g}{counts ? ` (${counts[g] ?? 0})` : ""}</button>)}
          </div>}
          {view === "leads" && <p className="text-xs leading-5 text-[#667160]">Contacts who claimed the welcome 10% offer and agreed to receive AFSANA marketing updates. Use the phone/email to follow up; each coupon is single-use and expires after 7 days.</p>}
        </div>

        <div className="p-4 sm:p-5">
          {error ? (
            <div className="space-y-3 py-10 text-center">
              <p className="text-sm text-[#9b3f3f]">{error.message}</p>
              <Button variant="secondary" onClick={reload}>Try again</Button>
            </div>
          ) : (
            <DataTable
              loading={loading}
              rows={rows.map((r) => ({ ...r, id: view === "customers" ? r._id : r.id }))}
              columns={view === "customers" ? customerColumns : leadColumns}
              onRowClick={view === "customers" ? (r) => setDetailId(r._id) : undefined}
              emptyMessage={view === "leads" ? "No 10% offer leads yet." : filtered ? "No customers match these filters." : "No customers yet. They appear after the first order."}
              pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }}
            />
          )}
        </div>
      </Card>

      {view === "customers" && <CustomerDrawer customerId={detailId} onClose={() => setDetailId(null)} onChanged={reload} />}
    </div>
  );
}
