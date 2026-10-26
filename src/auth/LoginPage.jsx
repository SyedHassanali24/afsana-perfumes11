import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Button from '../../admin/components/Button';
import { Field, Input } from '../../admin/components/FormFields';

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || '/admin';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (status === 'authed') return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.status === 429 ? 'Too many attempts. Please wait a few minutes and try again.' : err.message);
    } finally { setBusy(false); }
  };

  const quickLoginAsAdmin = async () => {
    setError('');
    setBusy(true);
    try {
      await login('admin@afsana.pk', 'Admin@Afsana2026!');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.status === 429 ? 'Too many attempts. Please wait a few minutes and try again.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        {/* Quick Demo Access Callout */}
        <div className="bg-surface border border-gold/40 rounded-md p-4 text-xs space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gold uppercase tracking-wider text-[11px]">
              Demo Administrator Access
            </span>
            <span className="text-[10px] bg-gold/15 text-gold px-2 py-0.5 rounded-full font-mono">
              Pre-Seeded
            </span>
          </div>
          <p className="text-ink-muted leading-relaxed">
            Instant 1-click access to the full Afsana Enterprise Management Panel (Inventory, Orders, Catalog, Finance, Courier, Analytics).
          </p>
          <button
            type="button"
            onClick={quickLoginAsAdmin}
            disabled={busy}
            className="w-full py-2.5 px-4 bg-gold hover:bg-gold-hover text-bg font-semibold rounded-sm transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
          >
            {busy ? 'Signing in as Admin…' : '⚡ 1-Click Sign In as Admin'}
          </button>
          <div className="pt-1.5 flex items-center justify-between text-[11px] text-ink-muted/80 font-mono border-t border-border/50">
            <span>admin@afsana.pk</span>
            <span>Admin@Afsana2026!</span>
          </div>
        </div>

        {/* Regular Login Form */}
        <form onSubmit={submit} className="bg-surface border border-border rounded-md p-8 space-y-5">
          <div>
            <h1 className="font-display text-2xl" style={{ color: 'var(--gold)' }}>Afsana Privé</h1>
            <p className="text-sm text-ink-muted mt-1">Staff Management Portal Sign In</p>
          </div>
          <Field label="Email">
            <Input type="email" autoComplete="username" required autoFocus value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>

          <div className="pt-2 text-center border-t border-border/50">
            <a
              href="/"
              className="text-xs text-ink-muted hover:text-gold transition-colors inline-flex items-center gap-1.5"
            >
              <span>← Return to Storefront Boutique</span>
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
