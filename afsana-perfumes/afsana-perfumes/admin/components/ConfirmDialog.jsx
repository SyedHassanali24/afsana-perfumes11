import { useEffect, useState } from "react";
import Button from "./Button";

/** Plain yes/no confirmation (no password). `onConfirm` may throw: the message is shown inside the dialog. */
export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = false, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setBusy(false); setError(""); } }, [open]);
  if (!open) return null;
  const go = async () => {
    setBusy(true); setError("");
    try { await onConfirm(); onClose(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-sm bg-surface border border-border rounded-md p-6 space-y-4">
        <h2 className="font-display text-lg text-ink">{title}</h2>
        {message && <p className="text-sm text-ink-muted">{message}</p>}
        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={go} disabled={busy}>{busy ? "Working…" : confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
