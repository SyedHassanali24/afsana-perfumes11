import { useState } from "react";
import Button from "./Button";

/** Shows a generated password exactly once. The server never stores or returns it again. */
export default function TempPasswordModal({ open, email, password, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const copy = async () => { try { await navigator.clipboard.writeText(password); setCopied(true); } catch { /* user can select manually */ } };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-sm bg-surface border border-border rounded-md p-6 space-y-4">
        <h2 className="font-display text-lg text-ink">Temporary password</h2>
        <p className="text-sm text-ink-muted">Share this with <span className="text-ink">{email}</span> securely. It is shown only once, and they must choose a new password when they sign in.</p>
        <code className="block select-all text-center text-lg tracking-wider bg-bg border border-border rounded-sm py-3 text-ink">{password}</code>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
          <Button onClick={() => { setCopied(false); onClose(); }}>Done</Button>
        </div>
      </div>
    </div>
  );
}
