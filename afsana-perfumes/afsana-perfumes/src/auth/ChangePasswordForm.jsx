import { useState } from "react";
import Button from "../../admin/components/Button";
import { Field, Input } from "../../admin/components/FormFields";

/** `onSubmit(current, next)` should call the API and throw on failure. `min` = minimum length shown to the user. */
export default function ChangePasswordForm({ onSubmit, onDone, min = 10 }) {
  const [v, setV] = useState({ current: "", next: "", again: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (v.next.length < min || !/[A-Za-z]/.test(v.next) || !/\d/.test(v.next)) return setError(`New password needs at least ${min} characters, with letters and numbers.`);
    if (v.next !== v.again) return setError("The two new passwords don't match.");
    setBusy(true);
    try { await onSubmit(v.current, v.next); setV({ current: "", next: "", again: "" }); onDone?.(); }
    catch (err) { setError(err.details?.[0]?.message || err.message); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Current password"><Input type="password" autoComplete="current-password" required value={v.current} onChange={set("current")} /></Field>
      <Field label="New password" hint={`At least ${min} characters, letters and numbers`}><Input type="password" autoComplete="new-password" required value={v.next} onChange={set("next")} /></Field>
      <Field label="Repeat new password"><Input type="password" autoComplete="new-password" required value={v.again} onChange={set("again")} /></Field>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Change password"}</Button>
    </form>
  );
}
