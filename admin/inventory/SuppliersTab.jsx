import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import ConfirmDialog from "../components/ConfirmDialog";
import { Check, Field, Input, Select, Textarea } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { suppliersApi } from "../../src/services";

const EMPTY = { name: "", contactPerson: "", phone: "", email: "", address: "", paymentTerms: "", notes: "", isActive: true };

function SupplierDrawer({ open, supplier, onClose, onSaved }) {
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setV(supplier ? { ...EMPTY, ...Object.fromEntries(Object.entries(supplier).filter(([k]) => k in EMPTY).map(([k, x]) => [k, x ?? EMPTY[k]])) } : EMPTY); setErrors({}); setError(""); } }, [open, supplier]);
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setError(""); setErrors({});
    if (v.name.trim().length < 2) return setErrors({ name: "Supplier name is required." });
    setBusy(true);
    try { supplier ? await suppliersApi.update(supplier.id, v) : await suppliersApi.create(v); onSaved(); }
    catch (err) { const fe = {}; (err.details || []).forEach((d) => { fe[d.path] = d.message; }); setErrors(fe); setError(err.code === "VALIDATION_ERROR" ? "Please fix the highlighted fields." : err.message); }
    finally { setBusy(false); }
  };
  return (
    <Drawer open={open} onClose={onClose} title={supplier ? "Edit supplier" : "Add supplier"}
      footer={<><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button type="submit" form="supplier-form" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></>}>
      <form id="supplier-form" onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{error}</p>}
        <Field label="Supplier name" error={errors.name}><Input value={v.name} error={!!errors.name} onChange={set("name")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact person"><Input value={v.contactPerson} onChange={set("contactPerson")} /></Field>
          <Field label="Phone" error={errors.phone}><Input value={v.phone} onChange={set("phone")} /></Field>
        </div>
        <Field label="Email" error={errors.email}><Input type="email" value={v.email} error={!!errors.email} onChange={set("email")} /></Field>
        <Field label="Address"><Input value={v.address} onChange={set("address")} /></Field>
        <Field label="Payment terms" hint="e.g. 50% advance, balance on delivery"><Input value={v.paymentTerms} onChange={set("paymentTerms")} /></Field>
        <Field label="Notes"><Textarea rows={3} value={v.notes} onChange={set("notes")} /></Field>
        <Check label="Active (can be chosen on new purchase orders)" checked={v.isActive} onChange={(on) => setV((x) => ({ ...x, isActive: on }))} />
      </form>
    </Drawer>
  );
}

export default function SuppliersTab() {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState({ open: false, supplier: null });
  const [del, setDel] = useState(null);
  const [notice, setNotice] = useState("");
  const q = useDebounce(search);
  const { data, loading, error, reload } = useApi(() => suppliersApi.list({ q, page, limit: 20 }), [q, page]);
  const pg = data?.pagination;
  const flash = (t) => { setNotice(t); setTimeout(() => setNotice(""), 4000); };

  const columns = [
    { key: "name", header: "Supplier" },
    { key: "contactPerson", header: "Contact", render: (r) => r.contactPerson || "—" },
    { key: "phone", header: "Phone", render: (r) => r.phone || "—" },
    { key: "paymentTerms", header: "Payment terms", render: (r) => r.paymentTerms || "—" },
    { key: "isActive", header: "Status", render: (r) => <StatusPill status={r.isActive ? "Active" : "Inactive"} /> },
    { key: "a", header: "", align: "right", render: (r) => (
      <div className="flex justify-end gap-1">
        {can("suppliers.edit") && <button onClick={() => setDrawer({ open: true, supplier: r })} className="p-1.5 rounded-sm text-ink-muted hover:bg-bg hover:text-ink" aria-label={`Edit ${r.name}`}><Pencil className="w-4 h-4" /></button>}
        {can("suppliers.delete") && <button onClick={() => setDel(r)} className="p-1.5 rounded-sm text-ink-muted hover:bg-danger-soft hover:text-danger" aria-label={`Delete ${r.name}`}><Trash2 className="w-4 h-4" /></button>}
      </div>
    ) },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="w-72"><Input placeholder="Search suppliers…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        {can("suppliers.create") && <Button icon={Plus} onClick={() => setDrawer({ open: true, supplier: null })}>Add supplier</Button>}
      </div>
      {notice && <p role="status" className="text-sm rounded-sm px-3 py-2 bg-success-soft text-success">{notice}</p>}
      <Card padded={false}><div className="p-5">
        {error ? <div className="py-10 text-center space-y-3"><p className="text-sm text-danger">{error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>
          : <DataTable loading={loading} rows={data?.suppliers || []} columns={columns} emptyMessage={q ? "No suppliers match." : "No suppliers yet."} pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }} />}
      </div></Card>
      <SupplierDrawer open={drawer.open} supplier={drawer.supplier} onClose={() => setDrawer({ open: false, supplier: null })} onSaved={() => { setDrawer({ open: false, supplier: null }); flash("Supplier saved."); reload(); }} />
      <ConfirmDialog open={Boolean(del)} danger title={`Delete ${del?.name || "supplier"}?`} message="Suppliers with open purchase orders can't be deleted." confirmLabel="Delete" onClose={() => setDel(null)}
        onConfirm={async () => { await suppliersApi.remove(del.id); flash("Supplier deleted."); reload(); }} />
    </div>
  );
}
