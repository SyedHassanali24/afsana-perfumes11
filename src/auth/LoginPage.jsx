import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import TurnstileWidget from '../components/TurnstileWidget';
import {
  ArrowUpRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

const inputClass = 'mt-2 block w-full rounded-xl border border-[#e6e1f0] bg-[#fbfaff] px-4 py-3.5 text-sm text-[#21183b] placeholder:text-[#aaa2b8] outline-none transition duration-200 focus:border-[#7958df] focus:bg-white focus:ring-4 focus:ring-[#7958df]/10';

function ResetPasswordDialog({ reset, setReset, error, setError, busy, onForgot, onVerify, onReset, turnstileToken, onTurnstileToken, turnstileResetKey }) {
  if (!reset.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#100b20]/65 p-4 backdrop-blur-md" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setReset(v => ({ ...v, open: false })); }}>
      <form
        onSubmit={reset.step === 1 ? onForgot : onReset}
        className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_28px_90px_rgba(10,5,30,.28)] sm:p-8"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#3a2675] via-[#8765e7] to-[#d7c5ff]" />
        <button type="button" aria-label="Close password reset" disabled={busy} onClick={() => setReset(v => ({ ...v, open: false }))} className="absolute right-5 top-5 rounded-full p-2 text-[#8b829b] transition hover:bg-[#f3effa] hover:text-[#342253] disabled:opacity-40">
          <X size={18} />
        </button>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0ebff] text-[#7352d0]">
          <LockKeyhole size={22} />
        </div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[.24em] text-[#8264cd]">AFSANA ACCOUNT SECURITY</p>
        <h2 className="pr-8 font-display text-3xl text-[#201735]">
          {reset.step === 1 ? 'Reset your password' : reset.step === 2 ? 'Verify your email' : 'Create a new password'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#827a91]">
          {reset.step === 1 ? 'Enter your staff email and we will send you a verification code.' : reset.step === 2 ? 'Enter the 6-digit code sent to your administrator email.' : 'Choose a new password for your AFSANA staff account.'}
        </p>

        {reset.step === 1 && (
          <label className="mt-6 block text-xs font-semibold text-[#514765]">
            Staff email address
            <input className={inputClass} type="email" autoComplete="email" required autoFocus value={reset.email} onChange={e => setReset(v => ({ ...v, email: e.target.value }))} placeholder="you@afsana.com" />
          </label>
        )}
        {reset.step === 2 && (
          <label className="mt-6 block text-xs font-semibold text-[#514765]">
            6-digit verification code
            <input className={inputClass + ' text-center text-lg font-semibold tracking-[.45em]'} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus value={reset.otp} onChange={e => setReset(v => ({ ...v, otp: e.target.value.replace(/\D/g, '') }))} placeholder="••••••" />
          </label>
        )}
        {reset.step === 3 && (
          <div className="mt-6 space-y-4">
            <label className="block text-xs font-semibold text-[#514765]">
              New password
              <input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={reset.password} onChange={e => setReset(v => ({ ...v, password: e.target.value }))} placeholder="At least 8 characters" />
            </label>
            <label className="block text-xs font-semibold text-[#514765]">
              Confirm new password
              <input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={reset.confirm} onChange={e => setReset(v => ({ ...v, confirm: e.target.value }))} placeholder="Enter it again" />
            </label>
          </div>
        )}

        <div className="mt-5"><TurnstileWidget action={reset.step === 1 ? 'staff_password_reset_request' : reset.step === 2 ? 'staff_password_reset_verify' : 'staff_password_reset_complete'} onToken={onTurnstileToken} resetKey={turnstileResetKey} /></div>

        {reset.msg && <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-[#f1edff] px-3.5 py-3 text-xs leading-5 text-[#6548b5]"><CheckCircle2 size={15} className="mt-0.5 shrink-0" />{reset.msg}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-xs leading-5 text-[#a33c51]">{error}</p>}

        <button type={reset.step === 2 ? 'button' : 'submit'} onClick={reset.step === 2 ? onVerify : undefined} disabled={busy || !turnstileToken} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3a2675] to-[#7552d2] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(91,62,170,.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(91,62,170,.28)] disabled:cursor-wait disabled:opacity-60">
          {busy ? 'Please wait…' : reset.step === 1 ? 'Send verification code' : reset.step === 2 ? 'Verify code' : 'Set new password'}
          {!busy && <ArrowUpRight size={16} />}
        </button>
        <button type="button" disabled={busy} onClick={() => { setError(''); setReset(v => ({ ...v, open: false })); }} className="mt-4 w-full text-center text-xs font-medium text-[#887f97] transition hover:text-[#4b357e]">Back to sign in</button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  const { status, login, completeTwoFactor } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || '/admin';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [twoFactor, setTwoFactor] = useState(null);
  const [reset, setReset] = useState({ open: false, step: 1, email: '', otp: '', resetToken: '', password: '', confirm: '', msg: '' });

  if (status === 'authed') return <Navigate to={from} replace />;

  const forgot = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const r = await fetch('/api/auth/forgot-password/request', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afsana' }, body: JSON.stringify({ email: reset.email.trim(), turnstileToken }) });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d?.error?.message || 'Unable to send OTP.');
      setReset(v => ({ ...v, step: 2, msg: 'A verification code has been sent to your administrator email.' }));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); setTurnstileToken(''); setTurnstileResetKey(v => v + 1); }
  };

  const verifyOtp = async () => {
    setError(''); setBusy(true);
    try {
      const r = await fetch('/api/auth/forgot-password/verify', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afsana' }, body: JSON.stringify({ email: reset.email.trim(), otp: reset.otp.trim(), turnstileToken }) });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d?.error?.message || 'Invalid verification code.');
      setReset(v => ({ ...v, step: 3, resetToken: d.resetToken, msg: 'Email verified. You can now create a new password.' }));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); setTurnstileToken(''); setTurnstileResetKey(v => v + 1); }
  };

  const doReset = async (e) => {
    e.preventDefault();
    if (reset.step !== 3) return;
    if (reset.password !== reset.confirm) { setError('Passwords do not match.'); return; }
    setError(''); setBusy(true);
    try {
      const r = await fetch('/api/auth/forgot-password/reset', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afsana' }, body: JSON.stringify({ email: reset.email.trim(), resetToken: reset.resetToken, password: reset.password, turnstileToken }) });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d?.error?.message || 'Unable to reset password.');
      setReset({ open: false, step: 1, email: '', otp: '', resetToken: '', password: '', confirm: '', msg: '' });
      setError('');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); setTurnstileToken(''); setTurnstileResetKey(v => v + 1); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const result = await login(form.email.trim(), form.password, turnstileToken);
      if (result?.requiresTwoFactor) {
        setTwoFactor({ email: form.email.trim(), challengeId: result.challengeId, otp: '' });
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.status === 429 ? 'Too many attempts. Your account may be locked for 3 minutes.' : err.message);
    } finally { setBusy(false); setTurnstileToken(''); setTurnstileResetKey(v => v + 1); }
  };

  const verifyAdminOtp = async (e) => {
    e.preventDefault();
    if (!twoFactor) return;
    setError(''); setBusy(true);
    try {
      await completeTwoFactor(twoFactor.email, twoFactor.challengeId, twoFactor.otp.trim(), turnstileToken);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.status === 429 ? 'Too many incorrect codes. Please sign in again.' : err.message);
    } finally { setBusy(false); setTurnstileToken(''); setTurnstileResetKey(v => v + 1); }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f3f0fa] p-0 text-[#21183b] sm:p-4 lg:p-7">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] overflow-hidden bg-white shadow-[0_24px_90px_rgba(36,20,73,.13)] sm:min-h-[calc(100vh-2rem)] sm:rounded-[30px] lg:min-h-[calc(100vh-3.5rem)] lg:rounded-[34px] lg:border lg:border-white">
        {/* Visual welcome panel */}
        <section className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-[#17102f] via-[#35216e] to-[#7654d8] text-white lg:flex lg:items-center lg:justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(197,176,255,.22),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(217,255,85,.13),transparent_25%),linear-gradient(145deg,transparent,rgba(8,4,22,.28))]" />
          <div className="absolute -left-44 -bottom-48 h-[520px] w-[520px] rounded-full border border-white/10" />
          <div className="absolute -left-28 -bottom-32 h-[390px] w-[390px] rounded-full border border-white/10" />
          <div className="absolute -right-36 -top-32 h-[420px] w-[420px] rounded-full border border-white/10" />
          <div className="absolute right-14 top-16 h-40 w-40 rounded-full border border-[#d9ff55]/20" />
          <div className="absolute right-[6.8rem] top-[7.9rem] h-2.5 w-2.5 rounded-full bg-[#d9ff55] shadow-[0_0_24px_5px_rgba(217,255,85,.55)]" />
          <div className="absolute bottom-16 right-14 h-40 w-40 rounded-full bg-[#a88aff]/20 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-xl px-12 text-center xl:px-16">
            <div className="mx-auto mb-9 flex h-24 w-24 items-center justify-center rounded-[30px] border border-white/70 bg-white shadow-[0_18px_60px_rgba(12,5,34,.28)]">
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-[23px] bg-gradient-to-br from-[#24164b] to-[#7352d0] text-[#e5d8ff]">
                <ShieldCheck size={35} strokeWidth={1.5} />
              </div>
            </div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[.38em] text-[#d9ff55]">THE ART OF SCENT</p>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-[-.035em] text-white xl:text-6xl">Welcome to the <span className="block italic text-[#e3d7ff]">Afsana House.</span></h1>
            <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-white/75 xl:text-base">Your private workspace for shaping the AFSANA experience. Sign in securely to manage your store, products and stories.</p>

            <div className="mt-11 flex items-center justify-center gap-3" aria-hidden="true">
              <span className="h-1.5 w-7 rounded-full bg-white/35" />
              <span className="h-1.5 w-10 rounded-full bg-[#d9ff55]" />
              <span className="h-1.5 w-7 rounded-full bg-white/35" />
            </div>

            <div className="mx-auto mt-14 flex max-w-sm items-center justify-center gap-3 border-t border-white/15 pt-6 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#d9ff55]"><LockKeyhole size={16} /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/90">Private staff access</p>
                <p className="mt-1 text-[11px] text-white/55">Your role and permissions stay protected.</p>
              </div>
              <Sparkles className="ml-auto shrink-0 text-white/40" size={18} />
            </div>
          </div>
          <span className="absolute bottom-7 left-9 text-[9px] font-semibold uppercase tracking-[.3em] text-white/35">AFSANA · EST. WITH PURPOSE</span>
        </section>

        {/* Staff sign-in form */}
        <section className="relative flex w-full flex-col justify-center bg-white px-6 py-10 sm:px-10 lg:w-1/2 lg:px-12 xl:px-20">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#eee8ff]/60 blur-3xl" />
          <div className="relative mx-auto w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <p className="font-display text-3xl font-semibold tracking-[.12em] text-[#2c1d50]">AFSANA</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[.3em] text-[#8a70c9]">THE ART OF SCENT · STAFF PORTAL</p>
            </div>

            <div className="mb-9">
              <div className="mb-5 hidden h-1 w-12 rounded-full bg-gradient-to-r from-[#7451d1] to-[#d9ff55] lg:block" />
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.28em] text-[#8667ce]">AFSANA STAFF PORTAL</p>
              <h2 className="font-display text-4xl font-semibold leading-tight tracking-[-.035em] text-[#201735] sm:text-[42px]">Welcome back.</h2>
              <p className="mt-3 text-sm leading-6 text-[#898196]">Please sign in to continue to your workspace.</p>
            </div>

            {!twoFactor && (
              <form onSubmit={submit} className="space-y-5">
                            <label className="block text-xs font-semibold text-[#4c4261]">
                              Email address
                              <span className="relative mt-2 block">
                                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8fb0]" size={17} />
                                <input type="email" name="email" autoComplete="username" required autoFocus value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@afsana.com" className={inputClass + ' pl-11'} />
                              </span>
                            </label>
              
                            <label className="block text-xs font-semibold text-[#4c4261]">
                              Password
                              <span className="relative mt-2 block">
                                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8fb0]" size={17} />
                                <input type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" className={inputClass + ' pl-11 pr-12'} />
                                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#9288a4] transition hover:bg-[#f0ebff] hover:text-[#5e43a8]">
                                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                              </span>
                            </label>
              
                            <div className="flex items-center justify-end pt-0.5">
                              <button type="button" onClick={() => { setError(''); setReset(v => ({ ...v, open: true, step: 1, email: form.email, otp: '', resetToken: '', password: '', confirm: '', msg: '' })); }} className="text-xs font-semibold text-[#7654c9] transition hover:text-[#4e329d] hover:underline">Forgot password?</button>
                            </div>
              
                            {!reset.open && <TurnstileWidget action="staff_login" onToken={setTurnstileToken} resetKey={turnstileResetKey} />}
                            {error && !reset.open && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-[#a33c51]">{error}</p>}
              
                            <button type="submit" disabled={busy || !turnstileToken} className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#38236f] via-[#583ca5] to-[#7554d0] px-5 py-4 text-sm font-bold tracking-wide text-white shadow-[0_12px_28px_rgba(80,55,145,.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_17px_34px_rgba(80,55,145,.30)] disabled:cursor-wait disabled:opacity-60">
                              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                              <span className="relative">{busy ? 'Signing in…' : 'Sign in'}</span>
                              {!busy && <ArrowUpRight className="relative transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={17} />}
                            </button>
                          </form>
            )}

            {twoFactor && (
              <form onSubmit={verifyAdminOtp} className="space-y-5">
                <div className="rounded-2xl border border-[#e8e1f3] bg-[#fbfaff] p-4">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eee8ff] text-[#7352d0]"><ShieldCheck size={19} /></div>
                  <p className="text-sm font-bold text-[#33234f]">Verify this device</p>
                  <p className="mt-1 text-xs leading-5 text-[#827992]">A 6-digit security code is required for a new admin device. Check the owner email inbox.</p>
                </div>
                <label className="block text-xs font-semibold text-[#4c4261]">
                  6-digit security code
                  <input
                    className={inputClass + ' text-center text-xl font-semibold tracking-[.5em]'}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    autoFocus
                    value={twoFactor.otp}
                    onChange={e => setTwoFactor(v => ({ ...v, otp: e.target.value.replace(/\D/g, '') }))}
                    placeholder="••••••"
                  />
                </label>
                <TurnstileWidget action="staff_2fa" onToken={setTurnstileToken} resetKey={turnstileResetKey} />
                {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-5 text-[#a33c51]">{error}</p>}
                <button type="submit" disabled={busy || twoFactor.otp.length !== 6 || !turnstileToken} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#38236f] via-[#583ca5] to-[#7554d0] px-5 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(80,55,145,.22)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">
                  {busy ? 'Verifying…' : 'Verify and continue'}
                  {!busy && <ArrowUpRight size={17} />}
                </button>
                <button type="button" disabled={busy} onClick={() => { setTwoFactor(null); setError(''); setForm(v => ({ ...v, password: '' })); }} className="w-full text-center text-xs font-semibold text-[#887f97] hover:text-[#4b357e]">Back to sign in</button>
              </form>
            )}

            <div className="my-8 flex items-center gap-4">
              <span className="h-px flex-1 bg-[#eeeaf4]" />
              <span className="text-[9px] font-semibold uppercase tracking-[.2em] text-[#aaa2b6]">Need a hand?</span>
              <span className="h-px flex-1 bg-[#eeeaf4]" />
            </div>

            <a href="https://wa.me/923132956206" target="_blank" rel="noreferrer" className="group flex items-center justify-between rounded-2xl border border-[#e9e3f3] bg-[#fcfbff] px-4 py-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-[#c9b9f0] hover:bg-[#f7f3ff]">
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f8ef] text-[#1f9e5a]"><MessageCircle size={20} /></span>
                <span>
                  <span className="block text-xs font-bold text-[#403653]">Contact us on WhatsApp</span>
                  <span className="mt-1 block text-[11px] text-[#91889f]">Need help accessing your account?</span>
                </span>
              </span>
              <ArrowUpRight size={17} className="text-[#a49ab6] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#6f50bd]" />
            </a>

            <p className="mt-9 text-center text-[10px] tracking-wide text-[#aaa3b5]">© {new Date().getFullYear()} AFSANA. THE ART OF SCENT.</p>
          </div>
        </section>
      </div>

      <ResetPasswordDialog reset={reset} setReset={setReset} error={error} setError={setError} busy={busy} onForgot={forgot} onVerify={verifyOtp} onReset={doReset} turnstileToken={turnstileToken} onTurnstileToken={setTurnstileToken} turnstileResetKey={turnstileResetKey} />
    </main>
  );
}
