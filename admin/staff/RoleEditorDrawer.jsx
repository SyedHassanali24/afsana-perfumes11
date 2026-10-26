import { useEffect, useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";
import { Check, Field, Input, Textarea } from "../components/FormFields";
import PermissionMatrix from "./PermissionMatrix";
import { rolesApi } from "../../src/services";
import { FIELD_LABELS } from "../../src/auth/fieldLabels";

const EMPTY = { name: "", description: "", level: 30, grants: [], deniedFields: [] };

/** role = existing role object (from the list) or null to create. */
export default function RoleEditorDrawer({ open, role, catalog, onClose, onSaved }) {
  const isEdit = Boolean(role);
  const [v, setV] = useState(EMPTY);
  const [error, setError] = useState("");
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(""); setAsk(false);
    setV(role ? { name: role.name, description: role.description || "", level: role.level, grants: role.grants.map((g) => ({ module: g.module, actions: [...g.actions], scope: { kind: g.scope?.kind || "all", values: g.scope?.values || [] } })), deniedFields: [...role.deniedFields] } : EMPTY);
  }, [open, role]);

  const locked = isEdit && !role.editable;
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault(); setError("");
    if (v.name.trim().length < 2) return setError("Give the role a name.");
    if (!(v.level >= 1 && v.level <= 99)) return setError("Level must be between 1 and 99.");
    setAsk(true);
  };
  const save = async (pw) => {
    const body = { description: v.description, grants: v.grants, deniedFields: v.deniedFields, confirmPassword: pw };
    if (!(isEdit && role.isSystem)) { body.name = v.name.trim(); body.level = Number(v.level); }
    try { isEdit ? await rolesApi.update(role.id, body) : await rolesApi.create(body); }
    catch (err) { if (err.code === "REAUTH_FAILED" || err.code === "REAUTH_REQUIRED") throw err; setAsk(false); setError(err.details?.[0] ? `${err.details[0].path}: ${err.details[0].message}` : err.message); throw err; }
    onSaved();
  };
  const toggleField = (f, on) => setV((x) => ({ ...x, deniedFields: on ? [...x.deniedFields, f] : x.deniedFields.filter((y) => y !== f) }));

  return (
    <>
      <Drawer open={open} onClose={onClose} size="xl" title={isEdit ? `Role: ${role.name}` : "New role"}
        footer={<><Button variant="secondary" type="button" onClick={onClose}>Close</Button>{!locked && <Button type="submit" form="role-form">{isEdit ? "Save role" : "Create role"}</Button>}</>}>
        <form id="role-form" onSubmit={submit} className="space-y-5">
          {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{error}</p>}
          {isEdit && role.isUnrestricted && <p className="text-sm text-ink-muted bg-bg rounded-sm px-3 py-2">The Owner role has unrestricted access and can't be edited.</p>}
          {locked && !role.isUnrestricted && <p className="text-sm text-ink-muted bg-bg rounded-sm px-3 py-2">You can't edit this role: it is your own role or at/above your level.</p>}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Field label="Role name"><Input value={v.name} disabled={locked || role?.isSystem} onChange={set("name")} placeholder="e.g. Order packer" /></Field></div>
            <Field label="Level" hint="Higher can manage lower"><Input type="number" min="1" max="99" value={v.level} disabled={locked || role?.isSystem} onChange={(e) => setV((x) => ({ ...x, level: e.target.value === "" ? "" : Number(e.target.value) }))} /></Field>
          </div>
          <Field label="Description"><Textarea rows={2} value={v.description} disabled={locked} onChange={set("description")} /></Field>
          <div>
            <p className="text-sm text-ink mb-2">Permissions <span className="text-ink-muted">(outlined boxes are high-risk and always ask for a password)</span></p>
            {catalog ? <PermissionMatrix catalog={catalog} grants={v.grants} readOnly={locked} onChange={(grants) => setV((x) => ({ ...x, grants }))} /> : <p className="text-sm text-ink-muted">Loading permissions…</p>}
          </div>
          <div>
            <p className="text-sm text-ink mb-2">Hide these details from this role</p>
            <div className="grid grid-cols-2 gap-2">
              {(catalog?.restrictableFields || []).map((f) => <Check key={f} label={FIELD_LABELS[f] || f} disabled={locked} checked={v.deniedFields.includes(f)} onChange={(on) => toggleField(f, on)} />)}
            </div>
          </div>
        </form>
      </Drawer>
      <ConfirmPasswordModal open={ask} title="Confirm role change" message="Changing a role affects everyone who has it, starting immediately." confirmLabel={isEdit ? "Save role" : "Create role"} onClose={() => setAsk(false)} onConfirm={save} />
    </>
  );
}
