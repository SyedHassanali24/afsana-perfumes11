import { useEffect, useState } from "react";
import Button from "./Button";
import { Field, Input } from "./FormFields";

/**
 * Re-auth prompt for high-risk actions (price change, stock adjust, delete).
 * `onConfirm(password)` should call the API and throw on failure; the modal shows
 * the error (wrong password etc.) and closes itself on success.
 */
export default function ConfirmPasswordModal({ open, title = "Confirm your password", message, confirmLabel = "Confirm", danger = false, onConfirm, onClose }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setPassword(""); setError(""); setBusy(false); } }, [open]);
  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!password) { setError("Enter your password."); return; }
    setBusy(true); setError("");
    try {
      await onConfirm(password);
      onClose();
    } catch (err) {
      setError(err.code === "REAUTH_FAILED" ? "Incorrect password." : err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label={title}
        className="relative w-full max-w-sm bg-surface border border-border rounded-md p-6 space-y-4">
        <h2 className="font-display text-lg text-ink">{title}</h2>
        {message && <p className="text-sm text-ink-muted">{message}</p>}
        <Field label="Your password" error={error}>
          <Input type="password" autoFocus autoComplete="current-password" value={password} error={!!error}
            onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant={danger ? "danger" : "primary"} disabled={busy}>{busy ? "Working…" : confirmLabel}</Button>
        </div>
      </form>
    </div>
  );
}
