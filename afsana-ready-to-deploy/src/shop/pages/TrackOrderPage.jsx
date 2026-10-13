import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../../admin/components/Button';
import { Field, Input } from '../../../admin/components/FormFields';
import StatusPill from '../../../admin/components/StatusPill';
import { Container, PageTitle } from '../ui';
import { ordersApi } from '../../services';
import { fmtDateTime, PAYMENT_LABEL } from '../format';
import useTitle from '../useTitle';

export function Timeline({ events }) {
  return (
    <ol className="space-y-4 border-l border-border ml-2 pl-5">
      {(events || []).map((t, i) => (
        <li key={i} className="relative">
          <span className={`absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full ${i === events.length - 1 ? 'bg-gold' : 'bg-border'}`} />
          <p className="text-sm">{t.event}</p><p className="text-xs text-ink-muted">{fmtDateTime(t.at)}</p>
        </li>
      ))}
    </ol>
  );
}

export default function TrackOrderPage() {
  useTitle('Track your order');
  const [sp] = useSearchParams();
  const [f, setF] = useState({ order: sp.get('order') || '', phone: '' });
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setRes(null); setBusy(true);
    try { setRes((await ordersApi.track(f.order.trim().toUpperCase(), f.phone.trim())).order); }
    catch (err) { setError(err.status === 429 ? 'Too many attempts. Please wait a few minutes.' : err.message); }
    finally { setBusy(false); }
  };
  return (
    <Container className="max-w-xl">
      <PageTitle title="Track your order" subtitle="Enter your order number and the phone number you used at checkout." />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Order number"><Input required value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} placeholder="AFS-000123" /></Field>
        <Field label="Phone number"><Input required inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="0300 1234567" /></Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Checking…' : 'Track order'}</Button>
      </form>
      {res && (
        <div className="mt-8 rounded-md border border-border bg-surface p-5 space-y-5">
          <div className="flex items-center justify-between"><p className="font-display text-xl">{res.orderNumber}</p><StatusPill status={res.status} /></div>
          <p className="text-sm text-ink-muted">Payment: {res.paymentStatus}</p>
          <Timeline events={res.timeline} />
        </div>
      )}
    </Container>
  );
}
