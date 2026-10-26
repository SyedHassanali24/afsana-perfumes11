import { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";
import { Check, Field, Input, Textarea } from "../components/FormFields";
import { settingsApi } from "../../src/services";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";

// Route: /admin/settings (permission settings.view; saving needs settings.edit + the user's password).
const num = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));

function Section({ title, hint, children, canSave, dirty, error, onSave, saved }) {
  return (
    <Card>
      <div className="space-y-4">
        <div><h2 className="font-display text-lg text-ink">{title}</h2>{hint && <p className="text-sm text-ink-muted mt-0.5">{hint}</p>}</div>
        {children}
        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{error}</p>}
        {saved && !dirty && <p role="status" className="text-sm text-success">Saved.</p>}
        {canSave && <Button onClick={onSave} disabled={!dirty}>Save {title.toLowerCase()}</Button>}
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const { can } = useAuth();
  const { data, loading, error, reload } = useApi(() => settingsApi.get(), []);
  const [form, setForm] = useState(null);       // working copy of all four sections
  const [orig, setOrig] = useState(null);
  const [ask, setAsk] = useState(null);         // section key waiting for the password
  const [errs, setErrs] = useState({});
  const [saved, setSaved] = useState({});
  const canEdit = can("settings.edit");

  useEffect(() => { if (data?.settings) { setForm(structuredClone(data.settings)); setOrig(structuredClone(data.settings)); } }, [data]);
  if (loading && !form) return <p className="text-sm text-ink-muted">Loading…</p>;
  if (error) return <div className="space-y-3"><p className="text-sm text-danger">{error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>;
  if (!form) return null;

  const set = (sec, key) => (e) => { setForm((f) => ({ ...f, [sec]: { ...f[sec], [key]: e.target.value } })); setSaved((s) => ({ ...s, [sec]: false })); };
  const dirty = (sec) => JSON.stringify(form[sec]) !== JSON.stringify(orig[sec]);
  const payload = (sec) => {
    const v = form[sec];
    if (sec === "shipping") return { flatRate: num(v.flatRate), freeAbove: num(v.freeAbove) };
    if (sec === "returns") return { windowDays: num(v.windowDays) };
    return v;
  };
  const trySave = (sec) => {
    const p = payload(sec);
    if (sec === "shipping" && (Number.isNaN(p.flatRate) || Number.isNaN(p.freeAbove))) { setErrs({ [sec]: "Enter both amounts as whole numbers." }); return; }
    if (sec === "returns" && (Number.isNaN(p.windowDays) || p.windowDays < 1 || p.windowDays > 90)) { setErrs({ [sec]: "Return days must be between 1 and 90." }); return; }
    setErrs({}); setAsk(sec);
  };
  const doSave = async (password) => {
    try {
      const out = await settingsApi.save(ask, { ...payload(ask), confirmPassword: password });
      setForm((f) => ({ ...f, [ask]: out.value })); setOrig((o) => ({ ...o, [ask]: out.value })); setSaved((s) => ({ ...s, [ask]: true }));
    } catch (err) {
      if (err.code === "VALIDATION_ERROR" && err.details?.length) setErrs({ [ask]: err.details.map((d) => d.message).join(" ") });
      else throw err;                       // wrong password etc. is shown inside the password window
    }
  };
  const sec = (key, extra) => ({ canSave: canEdit, dirty: dirty(key), error: errs[key], saved: saved[key], onSave: () => trySave(key), ...extra });

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="font-display text-2xl text-ink">Settings</h1><p className="text-sm text-ink-muted mt-1">Your shop details, bank account for transfers, delivery fee and return days. Customers see these on the website.</p></div>
      {!canEdit && <p className="text-sm text-ink-muted bg-bg border border-border rounded-sm px-3 py-2">You can view settings but not change them.</p>}

      <Section title="Shop details" hint="Shown on the website footer, contact page and in messages." {...sec("store")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Shop name"><Input value={form.store.name} onChange={set("store", "name")} maxLength={80} disabled={!canEdit} /></Field>
          <Field label="Tagline"><Input value={form.store.tagline} onChange={set("store", "tagline")} maxLength={120} disabled={!canEdit} /></Field>
          <Field label="Phone"><Input value={form.store.phone} onChange={set("store", "phone")} maxLength={30} disabled={!canEdit} /></Field>
          <Field label="WhatsApp"><Input value={form.store.whatsapp} onChange={set("store", "whatsapp")} maxLength={30} disabled={!canEdit} /></Field>
          <Field label="Email"><Input type="email" value={form.store.email} onChange={set("store", "email")} maxLength={120} disabled={!canEdit} /></Field>
          <Field label="Instagram"><Input value={form.store.instagram} onChange={set("store", "instagram")} maxLength={200} disabled={!canEdit} /></Field>
          <Field label="Facebook"><Input value={form.store.facebook} onChange={set("store", "facebook")} maxLength={200} disabled={!canEdit} /></Field>
        </div>
        <Field label="Address"><Textarea rows={2} value={form.store.address} onChange={set("store", "address")} maxLength={250} disabled={!canEdit} /></Field>
      </Section>

      <Section title="Bank transfer" hint="Customers who choose bank transfer see these details right after they order." {...sec("bank")}>
        <Check label="Show these bank details to customers" checked={form.bank.enabled} onChange={(on) => { setForm((f) => ({ ...f, bank: { ...f.bank, enabled: on } })); setSaved((s) => ({ ...s, bank: false })); }} disabled={!canEdit} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Bank name"><Input value={form.bank.bankName} onChange={set("bank", "bankName")} maxLength={80} disabled={!canEdit} /></Field>
          <Field label="Account title"><Input value={form.bank.accountTitle} onChange={set("bank", "accountTitle")} maxLength={100} disabled={!canEdit} /></Field>
          <Field label="Account number"><Input value={form.bank.accountNumber} onChange={set("bank", "accountNumber")} maxLength={40} disabled={!canEdit} /></Field>
          <Field label="IBAN"><Input value={form.bank.iban} onChange={set("bank", "iban")} maxLength={40} disabled={!canEdit} /></Field>
          <Field label="Branch (optional)"><Input value={form.bank.branch} onChange={set("bank", "branch")} maxLength={100} disabled={!canEdit} /></Field>
        </div>
        <Field label="Instructions (optional)" hint="For example: send the payment screenshot on WhatsApp with your order number."><Textarea rows={2} value={form.bank.instructions} onChange={set("bank", "instructions")} maxLength={300} disabled={!canEdit} /></Field>
      </Section>

      <Section title="Delivery fee" hint="Applied to every order at checkout." {...sec("shipping")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Delivery fee (PKR)"><Input type="number" min="0" value={form.shipping.flatRate} onChange={set("shipping", "flatRate")} disabled={!canEdit} /></Field>
          <Field label="Free delivery on orders from (PKR)" hint="0 = free delivery on every order"><Input type="number" min="0" value={form.shipping.freeAbove} onChange={set("shipping", "freeAbove")} disabled={!canEdit} /></Field>
        </div>
      </Section>

      <Section title="Returns" hint="How many days after delivery a customer may ask for a return." {...sec("returns")}>
        <div className="max-w-xs"><Field label="Return period (days)"><Input type="number" min="1" max="90" value={form.returns.windowDays} onChange={set("returns", "windowDays")} disabled={!canEdit} /></Field></div>
      </Section>

      <ConfirmPasswordModal open={Boolean(ask)} title="Confirm change" message="Enter your password to save these settings. The change is recorded in the audit log." confirmLabel="Save" onClose={() => setAsk(null)} onConfirm={doSave} />
    </div>
  );
}
