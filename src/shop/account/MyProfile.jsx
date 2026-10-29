import { useEffect, useState } from 'react';
import { accountApi } from '../../services';
import { useCustomer } from '../../customer/CustomerAuthContext';
import Button from '../../../admin/components/Button';
import { Field, Input } from '../../../admin/components/FormFields';

function ProfileForm() {
  const { customer, refresh } = useCustomer();
  const [f, setF] = useState({ name: customer?.name || '', city: customer?.city || '', email: customer?.email || '' });
  const [msg, setMsg] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { setF({ name: customer?.name || '', city: customer?.city || '', email: customer?.email || '' }); }, [customer?.name, customer?.city]);
  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setError(''); setBusy(true);
    try { if (!f.name.trim()) { setError('Name is required.'); setBusy(false); return; }
    await accountApi.updateProfile({ name: f.name.trim(), city: f.city.trim(), email: f.email.trim() || undefined }); await refresh(); setMsg('Saved.'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] shadow-[0_18px_50px_rgba(24,35,8,.06)] p-5 space-y-4">
      <h2 className="font-display text-xl">Your details</h2>
      <Field label="Name"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Email"><Input type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@example.com" /></Field>
      <Field label="City"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
    </div>
      <p className="text-xs text-[#5f654f]">Phone: {customer?.phone || '—'}{customer?.email ? ` · Email: ${customer.email}` : ''}</p>
      {error && <p role="alert" className="text-sm text-[#9b3f3f]">{error}</p>}{msg && <p role="status" className="text-sm text-[#3d6b3d]">{msg}</p>}
      <Button type="submit" className="w-full sm:w-auto rounded-xl" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
    </form>
  );
}

function PasswordForm() {
  const [f, setF] = useState({ cur: '', next: '' });
  const [msg, setMsg] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setError('');
    if (f.next.length < 8 || !/[A-Za-z]/.test(f.next) || !/\d/.test(f.next)) return setError('New password: at least 8 characters, with letters and numbers.');
    if (f.cur === f.next) return setError('New password must be different from your current password.');
    setBusy(true);
    try { await accountApi.changePassword(f.cur, f.next); setF({ cur: '', next: '' }); setMsg('Password changed. Other devices were signed out.'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] shadow-[0_18px_50px_rgba(24,35,8,.06)] p-5 space-y-4">
      <h2 className="font-display text-xl">Change password</h2>
      <Field label="Current password"><Input type="password" required autoComplete="current-password" value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })} /></Field>
      <Field label="New password"><Input type="password" required autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
      {error && <p role="alert" className="text-sm text-[#9b3f3f]">{error}</p>}{msg && <p role="status" className="text-sm text-[#3d6b3d]">{msg}</p>}
      <Button type="submit" variant="secondary" className="w-full sm:w-auto rounded-xl" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</Button>
    </form>
  );
}

export default function MyProfile() { return <div className="space-y-6"><ProfileForm /><PasswordForm /></div>; }
