import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import ConfirmDialog from "../components/ConfirmDialog";
import TaxonomyDrawer from "./TaxonomyDrawer";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { taxonomyApi } from "../../src/services";

/** One tab of the catalog setup screen. `module` is the permission module ('categories', 'brands', ...). */
export default function TaxonomyTab({ type, module, noun, plural }) {
  const { can } = useAuth();
  const api = taxonomyApi(type);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState({ open: false, item: null });
  const [del, setDel] = useState(null);
  const [notice, setNotice] = useState("");
  const q = useDebounce(search);
  const { data, loading, error, reload } = useApi(() => api.list({ q, page, limit: 25 }), [type, q, page]);
  // top-level categories for the "parent" dropdown
  const parents = useApi(() => (type === "categories" ? api.list({ limit: 100 }) : Promise.resolve({ items: [] })), [type]);
  const pg = data?.pagination;
  const items = data?.items || [];
  const nameOf = (id) => (parents.data?.items || []).find((p) => p.id === id)?.name;
  const flash = (t) => { setNotice(t); setTimeout(() => setNotice(""), 4000); };

  const columns = [
    { key: "name", header: "Name", render: (r) => <span>{r.parentId ? <span className="text-ink-muted">{nameOf(r.parentId) || "…"} › </span> : null}{r.name}</span> },
    { key: "slug", header: "URL name", render: (r) => <span className="text-ink-muted">{r.slug}</span> },
    { key: "productCount", header: "Products", align: "right" },
    { key: "sortOrder", header: "Order", align: "right" },
    { key: "isActive", header: "Status", render: (r) => <StatusPill status={r.isActive ? "Active" : "Inactive"} /> },
    { key: "a", header: "", align: "right", render: (r) => (
      <div className="flex justify-end gap-1">
        {can(`${module}.edit`) && <button onClick={() => setDrawer({ open: true, item: r })} className="p-1.5 rounded-sm text-ink-muted hover:bg-bg hover:text-ink" aria-label={`Edit ${r.name}`}><Pencil className="w-4 h-4" /></button>}
        {can(`${module}.delete`) && <button onClick={() => setDel(r)} className="p-1.5 rounded-sm text-ink-muted hover:bg-danger-soft hover:text-danger" aria-label={`Delete ${r.name}`}><Trash2 className="w-4 h-4" /></button>}
      </div>
    ) },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="w-72"><Input placeholder={`Search ${plural}…`} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        {can(`${module}.create`) && <Button icon={Plus} onClick={() => setDrawer({ open: true, item: null })}>Add {noun}</Button>}
      </div>
      {notice && <p role="status" className="text-sm rounded-sm px-3 py-2 bg-success-soft text-success">{notice}</p>}
      <Card padded={false}><div className="p-5">
        {error ? <div className="py-10 text-center space-y-3"><p className="text-sm text-danger">{error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>
          : <DataTable loading={loading} rows={items} columns={columns} emptyMessage={q ? `No ${plural} match.` : `No ${plural} yet.`} pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }} />}
      </div></Card>
      <TaxonomyDrawer open={drawer.open} type={type} noun={noun} item={drawer.item} parents={(parents.data?.items || []).filter((p) => !p.parentId)}
        onClose={() => setDrawer({ open: false, item: null })} onSaved={() => { setDrawer({ open: false, item: null }); flash(`${noun[0].toUpperCase()}${noun.slice(1)} saved.`); reload(); parents.reload(); }} />
      <ConfirmDialog open={Boolean(del)} danger title={`Delete ${del?.name || noun}?`} message={`${noun[0].toUpperCase()}${noun.slice(1)}s that products still use can't be deleted: mark them inactive instead.`} confirmLabel="Delete" onClose={() => setDel(null)}
        onConfirm={async () => { await api.remove(del.id); flash(`${noun[0].toUpperCase()}${noun.slice(1)} deleted.`); reload(); parents.reload(); }} />
    </div>
  );
}
