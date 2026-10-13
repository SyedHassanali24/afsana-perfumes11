import { useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import StatusPill from "../components/StatusPill";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";
import { Check, Field, Input, Select } from "../components/FormFields";
import { staffApi } from "../../src/services";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";
import { human } from "../../src/auth/fieldLabels";

const when = (d) => (d ? new Date(d).toLocaleString() : "—");
const EMPTY_OV = { effect: "allow", module: "", actions: [], startsAt: "", expiresAt: "", reason: "" };

export default function StaffDetailDrawer({ staffId, version = 0, catalog, onClose, onEdit, onChanged, onTempPassword }) {
  const { can, user } = useAuth();
  const { data, loading, error, reload } = useApi(() => (staffId ? staffApi.get(staffId) : Promise.resolve(null)), [staffId, version]);
  const sess = useApi(() => (staffId && can("sessions.view") ? staffApi.sessions(staffId) : Promise.resolve({ sessions: [] })), [staffId, version]);
  const [confirm, setConfirm] = useState(null); // { title, message, danger, confirmLabel, run(pw) }
  const [ov, setOv] = useState(EMPTY_OV);
  const [ovError, setOvError] = useState("");
  const s = data?.staff;

  const self = s && String(s.userId) === String(user?.id);
  const protectedAcct = s && (s.role?.isUnrestricted || self);
  const after = async () => { reload(); sess.reload(); onChanged(); };

  const ask = (cfg) => setConfirm(cfg);
  const toggleStatus = () => ask({
    title: s.status === "Active" ? `Suspend ${s.name}?` : `Reactivate ${s.name}?`,
    message: s.status === "Active" ? "They will be signed out everywhere and can't sign in until reactivated." : "They will be able to sign in again.",
    confirmLabel: s.status === "Active" ? "Suspend" : "Reactivate", danger: s.status === "Active",
    run: async (pw) => { await staffApi.update(s.id, { status: s.status === "Active" ? "Suspended" : "Active", confirmPassword: pw }); await after(); },
  });
  const resetPw = () => ask({
    title: `Reset password for ${s.name}?`, message: "A new temporary password will be generated. They are signed out everywhere and must choose a new password at next sign-in.", confirmLabel: "Reset password",
    run: async (pw) => { const r = await staffApi.resetPassword(s.id, pw); await after(); if (r.tempPassword) onTempPassword({ email: s.email, password: r.tempPassword }); },
  });
  const remove = () => ask({
    title: `Delete ${s.name}?`, message: "They lose access immediately. The account is disabled and hidden, and its history is kept.", confirmLabel: "Delete", danger: true,
    run: async (pw) => { await staffApi.remove(s.id, pw); onChanged(); onClose(); },
  });
  const revokeAll = () => ask({
    title: "Sign out all devices?", message: `${s.name} will need to sign in again everywhere.`, confirmLabel: "Sign out all",
    run: async (pw) => { await staffApi.revokeSessions(s.id, pw); sess.reload(); },
  });
  const removeOv = (o) => ask({
    title: "Remove this access rule?", message: "It stops applying immediately.", confirmLabel: "Remove", danger: true,
    run: async (pw) => { await staffApi.removeOverride(s.id, o.id, pw); await after(); },
  });

  const submitOverride = (e) => {
    e.preventDefault(); setOvError("");
    if (!ov.module) return setOvError("Choose a module.");
    if (!ov.actions.length) return setOvError("Choose at least one action.");
    if (ov.reason.trim().length < 3) return setOvError("Add a short reason (it goes in the audit log).");
    if (ov.effect === "allow" && !ov.expiresAt) return setOvError("Temporary access needs an expiry date and time.");
    ask({
      title: ov.effect === "allow" ? "Grant temporary access?" : "Block access?", message: "This is recorded in the audit log.", confirmLabel: "Confirm",
      run: async (pw) => {
        try {
          await staffApi.addOverride(s.id, { effect: ov.effect, module: ov.module, actions: ov.actions, reason: ov.reason.trim(), ...(ov.startsAt ? { startsAt: new Date(ov.startsAt).toISOString() } : {}), ...(ov.expiresAt ? { expiresAt: new Date(ov.expiresAt).toISOString() } : {}), confirmPassword: pw });
        } catch (err) { if (err.code !== "REAUTH_FAILED" && err.code !== "REAUTH_REQUIRED") setOvError(err.details?.[0]?.message || err.message); throw err; }
        setOv(EMPTY_OV); await after();
      },
    });
  };

  const modules = catalog ? catalog.groups.flatMap((g) => g.modules) : [];
  const toggleAction = (a, on) => setOv((x) => ({ ...x, actions: on ? [...x.actions, a] : x.actions.filter((y) => y !== a) }));

  return (
    <>
      <Drawer open={Boolean(staffId)} onClose={onClose} size="lg" title={s ? s.name : "Staff member"}>
        {loading && <p className="text-sm text-ink-muted">Loading…</p>}
        {error && <p className="text-sm text-danger">{error.message}</p>}
        {s && (
          <div className="space-y-7">
            <section className="space-y-2">
              <div className="flex items-center gap-3"><StatusPill status={s.status} /><span className="text-sm text-ink">{s.role?.name}</span>{s.mustChangePassword && <span className="text-xs text-warning">Hasn't set own password yet</span>}</div>
              <p className="text-sm text-ink-muted">{s.email} · last sign-in {when(s.lastLoginAt)}</p>
              {s.workingHours?.enabled && <p className="text-sm text-ink-muted">Working hours {s.workingHours.start}–{s.workingHours.end}</p>}
              <div className="flex flex-wrap gap-2 pt-2">
                {can("staff.edit") && <Button variant="secondary" size="sm" onClick={() => onEdit(s.id)}>Edit</Button>}
                {can("staff.edit") && !protectedAcct && <Button variant="secondary" size="sm" onClick={toggleStatus}>{s.status === "Active" ? "Suspend" : "Reactivate"}</Button>}
                {can("staff.edit") && !protectedAcct && <Button variant="secondary" size="sm" onClick={resetPw}>Reset password</Button>}
                {can("staff.delete") && !protectedAcct && <Button variant="danger" size="sm" onClick={remove}>Delete</Button>}
              </div>
              {protectedAcct && <p className="text-xs text-ink-muted">{self ? "This is your own account. Manage it from My account." : "The Owner account is protected."}</p>}
            </section>

            <section className="space-y-3">
              <h3 className="font-display text-base text-ink">Temporary access &amp; blocks</h3>
              {s.overrides.length === 0 && <p className="text-sm text-ink-muted">None. This person has exactly what their role gives them.</p>}
              <ul className="divide-y divide-border">
                {s.overrides.map((o) => (
                  <li key={o.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="text-sm">
                      <p className="text-ink"><span className={o.effect === "allow" ? "text-success" : "text-danger"}>{o.effect === "allow" ? "Allowed" : "Blocked"}</span> · {human(o.grant.module)}: {o.grant.actions.map(human).join(", ")}</p>
                      <p className="text-xs text-ink-muted">{o.startsAt ? `from ${when(o.startsAt)} ` : ""}{o.expiresAt ? `until ${when(o.expiresAt)}` : "no expiry"}{o.active ? "" : " · not active"} · {o.reason}</p>
                    </div>
                    {can("temporaryAccess.delete") && !protectedAcct && <Button variant="ghost" size="sm" onClick={() => removeOv(o)}>Remove</Button>}
                  </li>
                ))}
              </ul>
              {can("temporaryAccess.create") && !protectedAcct && (
                <form onSubmit={submitOverride} className="space-y-3 border border-border rounded-sm p-3">
                  <p className="text-sm text-ink">Add a rule</p>
                  {ovError && <p role="alert" className="text-sm text-danger">{ovError}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Type"><Select value={ov.effect} onChange={(e) => setOv({ ...ov, effect: e.target.value })}><option value="allow">Grant temporary access</option><option value="deny">Block access</option></Select></Field>
                    <Field label="Module"><Select value={ov.module} onChange={(e) => setOv({ ...ov, module: e.target.value })}><option value="">Select…</option>{modules.map((m) => <option key={m} value={m}>{human(m)}</option>)}</Select></Field>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {(catalog?.actions || []).map((a) => <Check key={a} label={human(a)} checked={ov.actions.includes(a)} disabled={ov.effect === "allow" && ov.module && !can(`${ov.module}.${a}`)} title={ov.effect === "allow" && ov.module && !can(`${ov.module}.${a}`) ? "You don't have this access yourself" : undefined} onChange={(on) => toggleAction(a, on)} />)}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Starts" hint="Optional"><Input type="datetime-local" value={ov.startsAt} onChange={(e) => setOv({ ...ov, startsAt: e.target.value })} /></Field>
                    <Field label={ov.effect === "allow" ? "Expires (required)" : "Expires"} hint={ov.effect === "allow" ? "Up to 90 days" : "Blank = until removed"}><Input type="datetime-local" value={ov.expiresAt} onChange={(e) => setOv({ ...ov, expiresAt: e.target.value })} /></Field>
                  </div>
                  <Field label="Reason"><Input value={ov.reason} onChange={(e) => setOv({ ...ov, reason: e.target.value })} placeholder="e.g. Covering stock count this week" /></Field>
                  <Button type="submit" size="sm">Add rule</Button>
                </form>
              )}
            </section>

            {can("sessions.view") && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base text-ink">Signed-in devices</h3>
                  {can("sessions.delete") && !protectedAcct && (sess.data?.sessions || []).length > 0 && <Button variant="secondary" size="sm" onClick={revokeAll}>Sign out all</Button>}
                </div>
                {(sess.data?.sessions || []).length === 0 ? <p className="text-sm text-ink-muted">Not signed in anywhere.</p> : (
                  <ul className="divide-y divide-border">{sess.data.sessions.map((x) => (
                    <li key={x.id} className="py-2 text-sm"><p className="text-ink truncate">{x.device?.userAgent || "Unknown device"}</p><p className="text-xs text-ink-muted">{x.device?.ip || "—"} · last active {when(x.lastActiveAt)}</p></li>
                  ))}</ul>
                )}
              </section>
            )}
          </div>
        )}
      </Drawer>
      <ConfirmPasswordModal open={Boolean(confirm)} title={confirm?.title} message={confirm?.message} danger={confirm?.danger} confirmLabel={confirm?.confirmLabel}
        onClose={() => setConfirm(null)} onConfirm={(pw) => confirm.run(pw)} />
    </>
  );
}
