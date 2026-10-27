import { useEffect, useState } from "react";
import Button from "./Button";

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
      <div className="absolute inset-0 bg-[#182308]/60" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-sm bg-[#faf8f4] border border-[#263e0e]/10 rounded-2xl p-6 space-y-4 shadow-2xl">
        <h2 className="font-display text-lg text-[#182308]">{title}</h2>
        {message && <p className="text-sm text-[#5f654f]">{message}</p>}
        {error && <p role="alert" className="text-sm text-[#9b3f3f] bg-[#f7e7e5] rounded-xl px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={go} disabled={busy}>{busy ? "Working…" : confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
