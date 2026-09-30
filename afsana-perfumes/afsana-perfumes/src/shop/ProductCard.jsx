import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from './WishlistContext';
import { Placeholder } from './ui';
import { money, cardOf } from './format';

export default function ProductCard({ product }) {
  const p = cardOf(product);
  const { has, toggle } = useWishlist();
  const liked = has(p.id);
  return (
    <div className="group relative">
      <Link to={`/product/${p.slug}`} className="block">
        <div className="aspect-[4/5] overflow-hidden rounded-md border border-border bg-surface relative">
          {p.image?.url
            ? <img src={p.image.url} alt={p.image.alt || p.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : <Placeholder className="w-full h-full" />}
          {p.inStock === false && <span className="absolute left-2 top-2 rounded-sm bg-bg/90 px-2 py-0.5 text-xs text-ink-muted">Sold out</span>}
        </div>
        <div className="mt-3">
          {p.gender && <p className="text-xs uppercase tracking-wide text-ink-muted">{p.gender}</p>}
          <h3 className="font-display text-lg leading-snug">{p.name}</h3>
          <p className="text-sm text-gold mt-0.5">{p.priceFrom ? `From ${money(p.priceFrom)}` : '—'}</p>
        </div>
      </Link>
      <button type="button" onClick={() => toggle(p.id)} aria-pressed={liked} aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
        className="absolute right-2 top-2 rounded-full bg-bg/90 p-2 text-ink hover:text-gold">
        <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
