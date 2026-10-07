import { useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, Power } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import ConfirmDialog from "../components/ConfirmDialog";
import { Input, Select } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import CouponDrawer from "./CouponDrawer";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { couponsApi } from "../../src/services";
import { STATUS_OPTIONS, STATUS_TONE, toRow } from "../../src/services/mappers/coupons";

export default function CouponsList() {
  const { can } = useAuth();
  const [tab, setTab] = useState("active"); // 'active' | 'trash'
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState({ open: false, coupon: null });
  const [del, setDel] = useState(null);
  const [notice, setNotice] = useState(null); // { type: 'ok'|'error', text }
  const q = useDebounce(search);
  const inTrash = tab === "trash";

  const { data, loading, error, reload } = useApi(
    () => couponsApi.list({ q, status: inTrash ? undefined : status, trash: inTrash ? "true" : undefined, page, limit: 20 }),
    [inTrash, q, status, page]
  );
  const rows = (data?.coupons || []).map(toRow);
  const pg = data?.pagination;
  const flash = (type, text) => { setNotice({ type, text }); setTimeout(() => setNotice(null), 4000); };
  const act = async (fn, okText) => { try { await fn(); flash("ok", okText); reload(); } catch (e) { flash("error", e.message); } };

  const columns = [
    { key: "code", header: "Code", render: (r) => <span className="font-medium tracking-wide">{r.code}</span> },
    { key: "discount", header: "Discount" },
    { key: "minOrder", header: "Min order", align: "right" },
    { key: "usage", header: "Used", align: "right" },
    { key: "validity", header: "Valid" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} tone={STATUS_TONE[r.status]} /> },
    { key: "a", header: "", align: "right", render: (r) => (
      <div className="flex justify-end gap-1">
        {inTrash ? (
          can("coupons.delete") && <button onClick={() => act(() => couponsApi.restore(r.id), `${r.code} restored (inactive). Switch it on when ready.`)} className="p-1.5 rounded-sm text-ink-muted hover:bg-bg hover:text-ink" aria-label={`Restore ${r.code}`}><RotateCcw className="w-4 h-4" /></button>
        ) : (<>
          {can("coupons.edit") && <button onClick={() => act(() => couponsApi.setActive(r.id, !r.isActive), r.isActive ? `${r.code} switched off.` : `${r.code} switched on.`)} className="p-1.5 rounded-sm text-ink-muted hover:bg-bg hover:text-ink" aria-label={r.isActive ? `Turn off ${r.code}` : `Turn on ${r.code}`} title={r.isActive ? "Turn off" : "Turn on"}><Power className="w-4 h-4" /></button>}
          {can("coupons.edit") && <button onClick={() => setDrawer({ open: true, coupon: r.raw })} className="p-1.5 rounded-sm text-ink-muted hover:bg-bg hover:text-ink" aria-label={`Edit ${r.code}`}><Pencil className="w-4 h-4" /></button>}
          {can("coupons.delete") && <button onClick={() => setDel(r)} className="p-1.5 rounded-sm text-ink-muted hover:bg-danger-soft hover:text-danger" aria-label={`Delete ${r.code}`}><Trash2 className="w-4 h-4" /></button>}
        </>)}
      </div>
    ) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Coupons</h1>
          <p className="text-sm text-ink-muted mt-1">{pg ? `${pg.total} ${inTrash ? "in Trash" : pg.total === 1 ? "coupon" : "coupons"}` : "Discount codes shoppers can use at checkout."}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setTab(inTrash ? "active" : "trash"); setPage(1); }}>{inTrash ? "Back to coupons" : "Trash"}</Button>
          {!inTrash && can("coupons.create") && <Button icon={Plus} onClick={() => setDrawer({ open: true, coupon: null })}>Add coupon</Button>}
        </div>
      </div>
      {notice && <p role="status" className={`text-sm rounded-sm px-3 py-2 ${notice.type === "ok" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{notice.text}</p>}
      <Card padded={false}>
        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1"><Input placeholder="Search by code…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
            {!inTrash && (
              <div className="w-48"><Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
                <option value="">All statuses</option>{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select></div>
            )}
          </div>
          {error ? <div className="py-10 text-center space-y-3"><p className="text-sm text-danger">{error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>
            : <DataTable loading={loading} rows={rows} columns={columns}
                emptyMessage={q || status ? "No coupons match." : inTrash ? "Trash is empty." : "No coupons yet. Add your first one."}
                pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }} />}
        </div>
      </Card>
      <CouponDrawer open={drawer.open} coupon={drawer.coupon} onClose={() => setDrawer({ open: false, coupon: null })}
        onSaved={(text) => { setDrawer({ open: false, coupon: null }); flash("ok", text); reload(); }} />
      <ConfirmDialog open={Boolean(del)} danger title={`Delete ${del?.code || "coupon"}?`}
        message="It stops working at once and moves to Trash. You can restore it later; orders that already used it are not affected." confirmLabel="Delete"
        onClose={() => setDel(null)} onConfirm={async () => { await couponsApi.remove(del.id); flash("ok", `${del.code} moved to Trash.`); reload(); }} />
    </div>
  );
}
