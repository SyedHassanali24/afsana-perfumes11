import { useEffect, useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";
import { Check, Field, Input, Select } from "../components/FormFields";
import { staffApi } from "../../src/services";
import { useAuth } from "../../src/auth/AuthContext";
import { DAYS, FIELD_LABELS } from "../../src/auth/fieldLabels";

const EMPTY = { name: "", email: "", roleId: "", status: "Active", password: "", deniedFields: [], wh: { enabled: false, days: [1, 2, 3, 4, 5, 6], start: "09:00", end: "18:00", timezone: "Asia/Karachi" } };

/** staffId = edit, null = create. Calls onSaved(result) where result.tempPassword is set when one was generated. */
export default function StaffFormDrawer({ open, staffId, roles, restrictableFields, onClose, onSaved }) {
  const { user } = useAuth();
  const isEdit = Boolean(staffId);
  const [v, setV] = useState(EMPTY);
  const [meta, setMeta] = useState({ locked: false, reason: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(""); setErrors({}); setAsk(false); setMeta({ locked: false, reason: "" });
    if (!staffId) { setV({ ...EMPTY, roleId: roles[0]?.id || "" }); return; }
    let live = true; setLoading(true);
    staffApi.get(staffId).then(({ staff: s }) => {
      if (!live) return;
      const self = String(s.userId) === String(user?.id);
      setMeta(s.role?.isUnrestricted ? { locked: true, reason: "The Owner account can't be changed here." } : self ? { locked: true, reason: "You can't change your own role or access. Ask another admin." } : { locked: false, reason: "" });
      setV({ ...EMPTY, name: s.name, email: s.email, roleId: s.role?.id || "", status: s.status, deniedFields: s.deniedFields || [], wh: { ...EMPTY.wh, ...(s.workingHours || {}), days: s.workingHours?.days?.length ? s.workingHours.days : EMPTY.wh.days } });
    }).catch((e) => live && setError(e.message)).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [open, staffId, roles, user]);

  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const setWh = (k, val) => setV((x) => ({ ...x, wh: { ...x.wh, [k]: val } }));
  const toggle = (arr, item, on) => (on ? [...arr, item] : arr.filter((y) => y !== item));
  const accessLocked = meta.locked;

  const submit = (e) => {
    e.preventDefault(); setError("");
    const er = {};
    if (v.name.trim().length < 2) er.name = "Name is required.";
    if (!isEdit && !/^\S+@\S+\.\S+$/.test(v.email)) er.email = "Enter a valid email.";
    if (!isEdit && !v.roleId) er.roleId = "Choose a role.";
    if (!isEdit && v.password && (v.password.length < 10 || !/[A-Za-z]/.test(v.password) || !/\d/.test(v.password))) er.password = "At least 10 characters with letters and numbers, or leave blank.";
    if (v.wh.enabled && (!v.wh.days.length || !v.wh.start || !v.wh.end)) er.wh = "Choose days and hours.";
    setErrors(er);
    if (!Object.keys(er).length) setAsk(true);
  };

  const save = async (pw) => {
    try {
      let result;
      if (isEdit) {
        const body = { name: v.name.trim(), confirmPassword: pw };
        if (!accessLocked) Object.assign(body, { roleId: v.roleId, status: v.status, deniedFields: v.deniedFields, workingHours: v.wh.enabled ? v.wh : { enabled: false } });
        result = await staffApi.update(staffId, body);
      } else {
        result = await staffApi.create({ name: v.name.trim(), email: v.email.trim(), roleId: v.roleId, ...(v.password ? { password: v.password } : {}), deniedFields: v.deniedFields, ...(v.wh.enabled ? { workingHours: v.wh } : {}), confirmPassword: pw });
      }
      onSaved(result);
    } catch (err) {
      if (err.code === "REAUTH_FAILED" || err.code === "REAUTH_REQUIRED") throw err;
      setAsk(false);
      const fe = {}; (err.details || []).forEach((d) => { fe[d.path.split(".")[0]] = d.message; });
      setErrors(fe); setError(err.code === "VALIDATION_ERROR" ? "Please fix the highlighted fields." : err.message);
      throw err;
    }
  };

  return (
    <>
      <Drawer open={open} onClose={onClose} title={isEdit ? "Edit staff member" : "Add staff member"}
        footer={<><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button type="submit" form="staff-form" disabled={loading}>{isEdit ? "Save changes" : "Add staff"}</Button></>}>
        {loading ? <p className="text-sm text-ink-muted">Loading…</p> : (
          <form id="staff-form" onSubmit={submit} className="space-y-4">
            {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{error}</p>}
            {meta.reason && <p className="text-sm text-ink-muted bg-bg rounded-sm px-3 py-2">{meta.reason}</p>}
            <Field label="Full name" error={errors.name}><Input value={v.name} error={!!errors.name} onChange={set("name")} /></Field>
            <Field label="Email" error={errors.email} hint={isEdit ? "Email can't be changed" : "Used to sign in"}><Input type="email" value={v.email} disabled={isEdit} error={!!errors.email} onChange={set("email")} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role" error={errors.roleId}>
                <Select value={v.roleId} disabled={accessLocked} error={!!errors.roleId} onChange={set("roleId")}>
                  <option value="" disabled>Select…</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  {isEdit && !roles.some((r) => r.id === v.roleId) && <option value={v.roleId}>Current role</option>}
                </Select>
              </Field>
              {isEdit && <Field label="Status"><Select value={v.status} disabled={accessLocked} onChange={set("status")}><option>Active</option><option>Suspended</option><option>Disabled</option></Select></Field>}
            </div>
            {!isEdit && (
              <Field label="Password" error={errors.password} hint="Leave blank to generate a one-time password. They must change it at first sign-in.">
                <Input type="text" autoComplete="off" value={v.password} error={!!errors.password} onChange={set("password")} />
              </Field>
            )}
            <div className="border-t border-border pt-4 space-y-3">
              <Check label="Only allow access during working hours" disabled={accessLocked} checked={v.wh.enabled} onChange={(on) => setWh("enabled", on)} />
              {v.wh.enabled && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">{DAYS.map((d, i) => <Check key={d} label={d} disabled={accessLocked} checked={v.wh.days.includes(i)} onChange={(on) => setWh("days", toggle(v.wh.days, i, on))} />)}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="From"><Input type="time" value={v.wh.start} disabled={accessLocked} onChange={(e) => setWh("start", e.target.value)} /></Field>
                    <Field label="To" error={errors.wh}><Input type="time" value={v.wh.end} disabled={accessLocked} onChange={(e) => setWh("end", e.target.value)} /></Field>
                  </div>
                  <p className="text-xs text-ink-muted">Pakistan time. Signed-in sessions are blocked outside these hours.</p>
                </div>
              )}
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-sm text-ink mb-2">Hide these details from this person</p>
              <div className="grid grid-cols-2 gap-2">
                {(restrictableFields || Object.keys(FIELD_LABELS)).map((f) => <Check key={f} label={FIELD_LABELS[f] || f} disabled={accessLocked} checked={v.deniedFields.includes(f)} onChange={(on) => setV((x) => ({ ...x, deniedFields: toggle(x.deniedFields, f, on) }))} />)}
              </div>
            </div>
          </form>
        )}
      </Drawer>
      <ConfirmPasswordModal open={ask} title={isEdit ? "Confirm changes" : "Confirm new staff member"} message="Enter your password to continue." confirmLabel={isEdit ? "Save" : "Add staff"} onClose={() => setAsk(false)} onConfirm={save} />
    </>
  );
}
