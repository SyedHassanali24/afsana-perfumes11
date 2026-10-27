import { useState } from "react";
import Button from "./Button";

export default function TempPasswordModal({ open, email, password, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const copy = async () => { try { await navigator.clipboard.writeText(password); setCopied(true); } catch {} };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#182308]/60" aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-sm bg-[#faf8f4] border border-[#263e0e]/10 rounded-2xl p-6 space-y-4 shadow-2xl">
        <h2 className="font-display text-lg text-[#182308]">Temporary password</h2>
        <p className="text-sm text-[#5f654f]">Share this with <span className="text-[#182308]">{email}</span> securely. It is shown only once, and they must choose a new password when they sign in.</p>
        <code className="block select-all text-center text-lg tracking-wider bg-[#f3f1e9] border border-[#263e0e]/10 rounded-xl py-3 text-[#182308]">{password}</code>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
          <Button onClick={() => { setCopied(false); onClose(); }}>Done</Button>
        </div>
      </div>
    </div>
  );
}
