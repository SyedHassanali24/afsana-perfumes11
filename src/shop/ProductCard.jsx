import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingBag, Check } from 'lucide-react';
import { useWishlist } from './WishlistContext';
import { useCart } from './CartContext';
import { Placeholder } from './ui';
import { money, cardOf } from './format';

export default function ProductCard({ product }) {
  const p = cardOf(product);
  const { has, toggle } = useWishlist();
  const { add } = useCart();
  const liked = has(p.id);
  const [added, setAdded] = useState(false);

  // Quick Add handler (uses first available variant)
  const onQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const variantId = p.firstVariantId || p.variants?.[0]?.id || p.variantId;
    if (variantId) {
      add(variantId, 1, true);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  const badge = p.tags?.[0] || (p.ratingAvg >= 4.9 ? 'Connoisseur Pick' : null);

  return (
    <div className="group relative flex flex-col bg-surface border border-border/70 hover:border-gold/40 rounded-sm overflow-hidden transition-all duration-500 hover:shadow-luxury">
      {/* Image Container with Badges */}
      <Link to={`/product/${p.slug}`} className="block relative aspect-[4/5] overflow-hidden bg-surface-raised">
        {p.image?.url ? (
          <img
            src={p.image.url}
            alt={p.image.alt || p.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <Placeholder className="w-full h-full" />
        )}

        {/* Ambient Gradient on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {badge && (
            <span className="px-2.5 py-1 rounded-sm bg-bg/95 backdrop-blur-md text-[10px] font-semibold uppercase tracking-wider text-gold border border-gold/20 shadow-sm">
              {badge}
            </span>
          )}
          {p.inStock === false && (
            <span className="px-2.5 py-1 rounded-sm bg-danger-soft text-[10px] font-semibold uppercase tracking-wider text-danger border border-danger/20">
              Sold Out
            </span>
          )}
        </div>

        {/* Quick Add overlay button on hover */}
        {p.inStock !== false && (
          <div className="absolute bottom-3 inset-x-3 z-10 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <button
              type="button"
              onClick={onQuickAdd}
              className="w-full py-2.5 px-3 rounded-sm bg-bg/95 hover:bg-gold text-ink hover:text-bg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 backdrop-blur-md border border-border/80 hover:border-gold shadow-lg transition-all"
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5 text-success" />
                  <span>Added to Bag</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 text-gold group-hover:text-bg" />
                  <span>Quick Add</span>
                </>
              )}
            </button>
          </div>
        )}
      </Link>

      {/* Wishlist floating toggle */}
      <button
        type="button"
        onClick={() => toggle(p.id)}
        aria-pressed={liked}
        aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
        className={`absolute right-3 top-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          liked
            ? 'bg-gold text-bg shadow-md'
            : 'bg-bg/80 backdrop-blur-md text-ink-muted hover:text-gold border border-border/60 hover:border-gold/40'
        }`}
      >
        <Heart className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} />
      </button>

      {/* Information Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted uppercase tracking-widest mb-1">
            <span>{p.gender || 'Haute Parfumerie'}</span>
            {p.ratingAvg > 0 && (
              <span className="flex items-center gap-1 text-gold font-medium">
                <Star className="w-3 h-3 fill-gold text-gold" />
                <span>{p.ratingAvg.toFixed(1)}</span>
                {p.ratingCount > 0 && <span className="text-ink-muted">({p.ratingCount})</span>}
              </span>
            )}
          </div>

          <Link to={`/product/${p.slug}`} className="block">
            <h3 className="font-display text-base font-medium tracking-tight leading-snug group-hover:text-gold transition-colors line-clamp-1">
              {p.name}
            </h3>
          </Link>

          {/* Notes sneak peek */}
          {(p.notes?.heart?.[0] || p.notes?.top?.[0] || p.notes?.base?.[0]) && (
            <p className="text-xs text-ink-muted mt-1 line-clamp-1">
              Key Notes:{' '}
              <span className="text-ink">
                {[
                  p.notes?.heart?.[0] || p.notes?.top?.[0],
                  p.notes?.base?.[0],
                ].filter(Boolean).join(' · ')}
              </span>
            </p>
          )}
        </div>

        {/* Price Row */}
        <div className="mt-3 pt-3 border-t border-border/40 flex items-baseline justify-between">
          <p className="text-sm font-semibold text-gold">
            {p.priceFrom ? `From ${money(p.priceFrom)}` : '—'}
          </p>
          <span className="text-[11px] text-ink-muted">Extrait 50/100ml</span>
        </div>
      </div>
    </div>
  );
}
