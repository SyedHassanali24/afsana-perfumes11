import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ShoppingBag, ArrowRight, Trash2, Plus, Minus, Tag, Check, Sparkles } from 'lucide-react';
import { useCart } from './CartContext';
import useQuote from './useQuote';
import { money } from './format';

export default function CartDrawer() {
  const { drawerOpen, closeDrawer, items, count, setQty, remove, couponCode, setCoupon } = useCart();
  const { data: quoteData } = useQuote(items, couponCode);
  const quote = quoteData || { lines: [], subtotal: 0, discount: 0, shipping: 0, total: 0 };
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

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

  const freeThreshold = 5000;
  const subtotal = quote.subtotal || 0;
  const progressPct = Math.min(100, Math.round((subtotal / freeThreshold) * 100));
  const remainingForFree = Math.max(0, freeThreshold - subtotal);

  const applyCoupon = (e) => {
    e.preventDefault();
    if (!couponInput.trim()) {
      setCoupon('');
      setCouponError('');
      return;
    }
    setCoupon(couponInput.trim().toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative z-10 w-full max-w-md bg-surface border-l border-border h-full flex flex-col shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-lg tracking-tight">Shopping Bag</h2>
              <p className="text-xs text-ink-muted">{count} luxury {count === 1 ? 'creation' : 'creations'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="p-2 rounded-full hover:bg-surface text-ink-muted hover:text-ink transition-colors"
            aria-label="Close cart drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Meter */}
        <div className="px-5 py-3.5 bg-gold/5 border-b border-gold/15">
          <div className="flex items-center justify-between text-xs mb-1.5">
            {remainingForFree > 0 ? (
              <span className="text-ink-muted">
                Add <strong className="text-gold font-semibold">{money(remainingForFree)}</strong> for <span className="text-ink font-medium">Complimentary Express Shipping</span>
              </span>
            ) : (
              <span className="text-gold font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                You unlocked Complimentary Express Shipping!
              </span>
            )}
            <span className="font-mono text-[11px] text-ink-muted">{progressPct}%</span>
          </div>
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 divide-y divide-border/60">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-surface-raised border border-border flex items-center justify-center text-ink-muted mb-4">
                <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h3 className="font-display text-xl mb-1.5">Your Bag is Empty</h3>
              <p className="text-xs text-ink-muted max-w-xs mb-6">
                Discover our signature Extraits de Parfum, hand-poured with rare essences.
              </p>
              <button
                type="button"
                onClick={() => { closeDrawer(); navigate('/shop'); }}
                className="px-6 py-2.5 rounded-sm bg-gold text-bg text-xs font-semibold uppercase tracking-wider hover:bg-gold-hover transition-colors"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            quote.lines.map((line) => {
              const item = items.find((i) => i.variantId === line.variantId);
              const qty = item?.quantity || 1;
              return (
                <div key={line.variantId} className="pt-4 first:pt-0 flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-24 flex-shrink-0 bg-surface-raised rounded-sm border border-border overflow-hidden relative">
                    {line.image?.url ? (
                      <img src={line.image.url} alt={line.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink-muted text-xs">Afsana</div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/product/${line.slug}`}
                          onClick={closeDrawer}
                          className="font-display text-sm tracking-tight hover:text-gold transition-colors line-clamp-1"
                        >
                          {line.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(line.variantId)}
                          className="text-ink-muted hover:text-danger p-1 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">{line.label} · {line.concentration || 'Extrait de Parfum'}</p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-border rounded-sm bg-surface">
                        <button
                          type="button"
                          onClick={() => setQty(line.variantId, Math.max(1, qty - 1))}
                          className="p-1 px-2 text-ink-muted hover:text-ink disabled:opacity-30"
                          disabled={qty <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-mono font-medium">{qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(line.variantId, qty + 1)}
                          className="p-1 px-2 text-ink-muted hover:text-ink"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink">{money(line.lineTotal)}</p>
                        {qty > 1 && (
                          <p className="text-[10px] text-ink-muted">{money(line.unitPrice)} each</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer & Checkout */}
        {items.length > 0 && (
          <div className="p-5 border-t border-border bg-surface-raised space-y-4">
            {/* Promo Code Accordion */}
            <form onSubmit={applyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                  placeholder="Coupon (e.g. WELCOME10)"
                  className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-sm text-xs uppercase focus:outline-none focus:border-gold"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-surface border border-border hover:border-gold text-xs font-medium rounded-sm transition-colors"
              >
                Apply
              </button>
            </form>

            {quote.coupon?.valid && (
              <div className="flex items-center justify-between text-xs text-success bg-success/10 px-3 py-1.5 rounded-sm border border-success/20">
                <span className="flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  Code {quote.coupon.code} applied
                </span>
                <span>-{money(quote.discount)}</span>
              </div>
            )}

            {quote.coupon?.valid === false && couponCode && (
              <p className="text-xs text-danger">{quote.coupon.message || 'Invalid or expired promo code.'}</p>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-ink-muted pt-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-ink font-medium">{money(quote.subtotal)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Savings & Discount</span>
                  <span>-{money(quote.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Express Courier</span>
                <span className="text-ink font-medium">
                  {quote.shipping === 0 ? <span className="text-success font-semibold">Complimentary</span> : money(quote.shipping)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-ink pt-2 border-t border-border">
                <span>Estimated Total</span>
                <span className="text-gold font-display text-base">{money(quote.total)}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => { closeDrawer(); navigate('/checkout'); }}
                className="w-full py-3.5 px-4 rounded-sm bg-gold hover:bg-gold-hover text-bg font-semibold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { closeDrawer(); navigate('/cart'); }}
                className="w-full py-2.5 px-4 rounded-sm border border-border hover:bg-surface text-ink-muted hover:text-ink text-xs font-medium text-center transition-colors"
              >
                View Full Bag Details
              </button>
            </div>

            <p className="text-[11px] text-center text-ink-muted pt-1">
              Cash on Delivery & Direct Bank Transfer available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
