import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { accountApi, ordersApi } from '../../services';
import Button from '../../../admin/components/Button';
import { Field, Input, Select } from '../../../admin/components/FormFields';
import { Container, PageTitle, StateBox } from '../ui';
import { useCart } from '../CartContext';
import { useCustomer } from '../../customer/CustomerAuthContext';
import useQuote from '../useQuote';
import { Totals } from './CartPage';
import { money, PAYMENT_LABEL, BANK_NOTE } from '../format';
import useTitle from '../useTitle';

const blank = { name: '', phone: '', email: '', line1: '', line2: '', city: '', postalCode: '' };

export default function CheckoutPage() {
  useTitle('Checkout');
  const navigate = useNavigate();
  const { items, couponCode, clear } = useCart();
  const { status, customer } = useCustomer();
  const { data: q, loading, error, reload } = useQuote(items, couponCode);
  const saved = useApi(() => (status === 'authed' ? accountApi.addresses() : Promise.resolve({ addresses: [] })), [status]);
  const [f, setF] = useState(blank);
  const [pay, setPay] = useState('COD');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const fill = (a) => setF((s) => ({ ...s, name: a.fullName || s.name, phone: a.phone || s.phone, line1: a.line1 || '', line2: a.line2 || '', city: a.city || '', postalCode: a.postalCode || '' }));
  useEffect(() => { // prefill once for signed-in shoppers: profile first, then their default address
    if (status !== 'authed' || !customer) return;
    setF((s) => ({ ...s, name: s.name || customer.name || '', phone: s.phone || customer.phone || '', email: s.email || customer.email || '' }));
  }, [status, customer]);
  useEffect(() => {
    const d = (saved.data?.addresses || []).find((a) => a.isDefault);
    if (d) fill(d);
  }, [saved.data]);

  const submit = async (e) => {
    e.preventDefault(); setErrors({}); setFormError('');
    setBusy(true);
    try {
      const { order } = await ordersApi.checkout({
        items, couponCode: couponCode || undefined, paymentMethod: pay,
        customer: { name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || undefined },
        shippingAddress: { fullName: f.name.trim(), phone: f.phone.trim(), line1: f.line1.trim(), line2: f.line2.trim() || undefined, city: f.city.trim(), postalCode: f.postalCode.trim() || undefined },
      });
      clear();
      navigate(`/order-success/${order.orderNumber}`, { replace: true, state: { order } });
    } catch (err) {
      const fe = {}; (err.details || []).forEach((d) => { fe[d.path] = d.message; });
      setErrors(fe);
      if (err.code === 'OUT_OF_STOCK' || err.code === 'ITEM_UNAVAILABLE') { setFormError(`${err.message} Please review your cart.`); reload(); }
      else setFormError(err.code === 'VALIDATION_ERROR' ? 'Please fix the highlighted fields.' : err.status === 429 ? 'Too many attempts. Please wait a few minutes.' : err.message);
    } finally { setBusy(false); }
  };

  if (items.length === 0) return <Container><div className="py-16 text-center space-y-4"><p className="text-ink-muted">Your cart is empty.</p><Link to="/shop"><Button>Browse perfumes</Button></Link></div></Container>;

  return (
    <Container>
      <PageTitle title="Checkout" />
      <StateBox loading={loading && !q} error={error} onRetry={reload}>
        {q && !q.canCheckout && <div className="rounded-md border border-border bg-warning-soft p-4 text-sm mb-6" role="alert">Some items in your cart need attention. <Link to="/cart" className="underline">Review your cart</Link></div>}
        {q && (
          <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_340px]" noValidate>
            <div className="space-y-8">
              {status !== 'authed' && <p className="text-sm text-ink-muted">Have an account? <Link to="/login" state={{ from: '/checkout' }} className="underline text-ink">Sign in</Link> to use your saved addresses and see this order in your account.</p>}

              <section className="space-y-4">
                <h2 className="font-display text-xl">Contact</h2>
                <Field label="Full name" error={errors['customer.name']}><Input required autoComplete="name" value={f.name} onChange={set('name')} error={errors['customer.name']} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone" error={errors['customer.phone']} hint="We call or message this number about your order."><Input required inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} placeholder="0300 1234567" error={errors['customer.phone']} /></Field>
                  <Field label="Email (optional)" error={errors['customer.email']}><Input type="email" autoComplete="email" value={f.email} onChange={set('email')} error={errors['customer.email']} /></Field>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="font-display text-xl">Delivery address</h2>
                {(saved.data?.addresses || []).length > 0 && (
                  <Field label="Use a saved address">
                    <Select defaultValue={(saved.data.addresses.find((a) => a.isDefault) || {}).id} onChange={(e) => { const a = saved.data.addresses.find((x) => x.id === e.target.value); if (a) fill(a); }}>
                      {saved.data.addresses.map((a) => <option key={a.id} value={a.id}>{a.type} — {a.line1}, {a.city}</option>)}
                    </Select>
                  </Field>
                )}
                <Field label="Address" error={errors['shippingAddress.line1']}><Input required autoComplete="address-line1" value={f.line1} onChange={set('line1')} placeholder="House, street, area" error={errors['shippingAddress.line1']} /></Field>
                <Field label="Apartment, landmark (optional)"><Input autoComplete="address-line2" value={f.line2} onChange={set('line2')} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="City" error={errors['shippingAddress.city']}><Input required autoComplete="address-level2" value={f.city} onChange={set('city')} error={errors['shippingAddress.city']} /></Field>
                  <Field label="Postal code (optional)"><Input autoComplete="postal-code" value={f.postalCode} onChange={set('postalCode')} /></Field>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="font-display text-xl">Payment</h2>
                {Object.entries(PAYMENT_LABEL).map(([k, label]) => (
                  <label key={k} className={`flex items-start gap-3 rounded-md border p-4 cursor-pointer ${pay === k ? 'border-gold bg-gold-soft' : 'border-border'}`}>
                    <input type="radio" name="pay" value={k} checked={pay === k} onChange={() => setPay(k)} className="mt-1 accent-[var(--gold)]" />
                    <span><span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-ink-muted mt-0.5">{k === 'COD' ? 'Pay in cash when your order arrives.' : BANK_NOTE}</span></span>
                  </label>
                ))}
              </section>
            </div>

            <aside className="rounded-md border border-border bg-surface p-5 h-fit space-y-5">
              <h2 className="font-display text-xl">Order summary</h2>
              <ul className="space-y-2 text-sm">{q.lines.map((l) => <li key={l.variantId} className="flex justify-between gap-3"><span className="text-ink-muted">{l.name} {l.label} × {l.quantity}</span><span className="tabular-nums">{l.status === 'unavailable' ? '—' : money(l.lineTotal)}</span></li>)}</ul>
              <Totals q={q} />
              {formError && <p role="alert" className="text-sm text-danger">{formError}</p>}
              <Button type="submit" className="w-full" disabled={busy || !q.canCheckout}>{busy ? 'Placing order…' : `Place order · ${money(q.total)}`}</Button>
              <p className="text-xs text-ink-muted">Final price and stock are confirmed by our server when you place the order.</p>
            </aside>
          </form>
        )}
      </StateBox>
    </Container>
  );
}
