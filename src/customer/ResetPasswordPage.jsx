import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { accountApi } from "../services";
import AuthCard from "../auth/AuthCard";
import Button from "../../admin/components/Button";
import { Field, Input } from "../../admin/components/FormFields";

export default function ResetPasswordPage() {
  const token = useSearchParams()[0].get("token") || "";
  const [pw, setPw] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setError("At least 8 characters, with letters and numbers.");
    setBusy(true);
    try { await accountApi.resetPassword(token, pw); setDone(true); }
    catch (err) { setError(err.details?.[0]?.message || err.message); }
    finally { setBusy(false); }
  };
  return (
    <AuthCard title="Choose a new password" footer={<Link to="/login" className="underline">Back to sign in</Link>}>
      {!token ? <p className="text-sm text-danger">This reset link is incomplete. Please request a new one.</p>
        : done ? <p role="status" className="text-sm text-ink">Your password has been changed. <Link to="/login" className="underline">Sign in</Link> with the new password.</p>
        : (
          <form onSubmit={submit} className="space-y-5">
            <Field label="New password" hint="At least 8 characters, letters and numbers"><Input type="password" required autoFocus autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Change password"}</Button>
          </form>
        )}
    </AuthCard>
  );
}
