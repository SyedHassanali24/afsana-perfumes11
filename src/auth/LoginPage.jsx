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

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-surface border border-border rounded-md p-8 space-y-5">
        <div>
          <h1 className="font-display text-2xl" style={{ color: 'var(--gold)' }}>Afsana</h1>
          <p className="text-sm text-ink-muted mt-1">Staff sign in</p>
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
      </form>
    </div>
  );
}
