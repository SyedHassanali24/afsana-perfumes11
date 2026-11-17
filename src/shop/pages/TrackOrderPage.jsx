import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, Check, CircleCheck, Clock3, Package, PackageCheck, Truck } from 'lucide-react';
import { Field, Input } from '../../../admin/components/FormFields';
import Button from '../../../admin/components/Button';
import { Container } from '../ui';
import { ordersApi } from '../../services';
import { fmtDateTime } from '../format';
import useTitle from '../useTitle';

const ORDER_STEPS = [
  { label: 'Order Placed', statuses: ['New'], Icon: Package },
  { label: 'Accepted', statuses: ['Confirmed'], Icon: BadgeCheck },
  { label: 'In Progress', statuses: ['Processing', 'Packed'], Icon: Clock3 },
  { label: 'On the Way', statuses: ['Shipped', 'Out For Delivery'], Icon: Truck },
  { label: 'Delivered', statuses: ['Delivered'], Icon: PackageCheck },
];

const STATUS_STEP = {
  New: 0,
  Confirmed: 1,
  Processing: 2,
  Packed: 2,
  Shipped: 3,
  'Out For Delivery': 3,
  Delivered: 4,
  'Return Requested': 4,
  Returned: 4,
  Refunded: 4,
};

const TERMINAL_STATUSES = ['Cancelled', 'Returned', 'Refunded', 'Return Requested'];

function milestoneEvent(events, statuses) {
  return [...(events || [])].reverse().find((event) => statuses.includes(event.status)) || null;
}

function formatStepTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
}

