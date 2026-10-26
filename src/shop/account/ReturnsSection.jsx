import { useState } from 'react';
import useApi from '../../hooks/useApi';
import { myReturnsApi } from '../../services';
import Button from '../../../admin/components/Button';
import StatusPill from '../../../admin/components/StatusPill';
import ConfirmDialog from '../../../admin/components/ConfirmDialog';
import { Field, Select, Textarea, Check } from '../../../admin/components/FormFields';
import { QtyStepper } from '../ui';
import { money, fmtDate } from '../format';

const REASONS = ['Wrong Product', 'Damaged', 'Not Satisfied', 'Other'];
const REASON_LABEL = { 'Wrong Product': 'I received the wrong product', Damaged: 'It arrived damaged', 'Not Satisfied': 'I am not satisfied with it', Other: 'Something else' };

// One returned request, as the shopper sees it (no staff notes, no costs).
export function ReturnCard({ r, onCancel }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4 text-sm space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-medium">{r.returnNumber}</p><p className="text-xs text-ink-muted">Requested {fmtDate(r.createdAt)} · Order {r.orderNumber}</p></div>
        <StatusPill status={r.status} />
      </div>
      <ul className="text-ink-muted">{r.items.map((i, k) => <li key={k}>{i.quantity} × {i.name}</li>)}</ul>
      {r.decisionNote && <p className="rounded-sm bg-bg border border-border px-3 py-2">{r.decisionNote}</p>}
      {r.status === 'Refunded' && <p className="text-success">Refunded {money(r.refundedAmount)}</p>}
      {r.status === 'Pending' && <p className="text-xs text-ink-muted">We will review your request and get back to you soon.</p>}
      {r.status === 'Approved' && <p className="text-xs text-ink-muted">Approved. Our team will contact you about sending the items back.</p>}
      {r.status === 'Received' && <p className="text-xs text-ink-muted">We have received your items. Your refund is being processed.</p>}
      {r.canCancel && onCancel && <Button variant="ghost" size="sm" onClick={() => onCancel(r)}>Cancel this return</Button>}
    </div>
  );
}

// Shown on the order page. Returns exist only for signed-in shoppers with a delivered order.
export default function ReturnsSection({ orderNumber, orderStatus, onChanged }) {
  const rel = ['Delivered', 'Return Requested', 'Returned', 'Refunded'].includes(orderStatus);
  const mine = useApi(() => (rel ? myReturnsApi.list({ orderNumber, limit: 20 }) : Promise.resolve(null)), [orderNumber, orderStatus]);
  const elig = useApi(() => (['Delivered', 'Return Requested'].includes(orderStatus) ? myReturnsApi.eligibility(orderNumber) : Promise.resolve(null)), [orderNumber, orderStatus]);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState({}); // orderItemId -> { on, qty }
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);

  if (!rel) return null;
  const e = elig.data;
  const returns = mine.data?.returns || [];
  const chosen = e ? e.lines.filter((l) => pick[l.orderItemId]?.on).map((l) => ({ orderItemId: l.orderItemId, quantity: pick[l.orderItemId].qty || 1 })) : [];
  const problem = !chosen.length ? 'Choose the items you want to return.' : !reason ? 'Tell us why you are returning them.' : reason === 'Other' && details.trim().length < 5 ? 'Please add a few words of detail.' : '';

  const refreshAll = async () => { await Promise.all([mine.reload(), elig.reload()]); onChanged?.(); };
  const submit = async (ev) => {
    ev.preventDefault();
    if (problem) { setError(problem); return; }
    setBusy(true); setError('');
    try {
      await myReturnsApi.create({ orderNumber, items: chosen, reason, details: details.trim() || undefined });
      setOpen(false); setPick({}); setReason(''); setDetails('');
      await refreshAll();
    } catch (err) { setError(err.details?.length ? err.details.map((d) => d.message).join(' ') : err.message); }
    finally { setBusy(false); }
  };

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl">Returns &amp; refunds</h2>
      {returns.map((r) => <ReturnCard key={r.returnNumber} r={r} onCancel={setCancelling} />)}

      {e && e.eligible && !open && (
        <div className="rounded-md border border-border bg-surface p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">Not happy with something? You can return items until {fmtDate(e.window.deadline)}.</p>
          <Button variant="secondary" size="sm" onClick={() => { setOpen(true); setError(''); }}>Request a return</Button>
        </div>
      )}
      {e && !e.eligible && orderStatus === 'Delivered' && returns.length === 0 && <p className="text-sm text-ink-muted">{e.message}</p>}

      {e && e.eligible && open && (
        <form onSubmit={submit} className="rounded-md border border-border bg-surface p-4 space-y-4">
          <p className="text-sm font-medium">Which items would you like to return?</p>
          <ul className="space-y-3">
            {e.lines.filter((l) => l.remaining > 0).map((l) => {
              const p = pick[l.orderItemId] || { on: false, qty: 1 };
              return (
                <li key={l.orderItemId} className="flex items-center justify-between gap-3">
                  <Check label={`${l.name} · ${money(l.unitPrice)}`} checked={p.on} onChange={(v) => setPick({ ...pick, [l.orderItemId]: { ...p, on: v } })} />
                  {p.on && l.remaining > 1 && <QtyStepper value={p.qty} max={l.remaining} onChange={(qty) => setPick({ ...pick, [l.orderItemId]: { ...p, qty } })} label={`Quantity of ${l.name}`} />}
                </li>
              );
            })}
          </ul>
          <Field label="Reason"><Select value={reason} onChange={(ev) => setReason(ev.target.value)}><option value="">Select a reason…</option>{REASONS.map((x) => <option key={x} value={x}>{REASON_LABEL[x]}</option>)}</Select></Field>
          <Field label="Details" hint={reason === 'Other' ? 'Required' : 'Optional — anything that helps us'}><Textarea rows={3} maxLength={500} value={details} onChange={(ev) => setDetails(ev.target.value)} /></Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send return request'}</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button></div>
        </form>
      )}

      {(mine.error || elig.error) && <p className="text-sm text-danger" role="alert">{(mine.error || elig.error).message}</p>}
      <ConfirmDialog open={Boolean(cancelling)} title="Cancel this return?" message="Your request will be withdrawn. You can send a new one later if you are still within the return period." confirmLabel="Cancel return" danger
        onClose={() => setCancelling(null)} onConfirm={async () => { await myReturnsApi.cancel(cancelling.returnNumber); await refreshAll(); }} />
    </section>
  );
}
