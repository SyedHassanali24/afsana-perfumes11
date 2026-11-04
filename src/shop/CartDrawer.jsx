import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ShoppingBag, ArrowRight, Trash2, Plus, Minus, Tag, Check, Sparkles, Truck } from 'lucide-react';
import { useCart } from './CartContext';
import useQuote from './useQuote';
import { money } from './format';
import { useCmsPageCopy } from './cmsCopy';

export default function CartDrawer() {
  const copy = useCmsPageCopy('cart_before');
  const t = (key) => copy[key];
  const { drawerOpen, closeDrawer, items, count, setQty, remove, couponCode, setCoupon } = useCart();
  const { data: quoteData } = useQuote(items, couponCode);
  const quote = quoteData || { lines: [], subtotal: 0, discount: 0, shipping: 0, total: 0 };
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');

  useEffect(() => {
    setCouponInput(couponCode || '');
  }, [couponCode]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeDrawer();
    };
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKey);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  const freeThreshold = 7500;
  const subtotal = quote.subtotal || 0;
  const progressPct = Math.min(100, Math.round((subtotal / freeThreshold) * 100));
  const remainingForFree = Math.max(0, freeThreshold - subtotal);

  const applyCoupon = (e) => {
    e.preventDefault();
    if (!couponInput.trim()) {
      setCoupon('');
      return;
    }
    setCoupon(couponInput.trim().toUpperCase());
  };

  return (
    <div className="afsana-cart-overlay fixed inset-0 z-[70] flex justify-end" aria-label={t("drawerHeading")}>
      <button type="button" className="afsana-cart-backdrop fixed inset-0" onClick={closeDrawer} aria-label={t("closeBag")}/>
      <aside className="afsana-cart-drawer relative z-10 flex h-full w-full flex-col" role="dialog" aria-modal="true" aria-label={t("drawerHeading")}>
        <header className="afsana-cart-header">
          <div className="flex min-w-0 items-center gap-4">
            <span className="afsana-cart-header-icon"><ShoppingBag aria-hidden="true"/></span>
            <div className="min-w-0">
              <h2>{t("drawerHeading")}</h2>
              <p>{count} {count === 1 ? t('fragranceSingular') : t('fragrancePlural')}</p>
            </div>
          </div>
          <button type="button" className="afsana-cart-close" onClick={closeDrawer} aria-label="Close shopping bag">
            <X aria-hidden="true"/>
          </button>
        </header>

        {items.length > 0 && (
          <section className="afsana-cart-shipping" aria-label="Free shipping progress">
            <div className="afsana-cart-shipping-heading">
              {remainingForFree > 0 ? (
                <p>Add <strong>{money(remainingForFree)}</strong> {t("freeShippingPrompt")}</p>
              ) : (
                <p className="afsana-cart-shipping-unlocked"><Sparkles aria-hidden="true"/> {t("freeShippingUnlocked")}</p>
              )}
              <span>{progressPct}%</span>
            </div>
            <div className="afsana-cart-progress-track" role="progressbar" aria-valuenow={progressPct} aria-valuemin="0" aria-valuemax="100" aria-label="Free shipping progress">
              <span style={{ width: `${progressPct}%` }}/>
            </div>
            <div className="afsana-cart-shipping-foot"><Truck aria-hidden="true"/> {t("freeShippingFoot")}</div>
          </section>
        )}

        <div className="afsana-cart-items">
          {items.length === 0 ? (
            <div className="afsana-cart-empty">
              <span className="afsana-cart-empty-icon"><ShoppingBag aria-hidden="true"/></span>
              <h3>{t("drawerEmptyTitle")}</h3>
              <p>{t("drawerEmptyDescription")}</p>
              <button type="button" onClick={() => { closeDrawer(); navigate('/shop'); }}>{t("drawerExplore")} <ArrowRight aria-hidden="true"/></button>
            </div>
          ) : quote.lines.map((line) => {
            const item = items.find((i) => i.variantId === line.variantId);
            const qty = item?.quantity || 1;
            return (
              <article key={line.variantId} className="afsana-cart-item">
                <Link to={`/product/${line.slug}`} onClick={closeDrawer} className="afsana-cart-product-image" aria-label={`View ${line.name}`}>
                  {line.image?.url ? <img src={line.image.url} alt={line.name}/> : <span>AFSANA</span>}
                </Link>
                <div className="afsana-cart-product-details">
                  <div className="afsana-cart-product-top">
                    <div className="min-w-0">
                      <Link to={`/product/${line.slug}`} onClick={closeDrawer} className="afsana-cart-product-name">{line.name}</Link>
                      <p className="afsana-cart-product-meta">{line.label} <span>·</span> {line.concentration || 'Extrait de Parfum'}</p>
                    </div>
                    <button type="button" onClick={() => remove(line.variantId)} className="afsana-cart-remove" aria-label={`Remove ${line.name}`} title={t("drawerRemove")}>
                      <Trash2 aria-hidden="true"/><span>{t("drawerRemove")}</span>
                    </button>
                  </div>
                  <div className="afsana-cart-product-bottom">
                    <div className="afsana-cart-quantity" aria-label={`Quantity for ${line.name}`}>
                      <button type="button" onClick={() => setQty(line.variantId, Math.max(1, qty - 1))} disabled={qty <= 1} aria-label={t("decreaseQuantity")}><Minus aria-hidden="true"/></button>
                      <span aria-live="polite">{qty}</span>
                      <button type="button" onClick={() => setQty(line.variantId, qty + 1)} aria-label={t("increaseQuantity")}><Plus aria-hidden="true"/></button>
                    </div>
                    <div className="afsana-cart-price">
                      <strong>{money(line.lineTotal)}</strong>
                      {qty > 1 && <span>{money(line.unitPrice)} each</span>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {items.length > 0 && (
          <footer className="afsana-cart-footer">
            <form onSubmit={applyCoupon} className="afsana-cart-coupon">
              <label htmlFor="afsana-cart-coupon">{t("discountCode")}</label>
              <div className="afsana-cart-coupon-row">
                <span><Tag aria-hidden="true"/></span>
                <input id="afsana-cart-coupon" type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder={t("promoPlaceholder")} autoComplete="off"/>
                <button type="submit">{t("drawerApply")}</button>
              </div>
            </form>

            {quote.coupon?.valid && (
              <div className="afsana-cart-coupon-success">
                <span><Check aria-hidden="true"/> {t("couponApplied")} {quote.coupon.code} applied</span>
                <strong>-{money(quote.discount)}</strong>
              </div>
            )}
            {quote.coupon?.valid === false && couponCode && (
              <p className="afsana-cart-coupon-error" role="alert">{quote.coupon.message || t('invalidCoupon')}</p>
            )}

            <div className="afsana-cart-totals">
              <div><span>{t("subtotal")}</span><strong>{money(quote.subtotal)}</strong></div>
              {quote.discount > 0 && <div className="afsana-cart-savings"><span>{t("savings")}</span><strong>-{money(quote.discount)}</strong></div>}
              <div><span>{t("expressCourier")}</span><strong>{quote.shipping === 0 ? <em>{t("complimentary")}</em> : money(quote.shipping)}</strong></div>
              <div className="afsana-cart-grand-total"><span>{t("estimatedTotal")}</span><strong>{money(quote.total)}</strong></div>
            </div>

            <div className="afsana-cart-actions">
              <button type="button" className="afsana-cart-checkout" onClick={() => { closeDrawer(); navigate('/checkout'); }}>
                {t("continueDelivery")} <ArrowRight aria-hidden="true"/>
              </button>
              <button type="button" className="afsana-cart-view-full" onClick={() => { closeDrawer(); navigate('/cart'); }}>
                {t("viewFullBag")}
              </button>
            </div>
            <p className="afsana-cart-next-step">{t("drawerNextStep")}</p>
          </footer>
        )}
      </aside>
    </div>
  );
}
