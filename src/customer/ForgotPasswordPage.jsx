import { useState } from "react";
import { Link } from "react-router-dom";
import { accountApi } from "../services";
import TurnstileWidget from "../components/TurnstileWidget";
import AuthCard from "../auth/AuthCard";
import Button from "../../admin/components/Button";
import { Field, Input } from "../../admin/components/FormFields";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try { await accountApi.forgotPassword(identifier.trim(), turnstileToken); setSent(true); }
    catch (err) { setError(err.status === 429 ? "Too many requests. Please try again later." : err.message); }
    finally { setBusy(false); setTurnstileToken(""); setTurnstileResetKey(v => v + 1); }
  };
  return (
    <AuthCard title="Reset your password" footer={<Link to="/login" className="underline">Back to sign in</Link>}>
      {sent ? (
        <p role="status" className="text-sm text-[#182308]">If an account exists with a saved email, we've sent a link to reset the password. It expires in 30 minutes. If you signed up without an email, please contact us.</p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <Field label="Email or phone number"><Input required autoFocus value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></Field>
          <TurnstileWidget action="customer_password_reset_request" onToken={setTurnstileToken} resetKey={turnstileResetKey} />
          {error && <p role="alert" className="text-sm text-[#9b3f3f] rounded-xl bg-[#9b3f3f]/10 px-3 py-2">{error}</p>}
          <Button type="submit" className="w-full rounded-xl min-h-11" disabled={busy || !turnstileToken}>{busy ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
    </AuthCard>
  );
}
