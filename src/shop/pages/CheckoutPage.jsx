import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Truck, Sparkles, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
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
import useShopSettings from '../useShopSettings';

const blank = { name: '', phone: '', email: '', line1: '', line2: '', city: '', postalCode: '' };

const POPULAR_CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Peshawar', 'Multan', 'Sialkot'];

export default function CheckoutPage() {
  useTitle('Maison Checkout');
  const shop = useShopSettings();
  const navigate = useNavigate();
  const { items, couponCode, clear } = useCart();
  const { status, customer } = useCustomer();
  const saved = useApi(() => (status === 'authed' ? accountApi.addresses() : Promise.resolve({ addresses: [] })), [status]);
  const [f, setF] = useState(blank);
  const { data: q, loading, error, reload } = useQuote(items, couponCode, f.city); // delivery fee follows the typed city
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

  if (items.length === 0) {
    return (
      <Container className="py-20 text-center space-y-6 max-w-lg">
        <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 text-gold flex items-center justify-center mx-auto text-2xl font-serif">
          ✦
        </div>
        <h1 className="font-serif text-3xl text-ink">Your Fragrance Bag is Empty</h1>
        <p className="text-ink-muted text-sm leading-relaxed">
          Select from our curated extrait de parfum, oud elixirs, and bespoke coffrets to proceed to checkout.
        </p>
        <Link to="/shop" className="inline-block">
          <Button className="gold-gradient text-onyx font-semibold px-8 py-3">Explore Perfumes</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-8 md:py-12">
      {/* Editorial Header */}
      <div className="mb-8 border-b border-border/60 pb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold font-medium mb-1">
          <Lock className="w-3.5 h-3.5" />
          <span>256-Bit Encrypted Haute Parfumerie Checkout</span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-ink font-light tracking-tight">Express Consignment</h1>
      </div>

      <StateBox loading={loading && !q} error={error} onRetry={reload}>
        {q && !q.canCheckout && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm mb-8 flex items-center justify-between" role="alert">
            <span className="text-ink">Some items in your fragrance bag require attention or are no longer available.</span>
            <Link to="/cart" className="text-gold underline font-medium text-xs uppercase tracking-wider">Review Cart</Link>
          </div>
        )}

        {q && (
          <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_380px]" noValidate>
            <div className="space-y-10">
              {status !== 'authed' && (
                <div className="p-4 rounded-lg bg-surface/60 border border-border flex items-center justify-between text-xs text-ink-muted">
                  <span>Already an Afsana Member?</span>
                  <Link to="/login" state={{ from: '/checkout' }} className="text-gold font-medium hover:underline flex items-center gap-1">
                    Sign in to use saved addresses <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* 1. Contact Information */}
              <section className="p-6 md:p-8 rounded-xl bg-surface/50 border border-border/80 space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <span className="w-7 h-7 rounded-full bg-gold/15 border border-gold/40 text-gold text-xs font-serif flex items-center justify-center font-bold">1</span>
                  <h2 className="font-serif text-xl text-ink font-normal tracking-wide">Patron Details</h2>
                </div>

                <Field label="Full name" error={errors['customer.name']}>
                  <Input required autoComplete="name" value={f.name} onChange={set('name')} placeholder="e.g. Tariq Al-Mansoor" error={errors['customer.name']} />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Phone number" error={errors['customer.phone']} hint="Our logistics courier contacts this number upon dispatch.">
                    <Input required inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} placeholder="0300 1234567" error={errors['customer.phone']} />
                  </Field>
                  <Field label="Email address (for tracking receipt)" error={errors['customer.email']}>
                    <Input type="email" autoComplete="email" value={f.email} onChange={set('email')} placeholder="patron@example.com" error={errors['customer.email']} />
                  </Field>
                </div>
              </section>

              {/* 2. Delivery Address */}
              <section className="p-6 md:p-8 rounded-xl bg-surface/50 border border-border/80 space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <span className="w-7 h-7 rounded-full bg-gold/15 border border-gold/40 text-gold text-xs font-serif flex items-center justify-center font-bold">2</span>
                  <h2 className="font-serif text-xl text-ink font-normal tracking-wide">Delivery Address</h2>
                </div>

                {(saved.data?.addresses || []).length > 0 && (
                  <Field label="Use a saved destination address">
                    <Select defaultValue={(saved.data.addresses.find((a) => a.isDefault) || {}).id} onChange={(e) => { const a = saved.data.addresses.find((x) => x.id === e.target.value); if (a) fill(a); }}>
                      {saved.data.addresses.map((a) => <option key={a.id} value={a.id}>{a.type} — {a.line1}, {a.city}</option>)}
                    </Select>
                  </Field>
                )}

                <Field label="Street address" error={errors['shippingAddress.line1']}>
                  <Input required autoComplete="address-line1" value={f.line1} onChange={set('line1')} placeholder="House/Villa #, Street, Block, Phase" error={errors['shippingAddress.line1']} />
                </Field>

                <Field label="Apartment, suite, or landmark (optional)">
                  <Input autoComplete="address-line2" value={f.line2} onChange={set('line2')} placeholder="e.g. Near Crescent Point, Sector Y" />
                </Field>

                <div className="space-y-2">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="City" error={errors['shippingAddress.city']}>
                      <Input required autoComplete="address-level2" value={f.city} onChange={set('city')} placeholder="e.g. Lahore" error={errors['shippingAddress.city']} />
                    </Field>
                    <Field label="Postal code (optional)">
                      <Input autoComplete="postal-code" value={f.postalCode} onChange={set('postalCode')} placeholder="e.g. 54000" />
                    </Field>
                  </div>
                  
                  {/* Quick City selector chips */}
                  <div className="pt-2">
                    <p className="text-[11px] text-ink-muted uppercase tracking-wider mb-1.5">Frequent Destinations:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_CITIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setF((s) => ({ ...s, city: c }))}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                            f.city.toLowerCase() === c.toLowerCase()
                              ? 'border-gold bg-gold/15 text-gold font-medium'
                              : 'border-border/60 bg-bg text-ink-muted hover:border-gold/40 hover:text-ink'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Payment Method */}
              <section className="p-6 md:p-8 rounded-xl bg-surface/50 border border-border/80 space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <span className="w-7 h-7 rounded-full bg-gold/15 border border-gold/40 text-gold text-xs font-serif flex items-center justify-center font-bold">3</span>
                  <h2 className="font-serif text-xl text-ink font-normal tracking-wide">Settlement Method</h2>
                </div>

                <div className="grid gap-3">
                  {Object.entries(PAYMENT_LABEL).map(([k, label]) => {
                    const isSelected = pay === k;
                    return (
                      <label
                        key={k}
                        className={`flex items-start gap-4 rounded-xl border p-5 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-gold bg-gold/10 shadow-sm'
                            : 'border-border bg-surface/40 hover:border-border/80'
                        }`}
                      >
                        <input
                          type="radio"
                          name="pay"
                          value={k}
                          checked={isSelected}
                          onChange={() => setPay(k)}
                          className="mt-1 accent-[var(--gold)] w-4 h-4 cursor-pointer"
                        />
                        <div className="space-y-1">
                          <span className="block text-sm font-medium text-ink">{label}</span>
                          <span className="block text-xs text-ink-muted leading-relaxed">
                            {k === 'COD'
                              ? 'Inspect parcel seal and pay cash directly to the courier upon delivery.'
                              : (shop?.bank
                                  ? 'Transfer via online banking / Raast. Full account and IBAN details will be provided immediately.'
                                  : BANK_NOTE)}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Sidebar Summary */}
            <aside className="space-y-6">
              <div className="rounded-xl border border-border/80 bg-surface/80 p-6 space-y-6 sticky top-28 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <h2 className="font-serif text-xl text-ink font-light">Order Summary</h2>
                  <span className="text-xs text-ink-muted uppercase tracking-wider">{q.itemCount} Item{q.itemCount === 1 ? '' : 's'}</span>
                </div>

                <ul className="divide-y divide-border/40 max-h-72 overflow-y-auto pr-1">
                  {q.lines.map((l) => (
                    <li key={l.variantId} className="py-3 flex justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-ink truncate">{l.name}</p>
                        <p className="text-xs text-ink-muted">{l.label} × {l.quantity}</p>
                      </div>
                      <span className="tabular-nums font-medium shrink-0">
                        {l.status === 'unavailable' ? '—' : money(l.lineTotal)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <Totals q={q} />
                </div>

                {formError && (
                  <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger" role="alert">
                    {formError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full gold-gradient text-onyx font-bold tracking-wide py-3.5 shadow-lg shadow-gold/15"
                  disabled={busy || !q.canCheckout}
                >
                  {busy ? 'Securing Consignment…' : `Confirm Order · ${money(q.total)}`}
                </Button>

                {/* Trust Badges */}
                <div className="pt-4 border-t border-border/50 grid grid-cols-2 gap-3 text-[11px] text-ink-muted">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span>Courier Insured</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span>Maison Authentic</span>
                  </div>
                </div>
              </div>
            </aside>
          </form>
        )}
      </StateBox>
    </Container>
  );
}
