import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import ConfirmDialog from "../components/ConfirmDialog";
import { Check, Field, Input, Textarea } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";
import { cmsApi } from "../../src/services";
import { STATUS_TONE } from "../../src/services/mappers/cms";

// One CMS section (banners / faqs / announcements), driven by its config in src/services/mappers/cms.js.
export default function CmsResource({ section }) {
  const { can } = useAuth();
  const api = useMemo(() => cmsApi(section.key), [section.key]);
  const m = section.module;
  const { data, loading, error, reload } = useApi(() => api.list(), [section.key]);
  const rows = (data?.items || []).map(section.toRow);
  const [drawer, setDrawer] = useState({ open: false, item: null });
  const [form, setForm] = useState(section.emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const [notice, setNotice] = useState(null);
  const flash = (type, text) => { setNotice({ type, text }); setTimeout(() => setNotice(null), 4000); };
  const act = async (fn, okText) => { try { await fn(); flash("ok", okText); reload(); } catch (e) { flash("error", e.message); } };

  const open = (item) => { setForm(item ? section.toForm(item) : section.emptyForm); setErrors({}); setFormError(""); setDrawer({ open: true, item }); };
  const close = () => setDrawer({ open: false, item: null });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setErrors({}); setFormError(""); setBusy(true);
    try {
      const body = section.toPayload(form);
      drawer.item ? await api.update(drawer.item.id, body) : await api.create(body);
      close(); flash("ok", drawer.item ? "Saved." : "Added."); reload();
    } catch (err) {
      const fe = {}; (err.details || []).forEach((d) => { fe[d.path] = d.message; });
      setErrors(fe); setFormError(err.code === "VALIDATION_ERROR" ? "Please fix the highlighted fields." : err.message);
    } finally { setBusy(false); }
  };

  const columns = [
    ...section.columns,
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} tone={STATUS_TONE[r.status]} /> },
    { key: "a", header: "", align: "right", render: (r) => (
      <div className="flex justify-end gap-1">
        {can(`${m}.edit`) && <button onClick={() => act(() => api.setActive(r.id, !r.isActive), r.isActive ? "Switched off." : "Switched on.")} className="p-1.5 rounded-sm text-ink-muted hover:bg-bg hover:text-ink" aria-label={r.isActive ? "Turn off" : "Turn on"} title={r.isActive ? "Turn off" : "Turn on"}><Power className="w-4 h-4" /></button>}
        {can(`${m}.edit`) && <button onClick={() => open(r.raw)} className="p-1.5 rounded-sm text-ink-muted hover:bg-bg hover:text-ink" aria-label="Edit"><Pencil className="w-4 h-4" /></button>}
        {can(`${m}.delete`) && <button onClick={() => setDel(r)} className="p-1.5 rounded-sm text-ink-muted hover:bg-danger-soft hover:text-danger" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>}
      </div>
    ) },
  ];

  const renderField = (f) => {
    const common = { value: form[f.key], error: !!errors[f.key], maxLength: f.maxLength };
    if (f.type === "check") return <Check key={f.key} label={f.label} checked={!!form[f.key]} onChange={(on) => set(f.key, on)} />;
    return (
      <div key={f.key} className={f.half ? "" : "col-span-2"}>
        <Field label={f.label} error={errors[f.key]} hint={f.hint}>
          {f.type === "textarea" ? <Textarea rows={5} {...common} onChange={(e) => set(f.key, e.target.value)} />
            : <Input type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"} min={f.type === "number" ? "0" : undefined} {...common} onChange={(e) => set(f.key, e.target.value)} />}
        </Field>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-muted">{section.help}</p>
        {can(`${m}.create`) && <Button icon={Plus} onClick={() => open(null)}>{section.addLabel}</Button>}
      </div>
      {notice && <p role="status" className={`text-sm rounded-sm px-3 py-2 ${notice.type === "ok" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{notice.text}</p>}
      <Card padded={false}>
        <div className="p-5">
          {error ? <div className="py-10 text-center space-y-3"><p className="text-sm text-danger">{error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>
            : <DataTable loading={loading} rows={rows} columns={columns} emptyMessage={section.emptyMessage} />}
        </div>
      </Card>
      <Drawer open={drawer.open} onClose={close} title={drawer.item ? `Edit ${section.singular}` : section.addLabel}
        footer={<><Button variant="secondary" type="button" onClick={close}>Cancel</Button><Button type="submit" form={`cms-form-${section.key}`} disabled={busy}>{busy ? "Saving…" : "Save"}</Button></>}>
        <form id={`cms-form-${section.key}`} onSubmit={submit} className="space-y-4">
          {formError && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{formError}</p>}
          <div className="grid grid-cols-2 gap-3">{section.fields.filter((f) => f.type !== "check").map(renderField)}</div>
          {section.fields.filter((f) => f.type === "check").map(renderField)}
        </form>
      </Drawer>
      <ConfirmDialog open={Boolean(del)} danger title={`Delete this ${section.singular}?`}
        message={section.key === "banners" ? "It disappears from the shop at once." : "It is removed for good."} confirmLabel="Delete"
        onClose={() => setDel(null)} onConfirm={async () => { await api.remove(del.id); flash("ok", "Deleted."); reload(); }} />
    </div>
  );
}
