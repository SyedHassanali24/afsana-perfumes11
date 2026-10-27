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
    <div className="min-h-screen flex items-center justify-center bg-[#263e0e] px-4 relative overflow-hidden">
      <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[#b4bf41]/15 blur-3xl" /><div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#748e40]/20 blur-3xl" /><form onSubmit={submit} className="relative w-full max-w-sm bg-[#faf8f4]/95 backdrop-blur border border-[#748e40]/25 rounded-3xl p-8 space-y-5 shadow-2xl">
        <div>
          <h1 className="font-display text-2xl" className="text-[#263e0e]">Afsana</h1>
          <p className="text-sm text-[#5f654f] mt-1">Staff sign in</p>
        </div>
        <Field label="Email">
          <Input type="email" autoComplete="username" required autoFocus value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {error && <p role="alert" className="text-sm text-[#9b3f3f]">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </div>
  );
}
