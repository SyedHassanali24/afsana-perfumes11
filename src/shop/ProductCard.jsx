import { Link } from 'react-router-dom';
import { Heart, ArrowUpRight } from 'lucide-react';
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
        <div className="aspect-[4/5] overflow-hidden rounded-none border border-[#263e0e]/10 bg-[#f3f1e9] relative transition-all duration-700 group-hover:-translate-y-1">
          {p.image?.url
            ? <img src={p.image.url} alt={p.image.alt || p.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
            : <Placeholder className="w-full h-full" />}
          {p.inStock === false && <span className="absolute left-2 top-2 rounded-full bg-bg/90 px-2 py-0.5 text-xs text-ink-muted">Sold out</span>}
        </div>
        <div className="mt-4">
          {p.gender && <p className="text-xs uppercase tracking-wide text-ink-muted">{p.gender}</p>}
          <h3 className="font-display text-lg leading-snug">{p.name}</h3>
          <div className="mt-1 flex items-center justify-between"><p className="text-sm text-[#748e40]">{p.priceFrom ? `From ${money(p.priceFrom)}` : '—'}</p><span className="grid h-8 w-8 place-items-center border border-[#263e0e]/15 text-[#263e0e] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition"><ArrowUpRight className="w-3.5 h-3.5"/></span></div>
        </div>
      </Link>
      <button type="button" onClick={() => toggle(p.id)} aria-pressed={liked} aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
        className="absolute right-3 top-3 rounded-full bg-[#faf8f4]/90 p-2 text-[#263e0e] shadow-sm transition-all hover:-translate-y-0.5 hover:text-[#748e40]">
        <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
