import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { accountApi } from '../../services';
import StatusPill from '../../../admin/components/StatusPill';
import Button from '../../../admin/components/Button';
import { Container, StateBox, Placeholder } from '../ui';
import { Timeline } from '../pages/TrackOrderPage';
import { money, fmtDate, PAYMENT_LABEL } from '../format';
import useTitle from '../useTitle';
import ShipmentInfo from '../ShipmentInfo';
import ReturnsSection from './ReturnsSection';
import { useCart } from '../CartContext';

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  useTitle(orderNumber);
  const { data, loading, error, reload } = useApi(() => accountApi.order(orderNumber), [orderNumber]);
  const o = data?.order;
  const a = o?.shippingAddress || {};
  const cancelOrder = async () => {
    if (!o || o.status !== 'New' || !window.confirm(`Cancel order ${o.orderNumber}? This cannot be undone.`)) return;
    setActionBusy(true); setActionError('');
    try { await accountApi.cancelOrder(o.orderNumber); await reload(); }
    catch (err) { setActionError(err.message || 'Could not cancel this order. Please refresh and try again.'); }
    finally { setActionBusy(false); }
  };
  const reorder = () => {
    const items = (o?.items || []).filter((item) => item.variantId);
    if (!items.length) { setActionError('These items cannot be added to the cart. Please shop for them again.'); return; }
    items.forEach((item) => add(String(item.variantId), item.quantity));
    navigate('/cart');
  };
  return (
    <Container className="max-w-4xl pb-12">
      <Link to="/account" className="text-sm text-[#5f654f] hover:text-[#182308]">← All orders</Link>
      <StateBox loading={loading} error={error?.status === 404 ? { message: 'We could not find this order in your account.' } : error} onRetry={reload}>
        {o && (
          <div className="mt-4 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div><h1 className="font-display text-3xl">{o.orderNumber}</h1><p className="text-sm text-[#5f654f]">Placed {fmtDate(o.placedAt)}</p></div>
              <StatusPill status={o.status} />
            </div>
            {actionError && <p role="alert" className="rounded-xl border border-[#9b3f3f]/30 bg-[#9b3f3f]/10 p-3 text-sm text-[#9b3f3f]">{actionError}</p>}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Button type="button" variant="secondary" className="w-full sm:w-auto rounded-xl" onClick={reorder}>Reorder these items</Button>
              {o.status === 'New' && <Button type="button" variant="danger" className="w-full sm:w-auto rounded-xl" disabled={actionBusy} onClick={cancelOrder}>{actionBusy ? 'Cancelling…' : 'Cancel order'}</Button>}
            </div>
            <ul className="divide-y divide-[#263e0e]/10 rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] shadow-[0_18px_50px_rgba(24,35,8,.06)]">
              {o.items.map((it, i) => (
                <li key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4">
                  <div className="w-14 h-16 rounded-xl overflow-hidden border border-[#263e0e]/10 bg-[#f3f1e9] shrink-0">{it.image ? <img src={it.image} alt="" className="w-full h-full object-cover" /> : <Placeholder className="w-full h-full" />}</div>
                  <div className="flex-1 text-sm"><p>{it.name}</p><p className="text-[#5f654f]">{money(it.unitPrice)} × {it.quantity}</p></div>
                  <p className="text-sm tabular-nums sm:ml-auto">{money(it.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] shadow-[0_18px_50px_rgba(24,35,8,.06)] p-4 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-[#5f654f]">Subtotal</span><span>{money(o.subtotal)}</span></div>
                {o.discount > 0 && <div className="flex justify-between text-[#3d6b3d]"><span>Discount{o.couponCode ? ` (${o.couponCode})` : ''}</span><span>− {money(o.discount)}</span></div>}
                <div className="flex justify-between"><span className="text-[#5f654f]">Delivery</span><span>{o.shipping ? money(o.shipping) : 'Free'}</span></div>
                <div className="flex justify-between pt-2 border-t border-[#263e0e]/10 font-medium"><span>Total</span><span>{money(o.total)}</span></div>
                <p className="text-xs text-[#5f654f] pt-1">{PAYMENT_LABEL[o.paymentMethod] || o.paymentMethod} · Payment {o.paymentStatus.toLowerCase()}</p>
              </div>
              <div className="rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] shadow-[0_18px_50px_rgba(24,35,8,.06)] p-4 text-sm">
                <p className="text-[#5f654f] mb-1">Delivering to</p>
                <p>{a.fullName}</p><p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p><p>{a.city}{a.postalCode ? ` ${a.postalCode}` : ''}</p><p className="text-[#5f654f]">{a.phone}</p>
              </div>
            </div>
            <ReturnsSection orderNumber={o.orderNumber} orderStatus={o.status} onChanged={reload} />
            <ShipmentInfo shipment={o.shipment} />
            <div><h2 className="font-display text-xl mb-4">Progress</h2><Timeline events={o.timeline} /></div>
          </div>
        )}
      </StateBox>
    </Container>
  );
}
