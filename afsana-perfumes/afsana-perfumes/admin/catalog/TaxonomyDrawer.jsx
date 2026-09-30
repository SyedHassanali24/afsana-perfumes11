import { useEffect, useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import { Check, Field, Input, Select, Textarea } from "../components/FormFields";
import { taxonomyApi } from "../../src/services";

const EMPTY = { name: "", slug: "", description: "", imageUrl: "", sortOrder: "0", isActive: true, seoTitle: "", seoDescription: "", parentId: "" };

/** item = existing entry or null. `parents` = top-level categories (only used when type === 'categories'). */
export default function TaxonomyDrawer({ open, type, noun, item, parents, onClose, onSaved }) {
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({}); setError("");
    setV(item ? { name: item.name, slug: item.slug, description: item.description || "", imageUrl: item.image?.url || "", sortOrder: String(item.sortOrder ?? 0), isActive: item.isActive, seoTitle: item.seo?.title || "", seoDescription: item.seo?.description || "", parentId: item.parentId || "" } : EMPTY);
  }, [open, item]);
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setError(""); setErrors({});
    if (v.name.trim().length < 2) return setErrors({ name: "Name is required." });
    const body = {
      name: v.name.trim(), description: v.description.trim(), isActive: v.isActive, sortOrder: Number(v.sortOrder) || 0,
      image: { url: v.imageUrl.trim() }, seo: { title: v.seoTitle.trim(), description: v.seoDescription.trim() },
      ...(v.slug.trim() ? { slug: v.slug.trim() } : {}), ...(type === "categories" ? { parentId: v.parentId || null } : {}),
    };
    setBusy(true);
    try { item ? await taxonomyApi(type).update(item.id, body) : await taxonomyApi(type).create(body); onSaved(); }
    catch (err) { const fe = {}; (err.details || []).forEach((d) => { fe[d.path.split(".")[0]] = d.message; }); setErrors(fe); setError(err.code === "VALIDATION_ERROR" ? "Please fix the highlighted fields." : err.message); }
    finally { setBusy(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} title={item ? `Edit ${noun}` : `Add ${noun}`}
      footer={<><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button type="submit" form="taxonomy-form" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></>}>
      <form id="taxonomy-form" onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{error}</p>}
        <Field label="Name" error={errors.name}><Input value={v.name} error={!!errors.name} onChange={set("name")} /></Field>
        <Field label="URL name (slug)" error={errors.slug} hint={item ? "Changing this changes the page address" : "Leave blank to create it from the name"}><Input value={v.slug} error={!!errors.slug} onChange={set("slug")} placeholder="e.g. oud-collection" /></Field>
        {type === "categories" && (
          <Field label="Parent category" hint="Optional. Categories go one level deep.">
            <Select value={v.parentId} onChange={set("parentId")}>
              <option value="">None (top level)</option>
              {parents.filter((p) => p.id !== item?.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Description"><Textarea rows={3} value={v.description} onChange={set("description")} /></Field>
        <Field label="Image URL" error={errors.image} hint="Link to the hosted image"><Input value={v.imageUrl} error={!!errors.image} onChange={set("imageUrl")} placeholder="https://…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sort order" hint="Lower shows first"><Input type="number" min="0" value={v.sortOrder} onChange={set("sortOrder")} /></Field>
        </div>
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-sm text-ink">Search engine details</p>
          <Field label="Title"><Input value={v.seoTitle} onChange={set("seoTitle")} /></Field>
          <Field label="Description"><Textarea rows={2} value={v.seoDescription} onChange={set("seoDescription")} /></Field>
        </div>
        <Check label="Active (visible in the store)" checked={v.isActive} onChange={(on) => setV((x) => ({ ...x, isActive: on }))} />
      </form>
    </Drawer>
  );
}
