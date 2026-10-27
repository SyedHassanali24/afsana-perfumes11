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
    <div className="fixed inset-0 z-[70] flex justify-end" aria-label="Your bag">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#182308]/75 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative z-10 w-full max-w-[520px] bg-[#faf8f4] text-[#263e0e] border-l border-[#748e40]/20 h-full flex flex-col shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="p-7 border-b border-[#263e0e]/10 flex items-center justify-between bg-[#faf8f4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#263e0e] flex items-center justify-center text-[#b4bf41]">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-3xl tracking-tight">Your bag</h2>
              <p className="text-[9px] uppercase tracking-[.25em] text-[#5f654f] mt-1">{count} {count === 1 ? "fragrance" : "fragrances"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="p-2 text-[#5f654f] hover:text-[#263e0e]"
            aria-label="Close cart drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Meter */}
        <div className="px-7 py-4 bg-[#f3f1e9] border-b border-[#263e0e]/10">
          <div className="flex items-center justify-between text-xs mb-1.5">
            {remainingForFree > 0 ? (
              <span className="text-[#5f654f]">
                Add <strong className="text-[#263e0e] font-semibold">{money(remainingForFree)}</strong> for <span className="text-ink font-medium">Complimentary Express Shipping</span>
              </span>
            ) : (
              <span className="text-[#263e0e] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                You unlocked Complimentary Express Shipping!
              </span>
            )}
            <span className="font-mono text-[11px] text-ink-muted">{progressPct}%</span>
          </div>
          <div className="w-full h-1 bg-[#263e0e]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#b4bf41] transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-7 space-y-5 divide-y divide-[#263e0e]/10">
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
                className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold uppercase tracking-wider hover:bg-gold-hover transition-colors"
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
                  <div className="w-20 h-24 flex-shrink-0 bg-[#f3f1e9] rounded-none border border-[#263e0e]/10 overflow-hidden relative">
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
                          className="font-display text-xl tracking-tight hover:text-[#748e40] transition-colors line-clamp-1"
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
                      <div className="flex items-center border border-[#263e0e]/15 rounded-none bg-transparent">
                        <button
                          type="button"
                          onClick={() => setQty(line.variantId, Math.max(1, qty - 1))}
                          className="p-1 px-2 text-ink-muted hover:text-primary disabled:opacity-30"
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
                        <p className="font-display text-xl text-[#263e0e]">{money(line.lineTotal)}</p>
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
          <div className="p-7 border-t border-[#263e0e]/10 bg-[#f3f1e9] space-y-5">
            {/* Promo Code Accordion */}
            <form onSubmit={applyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                  placeholder="Coupon (e.g. WELCOME10)"
                  className="w-full pl-8 pr-3 py-3 bg-transparent border border-[#263e0e]/15 rounded-none text-xs uppercase focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-transparent border border-[#263e0e]/20 hover:bg-[#263e0e] hover:text-white text-[9px] uppercase tracking-[.16em]"
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
              <div className="flex justify-between font-display text-xl text-[#263e0e] pt-2 border-t border-border">
                <span>Estimated Total</span>
                <span className="text-primary font-display text-base">{money(quote.total)}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => { closeDrawer(); navigate('/checkout'); }}
                className="btn btn-primary w-full"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { closeDrawer(); navigate('/cart'); }}
                className="btn w-full border-[#263e0e]/20 text-[#263e0e]"
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
