import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Package, Truck, CheckCircle2, AlertCircle, ExternalLink, Calendar, MapPin } from 'lucide-react';
import Button from '../../../admin/components/Button';
import { Field, Input } from '../../../admin/components/FormFields';
import StatusPill from '../../../admin/components/StatusPill';
import { Container, PageTitle } from '../ui';
import { ordersApi } from '../../services';
import { fmtDateTime, PAYMENT_LABEL } from '../format';
import useTitle from '../useTitle';
import ShipmentInfo from '../ShipmentInfo';

export function Timeline({ events }) {
  if (!events || !events.length) return null;
  return (
    <ol className="space-y-4 border-l border-gold/40 ml-2 pl-6">
      {events.map((t, i) => {
        const isLatest = i === events.length - 1;
        return (
          <li key={i} className="relative group">
            <span
              className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-surface transition-all ${
                isLatest ? 'bg-gold shadow-md shadow-gold/40 scale-125' : 'bg-border'
              }`}
            />
            <p className={`text-sm font-medium ${isLatest ? 'text-ink' : 'text-ink-muted'}`}>
              {t.event}
            </p>
            <p className="text-xs text-ink-muted/80 mt-0.5">{fmtDateTime(t.at)}</p>
          </li>
        );
      })}
    </ol>
  );
}

const ORDER_STEPS = [
  { key: 'New', label: 'Order Confirmed' },
  { key: 'Packed', label: 'Artisan Packaged' },
  { key: 'Shipped', label: 'In Transit' },
  { key: 'Delivered', label: 'Delivered' },
];

export default function TrackOrderPage() {
  useTitle('Track Consignment');
  const [sp] = useSearchParams();
  const [f, setF] = useState({ order: sp.get('order') || '', phone: '' });
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setError('');
    setRes(null);
    setBusy(true);
    try {
      const data = await ordersApi.track(f.order.trim().toUpperCase(), f.phone.trim());
      setRes(data.order);
    } catch (err) {
      setError(err.status === 429 ? 'Too many tracking attempts. Please wait a moment.' : err.message || 'Order not found. Please verify your order number and phone.');
    } finally {
      setBusy(false);
    }
  };

  const getStepStatus = (stepKey, currentStatus) => {
    const statusOrder = ['New', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered'];
    const curIdx = statusOrder.indexOf(currentStatus);
    const stepIdx = statusOrder.indexOf(stepKey);
    if (curIdx >= stepIdx) return 'completed';
    return 'upcoming';
  };

  return (
    <Container className="max-w-2xl py-10 md:py-16">
      <div className="text-center space-y-3 mb-10">
        <p className="text-xs uppercase tracking-widest text-gold font-medium">Logistics & Consignments</p>
        <h1 className="font-serif text-3xl md:text-4xl text-ink font-light">Track Your Fragrance</h1>
        <p className="text-sm text-ink-muted max-w-md mx-auto">
          Enter your unique order identifier and the phone number provided at checkout to inspect real-time courier updates.
        </p>
      </div>

      {/* Lookup Form */}
      <div className="rounded-2xl border border-border/80 bg-surface/80 p-6 md:p-8 shadow-xl backdrop-blur-md mb-10">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Order identifier">
              <Input
                required
                value={f.order}
                onChange={(e) => setF({ ...f, order: e.target.value })}
                placeholder="AFS-000001"
                className="font-mono"
              />
            </Field>
            <Field label="Contact phone number">
              <Input
                required
                inputMode="tel"
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
                placeholder="0300 1234567"
              />
            </Field>
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-xs text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={busy || !f.order.trim() || !f.phone.trim()}
            className="w-full gold-gradient text-onyx font-bold tracking-wide py-3 flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>{busy ? 'Inspecting Registry…' : 'Locate Consignment'}</span>
          </Button>
        </form>
      </div>

      {/* Tracking Result View */}
      {res && (
        <div className="rounded-2xl border border-gold/30 bg-surface/90 p-6 md:p-8 space-y-8 shadow-2xl backdrop-blur-md animate-in fade-in">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border/60">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-gold font-medium">Consignment Identified</span>
              <h2 className="font-mono text-2xl font-bold text-ink">{res.orderNumber}</h2>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill status={res.status} />
            </div>
          </div>

          {/* Stepper overview */}
          <div className="grid grid-cols-4 gap-2 text-center pt-2">
            {ORDER_STEPS.map((s, idx) => {
              const state = getStepStatus(s.key, res.status);
              const isDone = state === 'completed';
              return (
                <div key={s.key} className="space-y-2">
                  <div className={`h-1.5 rounded-full transition-all ${isDone ? 'bg-gold' : 'bg-border'}`} />
                  <p className={`text-[11px] leading-tight font-medium ${isDone ? 'text-ink font-semibold' : 'text-ink-muted'}`}>
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Shipment & Courier Card */}
          <ShipmentInfo shipment={res.shipment} />

          {/* Timeline Events */}
          <div className="space-y-4 pt-2 border-t border-border/50">
            <h3 className="font-serif text-lg text-ink font-medium">Consignment Ledger & Events</h3>
            <Timeline events={res.timeline} />
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-border/40 text-center text-xs text-ink-muted">
            Questions regarding delivery? Contact Afsana Concierge via WhatsApp at <span className="text-gold font-medium">+92 (300) 841-2900</span>
          </div>
        </div>
      )}
    </Container>
  );
}
