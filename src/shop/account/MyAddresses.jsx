import { useState } from 'react';
import useApi from '../../hooks/useApi';
import { accountApi } from '../../services';
import Button from '../../../admin/components/Button';
import ConfirmDialog from '../../../admin/components/ConfirmDialog';
import { Field, Input, Select, Check } from '../../../admin/components/FormFields';
import { StateBox } from '../ui';

const blank = { type: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', postalCode: '', isDefault: false };

function AddressForm({ initial, onSaved, onCancel }) {
  const [f, setF] = useState({ ...blank, ...initial });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErrors({}); setError(''); setBusy(true);
    const body = { type: f.type, fullName: f.fullName.trim(), phone: f.phone.trim(), line1: f.line1.trim(), line2: f.line2?.trim() || undefined, city: f.city.trim(), postalCode: f.postalCode?.trim() || undefined, isDefault: !!f.isDefault };
    try { const r = initial?.id ? await accountApi.updateAddress(initial.id, body) : await accountApi.addAddress(body); onSaved(r.addresses); }
    catch (err) { const fe = {}; (err.details || []).forEach((d) => { fe[d.path] = d.message; }); setErrors(fe); setError(err.code === 'VALIDATION_ERROR' ? 'Please fix the highlighted fields.' : err.message); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] shadow-[0_18px_50px_rgba(24,35,8,.06)] p-5 space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName}><Input required value={f.fullName} onChange={set('fullName')} error={errors.fullName} /></Field>
        <Field label="Phone" error={errors.phone}><Input required inputMode="tel" value={f.phone} onChange={set('phone')} error={errors.phone} /></Field>
      </div>
      <Field label="Address" error={errors.line1}><Input required value={f.line1} onChange={set('line1')} error={errors.line1} /></Field>
      <Field label="Apartment, landmark (optional)"><Input value={f.line2 || ''} onChange={set('line2')} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" error={errors.city}><Input required value={f.city} onChange={set('city')} error={errors.city} /></Field>
        <Field label="Postal code"><Input value={f.postalCode || ''} onChange={set('postalCode')} /></Field>
        <Field label="Label"><Select value={f.type} onChange={set('type')}><option>Home</option><option>Office</option><option>Other</option></Select></Field>
      </div>
      <Check label="Use as my default address" checked={f.isDefault} onChange={(v) => setF({ ...f, isDefault: v })} />
      {error && <p role="alert" className="text-sm text-[#9b3f3f]">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-2"><Button type="submit" className="w-full sm:w-auto rounded-xl" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</Button><Button type="button" variant="ghost" className="w-full sm:w-auto rounded-xl" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}

export default function MyAddresses() {
  const { data, loading, error, reload } = useApi(() => accountApi.addresses(), []);
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | address
  const [del, setDel] = useState(null);
  const rows = list || data?.addresses || [];
  const saved = (a) => { setList(a); setEditing(null); };

  return (
    <StateBox loading={loading && !data} error={error} onRetry={reload}>
      <div className="space-y-4">
        {rows.length === 0 && !editing && <p className="text-sm text-[#5f654f]">You have no saved addresses yet.</p>}
        {rows.map((a) => (editing?.id === a.id
          ? <AddressForm key={a.id} initial={a} onSaved={saved} onCancel={() => setEditing(null)} />
          : (
            <div key={a.id} className="rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] shadow-[0_18px_50px_rgba(24,35,8,.06)] p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 text-sm">
              <div><p className="font-medium">{a.fullName} <span className="text-xs text-[#5f654f] font-normal">· {a.type}{a.isDefault ? ' · Default' : ''}</span></p><p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p><p>{a.city}{a.postalCode ? ` ${a.postalCode}` : ''}</p><p className="text-[#5f654f]">{a.phone}</p></div>
              <div className="flex flex-row sm:flex-col items-stretch sm:items-end gap-1"><Button variant="ghost" size="sm" className="w-full sm:w-auto rounded-xl" onClick={() => setEditing(a)}>Edit</Button><Button variant="ghost" size="sm" className="w-full sm:w-auto rounded-xl" onClick={() => setDel(a)}>Remove</Button></div>
            </div>
          )))}
        {editing === 'new' && <AddressForm onSaved={saved} onCancel={() => setEditing(null)} />}
        {!editing && rows.length < 10 && <Button variant="secondary" onClick={() => setEditing('new')}>Add an address</Button>}
      </div>
      <ConfirmDialog open={!!del} title="Remove this address?" message={del ? `${del.line1}, ${del.city}` : ''} confirmLabel="Remove" danger
        onClose={() => setDel(null)}
        onConfirm={async () => { try { const r = await accountApi.removeAddress(del.id); setList(r.addresses); setDel(null); } catch (err) { setDel(null); } }} />
    </StateBox>
  );
}
