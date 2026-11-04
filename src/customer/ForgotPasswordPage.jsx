import { useState } from "react";
import { Link } from "react-router-dom";
import { accountApi } from "../services";
import AuthCard from "../auth/AuthCard";
import Button from "../../admin/components/Button";
import { Field, Input } from "../../admin/components/FormFields";
import { useCmsPageCopy } from "../shop/cmsCopy";
import useTitle from "../shop/useTitle";

export default function ForgotPasswordPage() {
  const copy = useCmsPageCopy("customer_forgot_password");
  useTitle(copy.browserTitle);
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try { await accountApi.forgotPassword(identifier.trim()); setSent(true); }
    catch (err) { setError(err.status === 429 ? copy.rateLimit : err.message); }
    finally { setBusy(false); }
  };
  return (
    <AuthCard title={copy.title} footer={<Link to="/login" className="underline">{copy.backLink}</Link>}>
      {sent ? (
        <p role="status" className="text-sm text-[#182308]">{copy.success}</p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <Field label={copy.identifier}><Input required autoFocus value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></Field>
          {error && <p role="alert" className="text-sm text-[#9b3f3f] rounded-xl bg-[#9b3f3f]/10 px-3 py-2">{error}</p>}
          <Button type="submit" className="w-full rounded-xl min-h-11" disabled={busy}>{busy ? copy.busy : copy.submit}</Button>
        </form>
      )}
    </AuthCard>
  );
}