export function Timeline({ events }) {
  return (
    <ol className='space-y-4 border-l border-[#263e0e]/10 ml-2 pl-5'>
      {(events || []).map((t, i) => (
        <li key={i} className='relative'>
          <span className={'absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full ' + (i === events.length - 1 ? 'bg-[#263e0e]' : 'bg-[#263e0e]/10')} />
          <p className='text-sm'>{t.event}</p><p className='text-xs text-[#5f654f]'>{fmtDateTime(t.at)}</p>
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
  const [showLookup, setShowLookup] = useState(true);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setRes(null);
    setBusy(true);
    try {
      const result = (await ordersApi.track(f.order.trim().toUpperCase(), f.phone.trim())).order;
      setRes(result);
      setShowLookup(false);
    } catch (err) {
      setError(err.status === 429 ? 'Too many attempts. Please wait a few minutes.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  const status = res?.status || '';
  const isTerminal = TERMINAL_STATUSES.includes(status);
  const currentStep = STATUS_STEP[status] ?? -1;
  const items = Array.isArray(res?.items) ? res.items : [];
  const unitCount = items.reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0);
  const shipment = res?.shipment;
  const safeTrackingUrl = typeof shipment?.trackingUrl === 'string' && /^https:\/\//i.test(shipment.trackingUrl);

  return (
    <div className='afsana-track-page bg-[#faf9fc] pb-16'>
      <section
        className='relative isolate overflow-hidden border-b border-[#100d24]/[0.06]'
        style={{ background: 'radial-gradient(circle at 18% 20%, rgba(115,87,255,.13), transparent 34%), radial-gradient(circle at 84% 70%, rgba(115,87,255,.08), transparent 30%), linear-gradient(110deg, #f3f1f8, #faf9fc 58%, #f4f2f8)' }}
      >
        <Container className='py-14 text-center sm:py-20'>
          <p className='text-[9px] font-semibold uppercase tracking-[.3em] text-[#7357ff]'>AFSANA · THE ART OF SCENT</p>
          <h1 className='mt-3 font-display text-3xl leading-tight text-[#100d24] sm:text-5xl'>Track Your Order</h1>
          <div className='mt-4 flex items-center justify-center gap-2 text-[11px] text-[#777184]'>
            <Link to='/' className='transition hover:text-[#7357ff]'>Home</Link>
            <span>/</span>
            <span className='text-[#100d24]'>Track Your Order</span>
          </div>
        </Container>
      </section>

      <Container className='max-w-5xl pt-8 sm:pt-10'>
        <div className='mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
          <div>
            <p className='text-sm font-semibold tracking-wide text-[#100d24]'>Order Status</p>
            {res
              ? <p className='mt-1 text-xs text-[#777184]'>Order ID: <span className='font-medium text-[#252135]'>{res.orderNumber}</span>{res.placedAt ? ' · Placed ' + fmtDateTime(res.placedAt) : ''}</p>
              : <p className='mt-1 text-xs text-[#777184]'>Enter your order number and checkout phone number to view its progress.</p>}
          </div>
          {res && (
            <div className='flex flex-wrap items-center gap-2'>
              <span className={'rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] ' + (status === 'Delivered' ? 'bg-[#e9e5fb] text-[#5940bd]' : isTerminal ? 'bg-[#f8e8eb] text-[#9d4657]' : 'bg-[#eeeafd] text-[#644bd1]')}>
                {status}
              </span>
              <button type='button' onClick={() => { setShowLookup((value) => !value); setError(''); }} className='rounded-full border border-[#7357ff]/25 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.1em] text-[#644bd1] transition hover:bg-[#eeeafd]'>
                {showLookup ? 'Close lookup' : 'Track another order'}
              </button>
            </div>
          )}
        </div>

        {showLookup && (
          <form onSubmit={submit} className='mb-6 grid gap-4 rounded-2xl border border-[#7357ff]/15 bg-white p-5 shadow-[0_15px_45px_rgba(31,23,65,.045)] sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6'>
            <Field label='Order number'>
              <Input required value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} placeholder='AFS-000123' autoComplete='off' />
            </Field>
            <Field label='Phone number used at checkout'>
              <Input required inputMode='tel' value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder='03XX XXXXXXX' autoComplete='tel' />
            </Field>
            <Button type='submit' className='min-h-11 w-full rounded-full sm:w-auto' disabled={busy}>
              {busy ? 'Checking…' : 'Track order'}
            </Button>
            {error && <p role='alert' className='text-sm text-[#a33c53] sm:col-span-3'>{error}</p>}
          </form>
        )}

        {res && (
          <div className='space-y-5'>
            {isTerminal && (
              <div role='status' className='rounded-xl border border-[#7357ff]/15 bg-[#f0edfb] px-4 py-3 text-sm text-[#45348f]'>
                {status === 'Cancelled' && 'This order has been cancelled. Contact AFSANA customer care if you need assistance.'}
                {status === 'Return Requested' && 'A return request has been recorded for this order.'}
                {status === 'Returned' && 'This order has been returned.'}
                {status === 'Refunded' && 'This order has been refunded.'}
              </div>
            )}

            <section className='overflow-hidden rounded-2xl border border-[#7357ff]/15 bg-white p-5 shadow-[0_15px_45px_rgba(31,23,65,.045)] sm:p-7'>
              <div className='mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <h2 className='font-display text-lg text-[#100d24] sm:text-xl'>Your order journey</h2>
                  <p className='mt-1 text-xs text-[#898398]'>Live progress from order placement to delivery</p>
                </div>
                <p className='text-xs text-[#777184]'>Payment: <span className='font-medium text-[#352e4d]'>{res.paymentStatus || 'Pending'}</span></p>
              </div>

              <div className='overflow-x-auto pb-2'>
                <ol className='flex min-w-[650px] items-start'>
                  {ORDER_STEPS.map((step, index) => {
                    const done = !isTerminal && currentStep >= index;
                    const current = !isTerminal && currentStep === index;
                    const event = milestoneEvent(res.timeline, step.statuses);
                    const Icon = step.Icon;
                    const time = event?.at ? formatStepTime(event.at) : '';
                    return (
                      <li key={step.label} className='relative flex min-w-0 flex-1 flex-col items-center text-center'>
                        {index < ORDER_STEPS.length - 1 && <span className={'absolute left-1/2 top-5 h-[2px] w-full ' + (done && currentStep > index ? 'bg-[#7357ff]' : 'bg-[#e9e6f0]')} />}
                        <span className={'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border ' + (done ? 'border-[#7357ff] bg-[#7357ff] text-white' : 'border-[#ded9eb] bg-[#faf9fc] text-[#a39db3]')}>
                          {done ? <Check className='h-4 w-4' strokeWidth={2.5} /> : <Icon className='h-4 w-4' />}
                        </span>
                        <span className={'mt-3 text-[11px] font-semibold ' + (current ? 'text-[#644bd1]' : done ? 'text-[#252135]' : 'text-[#9892a5]')}>{step.label}</span>
                        <span className='mt-1 px-1 text-[10px] leading-4 text-[#898398]'>{time || (done ? 'Completed' : 'Awaiting update')}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {!shipment && status !== 'Delivered' && status !== 'Cancelled' && (
                <div className='mt-5 flex gap-3 rounded-xl bg-[#f7f5fb] p-4'>
                  <Clock3 className='mt-0.5 h-4 w-4 shrink-0 text-[#7357ff]' />
                  <p className='text-xs leading-5 text-[#777184]'>Courier and delivery updates will appear here once your parcel is handed over for dispatch. An estimated delivery date will be shown when the courier estimate is available.</p>
                </div>
              )}
            </section>

            {shipment && (
              <section className='grid gap-3 rounded-2xl border border-[#7357ff]/15 bg-white p-5 shadow-[0_15px_45px_rgba(31,23,65,.045)] sm:grid-cols-3 sm:p-6'>
                <div>
                  <p className='text-[9px] font-semibold uppercase tracking-[.18em] text-[#9892a5]'>Courier</p>
                  <p className='mt-1 text-sm font-medium text-[#252135]'>{shipment.courier || 'Assigned courier'}</p>
                </div>
                <div>
                  <p className='text-[9px] font-semibold uppercase tracking-[.18em] text-[#9892a5]'>Tracking number</p>
                  <p className='mt-1 text-sm font-medium text-[#252135]'>{shipment.trackingNumber || 'Not available yet'}</p>
                </div>
                <div>
                  <p className='text-[9px] font-semibold uppercase tracking-[.18em] text-[#9892a5]'>Delivery status</p>
                  <div className='mt-1 flex items-center gap-2 text-sm font-medium text-[#644bd1]'>
                    <CircleCheck className='h-4 w-4' />{shipment.status}
                  </div>
                  {safeTrackingUrl && <a href={shipment.trackingUrl} target='_blank' rel='noopener noreferrer' className='mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#644bd1] hover:underline'>Track with courier ↗</a>}
                </div>
              </section>
            )}

            <section className='overflow-hidden rounded-2xl border border-[#7357ff]/15 bg-white shadow-[0_15px_45px_rgba(31,23,65,.045)]'>
              <div className='flex items-center justify-between border-b border-[#eeeaf4] px-5 py-4 sm:px-6'>
                <h2 className='font-display text-lg text-[#100d24]'>Fragrances in this order</h2>
                <span className='text-[10px] uppercase tracking-[.12em] text-[#898398]'>{unitCount} {unitCount === 1 ? 'item' : 'items'}</span>
              </div>
              {items.length ? (
                <ul className='divide-y divide-[#eeeaf4]'>
                  {items.map((item, index) => {
                    const imageUrl = typeof item.image === 'string' && (/^https?:\/\//i.test(item.image) || item.image.startsWith('/')) ? item.image : '';
                    return (
                      <li key={item.id || index} className='flex items-center gap-4 px-5 py-4 sm:px-6'>
                        <div className='flex h-[68px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#eeeaf4] bg-[#f7f5fb]'>
                          {imageUrl
                            ? <img src={imageUrl} alt={item.name || 'AFSANA fragrance'} loading='lazy' className='h-full w-full object-cover' />
                            : <span className='font-display text-sm tracking-[.16em] text-[#7357ff]'>A.</span>}
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='text-sm font-medium text-[#252135]'>{item.name || 'AFSANA fragrance'}</p>
                          <p className='mt-1 text-xs text-[#898398]'>Quantity: {item.quantity || 1}</p>
                        </div>
                        <span className='rounded-full bg-[#f0edfb] px-3 py-1 text-[10px] font-medium text-[#644bd1]'>× {item.quantity || 1}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className='px-5 py-6 text-sm text-[#898398] sm:px-6'>Product details are not available for this order.</p>
              )}
            </section>

            <div className='flex flex-col gap-2 px-1 text-center text-xs text-[#898398] sm:flex-row sm:items-center sm:justify-between sm:text-left'>
              <span>Need help with your order?</span>
              <Link to='/about' className='font-semibold text-[#644bd1] hover:underline'>Contact AFSANA customer care ↗</Link>
            </div>
          </div>
        )}

        {!res && !showLookup && (
          <div className='rounded-2xl border border-[#7357ff]/15 bg-white p-8 text-center text-sm text-[#777184]'>
            Enter your order details to view its delivery progress.
          </div>
        )}
      </Container>
    </div>
  );
}
