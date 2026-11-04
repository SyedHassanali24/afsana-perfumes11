import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { accountApi } from "../services";
import AuthCard from "../auth/AuthCard";
import Button from "../../admin/components/Button";
import { Field, Input } from "../../admin/components/FormFields";
import { useCmsPageCopy } from "../shop/cmsCopy";

export default function ResetPasswordPage() {
  const copy = useCmsPageCopy("customer_reset_password");
  const token = useSearchParams()[0].get("token") || "";
  const [pw, setPw] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setError(copy.passwordError);
    setBusy(true);
    try { await accountApi.resetPassword(token, pw); setDone(true); }
    catch (err) { setError(err.details?.[0]?.message || err.message); }
    finally { setBusy(false); }
  };
  return (
    <AuthCard title={copy.title} footer={<Link to="/login" className="underline">{copy.backLink}</Link>}>
      {!token ? <p className="text-sm text-[#9b3f3f] rounded-xl bg-[#9b3f3f]/10 px-3 py-2">{copy.invalidLink}</p>
        : done ? <p role="status" className="text-sm text-[#182308]">{copy.success} <Link to="/login" className="underline">{copy.signIn}</Link> {copy.successSuffix}</p>
        : (
          <form onSubmit={submit} className="space-y-5">
            <Field label={copy.password} hint={copy.passwordHint}><Input type="password" required autoFocus autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
            {error && <p role="alert" className="text-sm text-[#9b3f3f]">{error}</p>}
            <Button type="submit" className="w-full rounded-xl min-h-11" disabled={busy}>{busy ? copy.busy : copy.submit}</Button>
          </form>
        )}
    </AuthCard>
  );
}
