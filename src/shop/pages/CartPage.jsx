import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import Button from '../../../admin/components/Button';
import { Input } from '../../../admin/components/FormFields';
import { Container, PageTitle, StateBox, QtyStepper, Placeholder } from '../ui';
import { useCart } from '../CartContext';
import useQuote from '../useQuote';
import { money } from '../format';
import useTitle from '../useTitle';

export function LineIssue({ line, onFix, onRemove }) {
  if (line.status === 'ok') return null;
  return (
    <p className="text-xs text-[#9b3f3f] mt-1" role="alert">
      {line.status === 'unavailable' && <>No longer available. <button type="button" className="underline" onClick={onRemove}>Remove</button></>}
      {line.status === 'out_of_stock' && <>Sold out. <button type="button" className="underline" onClick={onRemove}>Remove</button></>}
      {line.status === 'limited' && <>Only {line.available} left. <button type="button" className="underline" onClick={() => onFix(line.available)}>Set to {line.available}</button></>}
    </p>
  );
}

export function Totals({ q }) {
  const row = (l, v, cls = '') => <div className={`flex justify-between text-sm ${cls}`}><span className="text-[#5f654f]">{l}</span><span>{v}</span></div>;
  return (
    <div className="space-y-2">
      {row('Subtotal', money(q.subtotal))}
      {q.discount > 0 && row('Discount', `− ${money(q.discount)}`, 'text-[#3d6b3d]')}
      {row('Delivery', q.shipping === 0 ? 'Free' : money(q.shipping))}
      {q.delivery?.estDays && <p className="text-xs text-[#5f654f]">Estimated delivery: {q.delivery.estDays}.</p>}
      {q.freeShippingRemaining > 0 && <p className="text-xs text-[#5f654f]">Add {money(q.freeShippingRemaining)} more for free delivery.</p>}
      <div className="flex justify-between pt-4 border-t border-[#263e0e]/10 font-display text-2xl text-[#263e0e]"><span>Total</span><span>{money(q.total)}</span></div>
    </div>
  );
}

export default function CartPage() {
  useTitle('Your cart');
  const { items, couponCode, setQty, remove, setCoupon } = useCart();
  const { data: q, loading, error, reload } = useQuote(items, couponCode);
  const [code, setCode] = useState(couponCode);

  return (
    <Container className="pb-12">
      <PageTitle title="Your cart" subtitle="Review your fragrances before you checkout." />
      {items.length === 0 ? (
        <div className="py-20 text-center space-y-5"><p className="text-[#5f654f]">Your cart is empty.</p><Link to="/shop"><Button>Browse perfumes</Button></Link></div>
      ) : (
        <StateBox loading={loading && !q} error={error} onRetry={reload}>
          {q && (
            <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_340px]">
              <ul className="divide-y divide-[#263e0e]/10 rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] shadow-[0_18px_50px_rgba(24,35,8,.06)] overflow-hidden">
                {q.lines.map((l) => (
                  <li key={l.variantId} className="flex gap-3 sm:gap-4 p-4 sm:p-5">
                    <div className="w-16 h-20 sm:w-20 sm:h-24 shrink-0 rounded-xl overflow-hidden border border-[#263e0e]/10 bg-[#faf8f4] shadow-[0_18px_50px_rgba(24,35,8,.06)]">{l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <Placeholder className="w-full h-full" />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-3">
                        <div className="min-w-0">
                          {l.slug ? <Link to={`/product/${l.slug}`} className="font-display text-base sm:text-lg leading-snug hover:text-[#263e0e]">{l.name}</Link> : <p className="font-display text-base sm:text-lg">{l.name}</p>}
                          {l.label && <p className="text-sm text-[#5f654f]">{l.label} · {money(l.unitPrice)}</p>}
                        </div>
                        <p className="text-sm tabular-nums">{l.status === 'unavailable' ? '' : money(l.lineTotal)}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        {l.status !== 'unavailable' && <QtyStepper value={l.quantity} max={l.available || l.quantity} onChange={(n) => setQty(l.variantId, n)} label={`Quantity for ${l.name}`} />}
                        <button type="button" onClick={() => remove(l.variantId)} className="p-2 text-[#5f654f] hover:text-[#9b3f3f]" aria-label={`Remove ${l.name}`}><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <LineIssue line={l} onFix={(n) => setQty(l.variantId, n)} onRemove={() => remove(l.variantId)} />
                    </div>
                  </li>
                ))}
              </ul>

              <aside className="rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] p-5 sm:p-6 h-fit space-y-5 shadow-[0_18px_50px_rgba(24,35,8,.06)] lg:sticky lg:top-24">
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setCoupon(code); }}>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" aria-label="Coupon code" />
                  <Button type="submit" variant="secondary" className="rounded-xl">Apply</Button>
                </form>
                {q.coupon && (q.coupon.valid
                  ? <p className="text-xs text-[#3d6b3d] -mt-3">Coupon {q.coupon.code} applied. <button type="button" className="underline" onClick={() => { setCoupon(''); setCode(''); }}>Remove</button></p>
                  : <p className="text-xs text-[#9b3f3f] -mt-3" role="alert">{q.coupon.message}</p>)}
                <Totals q={q} />
                {q.canCheckout ? <Link to="/checkout" className="block"><Button className="w-full rounded-xl">Checkout</Button></Link> : <Button className="w-full rounded-xl" disabled>Checkout</Button>}
                {!q.canCheckout && <p className="text-xs text-[#5f654f]">Please fix the items marked above to continue.</p>}
              </aside>
            </div>
          )}
        </StateBox>
      )}
    </Container>
  );
}
