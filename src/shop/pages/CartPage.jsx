import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Headphones, ShieldCheck, ShoppingBag, Trash2, Truck, ArrowRight } from 'lucide-react';
import { Container, StateBox, QtyStepper, Placeholder } from '../ui';
import { useCart } from '../CartContext';
import useQuote from '../useQuote';
import { money, PAYMENT_LABEL } from '../format';
import useTitle from '../useTitle';

export function LineIssue({ line, onFix, onRemove }) {
  if (line.status === 'ok') return null;
  return (
    <p className="afsana-cart-line-issue" role="alert">
      {line.status === 'unavailable' && <>No longer available. <button type="button" onClick={onRemove}>Remove</button></>}
      {line.status === 'out_of_stock' && <>Sold out. <button type="button" onClick={onRemove}>Remove</button></>}
      {line.status === 'limited' && <>Only {line.available} left. <button type="button" onClick={() => onFix(line.available)}>Set to {line.available}</button></>}
    </p>
  );
}

export function Totals({ q }) {
  const row = (label, value, cls = '') => <div className={`flex justify-between text-sm ${cls}`}><span className="text-[#5f654f]">{label}</span><span>{value}</span></div>;
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
  useTitle('Shopping Cart');
  const { items, couponCode, setQty, remove, setCoupon, clear } = useCart();
  const { data: q, loading, error, reload } = useQuote(items, couponCode);
  const [code, setCode] = useState(couponCode);
  const itemCount = (q?.lines || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0);

  const applyCoupon = (event) => { event.preventDefault(); setCoupon(code); };
  const clearCart = () => { clear(); setCode(''); };

  return (
    <div className="afsana-cart-page">
      <div className="afsana-cart-title-band">
        <Container className="afsana-cart-title-inner">
          <h1>Shopping Cart</h1>
          <p><Link to="/">Home</Link><span>/</span> Shopping Cart</p>
        </Container>
      </div>

      <Container className="afsana-cart-content">
        {items.length === 0 ? (
          <div className="afsana-cart-empty">
            <span><ShoppingBag aria-hidden="true"/></span>
            <h2>Your bag is waiting</h2>
            <p>Discover a fragrance from the AFSANA collection and make it yours.</p>
            <Link to="/shop" className="afsana-cart-primary-link">Explore the collection <ArrowRight aria-hidden="true"/></Link>
          </div>
        ) : (
          <StateBox loading={loading && !q} error={error} onRetry={reload}>
            {q && (
              <div className="afsana-cart-layout">
                <section className="afsana-cart-main" aria-label="Shopping cart items">
                  <div className="afsana-cart-table-head" aria-hidden="true">
                    <span>Product</span><span>Price</span><span>Quantity</span><span>Subtotal</span>
                  </div>
                  <ul className="afsana-cart-lines">
                    {q.lines.map((line) => (
                      <li key={line.variantId} className="afsana-cart-row">
                        <button type="button" className="afsana-cart-remove" onClick={() => remove(line.variantId)} aria-label={`Remove ${line.name}`}><Trash2 aria-hidden="true"/></button>
                        <div className="afsana-cart-product">
                          <Link to={line.slug ? `/product/${line.slug}` : '/shop'} className="afsana-cart-product-image" aria-label={`View ${line.name}`}>
                            {line.image ? <img src={line.image} alt={line.name} loading="lazy"/> : <Placeholder className="h-full w-full"/>}
                          </Link>
                          <div className="afsana-cart-product-copy">
                            {line.slug ? <Link to={`/product/${line.slug}`} className="afsana-cart-product-name">{line.name}</Link> : <span className="afsana-cart-product-name">{line.name}</span>}
                            <span className="afsana-cart-product-variant">{line.label || 'AFSANA fragrance'}</span>
                            <LineIssue line={line} onFix={(n) => setQty(line.variantId, n)} onRemove={() => remove(line.variantId)}/>
                          </div>
                        </div>
                        <span className="afsana-cart-unit-price" data-label="Price">{line.status === 'unavailable' ? '—' : money(line.unitPrice)}</span>
                        <div className="afsana-cart-quantity" data-label="Quantity">
                          {line.status !== 'unavailable'
                            ? <QtyStepper value={line.quantity} max={line.available || line.quantity} onChange={(n) => setQty(line.variantId, n)} label={`Quantity for ${line.name}`}/>
                            : <span className="afsana-cart-unavailable">Unavailable</span>}
                        </div>
                        <strong className="afsana-cart-line-total" data-label="Subtotal">{line.status === 'unavailable' ? '—' : money(line.lineTotal)}</strong>
                      </li>
                    ))}
                  </ul>

                  <div className="afsana-cart-actions-row">
                    <form className="afsana-cart-coupon" onSubmit={applyCoupon}>
                      <label className="sr-only" htmlFor="afsana-cart-coupon">Coupon code</label>
                      <input id="afsana-cart-coupon" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Coupon code" autoComplete="off"/>
                      <button type="submit">Apply coupon</button>
                    </form>
                    <button type="button" className="afsana-cart-clear" onClick={clearCart}>Clear shopping cart</button>
                  </div>
                  {q.coupon && (
                    <p className={`afsana-cart-coupon-feedback ${q.coupon.valid ? 'is-valid' : 'is-invalid'}`} role={q.coupon.valid ? 'status' : 'alert'}>
                      {q.coupon.valid
                        ? <>Coupon {q.coupon.code} applied. <button type="button" onClick={() => { setCoupon(''); setCode(''); }}>Remove coupon</button></>
                        : q.coupon.message}
                    </p>
                  )}
                  {q.freeShippingRemaining > 0 && <p className="afsana-cart-shipping-hint">Add {money(q.freeShippingRemaining)} more to qualify for complimentary delivery.</p>}
                  <Link to="/shop" className="afsana-cart-continue">← Continue shopping</Link>
                </section>

                <aside className="afsana-cart-summary" aria-label="Order summary">
                  <h2>Order Summary</h2>
                  <div className="afsana-cart-summary-count"><span>Items</span><strong>{itemCount}</strong></div>
                  <dl className="afsana-cart-summary-lines">
                    <div><dt>Sub Total</dt><dd>{money(q.subtotal)}</dd></div>
                    <div><dt>Shipping</dt><dd>{q.shipping === 0 ? 'Complimentary' : money(q.shipping)}</dd></div>
                    {q.discount > 0 && <div className="is-discount"><dt>Coupon Discount</dt><dd>−{money(q.discount)}</dd></div>}
                  </dl>
                  <div className="afsana-cart-summary-total"><span>Total</span><strong>{money(q.total)}</strong></div>
                  <Link to="/checkout" className={`afsana-cart-checkout ${q.canCheckout ? '' : 'is-disabled'}`} aria-disabled={!q.canCheckout} onClick={(event) => { if (!q.canCheckout) event.preventDefault(); }}>
                    Proceed to Checkout <ArrowRight aria-hidden="true"/>
                  </Link>
                  {!q.canCheckout && <p className="afsana-cart-checkout-note">Please review the item availability messages before continuing.</p>}
                  <div className="afsana-cart-payments">
                    <strong>Payment Methods</strong>
                    <div>{Object.entries(PAYMENT_LABEL).map(([key, label]) => <span key={key}><CreditCard aria-hidden="true"/>{label}</span>)}</div>
                    <small>Your payment method is selected securely at checkout.</small>
                  </div>
                  <p className="afsana-cart-secure"><ShieldCheck aria-hidden="true"/> Final price and stock are confirmed securely at checkout.</p>
                </aside>
              </div>
            )}
          </StateBox>
        )}

        <div className="afsana-cart-benefits" aria-label="AFSANA service information">
          <div><span><Truck aria-hidden="true"/></span><p><strong>Delivery</strong><small>Delivery charges shown before you place your order.</small></p></div>
          <div><span><CreditCard aria-hidden="true"/></span><p><strong>Flexible Payment</strong><small>Cash on Delivery and Bank Transfer.</small></p></div>
          <div><span><Headphones aria-hidden="true"/></span><p><strong>AFSANA Support</strong><small>Need help? Contact our customer care team.</small></p></div>
        </div>
      </Container>
    </div>
  );
}
