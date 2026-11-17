import { useState } from "react";
import { Link } from "react-router-dom";
import { accountApi } from "../services";
import AuthCard from "../auth/AuthCard";
import Button from "../../admin/components/Button";
import { Field, Input } from "../../admin/components/FormFields";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState("email");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async (event) => {
    event?.preventDefault();
    setError(""); setBusy(true);
    try {
      await accountApi.forgotPassword(email.trim());
      setStep("otp");
    } catch (err) {
      setError(err.status === 429 ? "A code was requested recently. Please wait a minute before trying again." : err.message);
    } finally { setBusy(false); }
  };

  const verifyCode = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const result = await accountApi.verifyForgotPassword(email.trim(), otp.trim());
      if (!result?.resetToken) throw new Error("Email verification could not be completed. Request a new code.");
      setResetToken(result.resetToken);
      setStep("password");
    } catch (err) {
      setError(err.status === 429 ? "Too many incorrect codes. Request a new code." : err.message);
    } finally { setBusy(false); }
  };

  const savePassword = async (event) => {
    event.preventDefault(); setError("");
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\\d/.test(newPassword)) {
      setError("Use at least 8 characters, including letters and numbers."); return;
    }
    if (newPassword !== confirmPassword) { setError("The passwords do not match."); return; }
    setBusy(true);
    try {
      await accountApi.resetPassword(resetToken, newPassword);
      setStep("done");
    } catch (err) {
      setError(err.message || "Your password could not be reset. Verify your email again.");
      if (err.code === "INVALID_RESET") { setResetToken(""); setStep("otp"); }
    } finally { setBusy(false); }
  };

  return (
    <AuthCard title={step === "done" ? "Password updated" : "Reset your password"} subtitle="Your account stays protected with email verification." footer={<Link to="/login" className="underline">Back to sign in</Link>}>
      {step === "done" ? (
        <div role="status" className="space-y-4">
          <p className="text-sm leading-6 text-[#3d6b3d]">Your password has been changed successfully. You can now sign in with your new password.</p>
          <Button type="button" className="w-full rounded-xl min-h-11" onClick={() => { window.location.href = "/login"; }}>Go to sign in</Button>
        </div>
      ) : step === "email" ? (
        <form onSubmit={sendCode} className="space-y-5">
          <p className="text-sm leading-6 text-[#6b7167]">Enter the email address saved on your customer account. We will send a six-digit verification code.</p>
          <Field label="Account email"><Input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></Field>
          {error && <p role="alert" className="rounded-xl bg-[#9b3f3f]/10 px-3 py-2 text-sm text-[#9b3f3f]">{error}</p>}
          <Button type="submit" className="w-full rounded-xl min-h-11" disabled={busy}>{busy ? "Sending code…" : "Send verification code"}</Button>
        </form>
      ) : step === "otp" ? (
        <form onSubmit={verifyCode} className="space-y-5">
          <p className="text-sm leading-6 text-[#6b7167]">Enter the six-digit code sent to <strong className="break-all text-[#263e0e]">{email}</strong>. The code expires in 10 minutes.</p>
          <Field label="Email verification code"><Input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\\D/g, "").slice(0, 6))} placeholder="000000"/></Field>
          {error && <p role="alert" className="rounded-xl bg-[#9b3f3f]/10 px-3 py-2 text-sm text-[#9b3f3f]">{error}</p>}
          <Button type="submit" className="w-full rounded-xl min-h-11" disabled={busy || otp.length !== 6}>{busy ? "Verifying…" : "Verify email"}</Button>
          <button type="button" onClick={sendCode} disabled={busy} className="w-full text-center text-xs text-[#5f654f] underline disabled:opacity-50">Resend code</button>
        </form>
      ) : (
        <form onSubmit={savePassword} className="space-y-5">
          <p className="text-sm leading-6 text-[#6b7167]">Email verified. Choose a new password for your AFSANA account.</p>
          <Field label="New password"><Input type="password" required autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}/></Field>
          <Field label="Confirm new password"><Input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}/></Field>
          {error && <p role="alert" className="rounded-xl bg-[#9b3f3f]/10 px-3 py-2 text-sm text-[#9b3f3f]">{error}</p>}
          <Button type="submit" className="w-full rounded-xl min-h-11" disabled={busy}>{busy ? "Updating password…" : "Save new password"}</Button>
        </form>
      )}
    </AuthCard>
  );
}
