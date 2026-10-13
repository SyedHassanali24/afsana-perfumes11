import { useState } from 'react';
import { accountApi } from '../../services';
import { useCustomer } from '../../customer/CustomerAuthContext';
import Button from '../../../admin/components/Button';
import { Field, Input } from '../../../admin/components/FormFields';

function ProfileForm() {
  const { customer, refresh } = useCustomer();
  const [f, setF] = useState({ name: customer?.name || '', city: customer?.city || '' });
  const [msg, setMsg] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setError(''); setBusy(true);
    try { await accountApi.updateProfile({ name: f.name.trim(), city: f.city.trim() }); await refresh(); setMsg('Saved.'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="rounded-md border border-border bg-surface p-5 space-y-4">
      <h2 className="font-display text-xl">Your details</h2>
      <Field label="Name"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="City"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
      <p className="text-xs text-ink-muted">Phone: {customer?.phone || '—'}{customer?.email ? ` · Email: ${customer.email}` : ''}</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}{msg && <p role="status" className="text-sm text-success">{msg}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
    </form>
  );
}

function PasswordForm() {
  const [f, setF] = useState({ cur: '', next: '' });
  const [msg, setMsg] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setError('');
    if (f.next.length < 8 || !/[A-Za-z]/.test(f.next) || !/\d/.test(f.next)) return setError('New password: at least 8 characters, with letters and numbers.');
    setBusy(true);
    try { await accountApi.changePassword(f.cur, f.next); setF({ cur: '', next: '' }); setMsg('Password changed. Other devices were signed out.'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="rounded-md border border-border bg-surface p-5 space-y-4">
      <h2 className="font-display text-xl">Change password</h2>
      <Field label="Current password"><Input type="password" required autoComplete="current-password" value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })} /></Field>
      <Field label="New password"><Input type="password" required autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}{msg && <p role="status" className="text-sm text-success">{msg}</p>}
      <Button type="submit" variant="secondary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</Button>
    </form>
  );
}

export default function MyProfile() { return <div className="space-y-6"><ProfileForm /><PasswordForm /></div>; }
