import { Link } from 'react-router-dom';
import { Heart, ArrowUpRight } from 'lucide-react';
import { useWishlist } from './WishlistContext';
import { Placeholder } from './ui';
import { money, cardOf } from './format';

export default function ProductCard({ product }) {
  const p = cardOf(product);
  const { has, toggle } = useWishlist();
  const liked = has(p.id);
  const secondary = product?.media?.find?.((m) => m?.url && m?.url !== p.image?.url && m?.kind !== 'video');

  return (
    <article className="afsana-product-card group relative">
      <Link to={`/product/${p.slug}`} className="afsana-product-link block">
        <div className="afsana-product-image">
          {p.image?.url ? (
            <>
              <img
                src={p.image.url}
                alt={p.image.alt || p.name}
                loading="lazy"
                className={secondary?.url ? 'afsana-product-img afsana-product-img-primary has-secondary' : 'afsana-product-img afsana-product-img-primary'}
              />
              {secondary?.url ? (
                <img
                  src={secondary.url}
                  alt=""
                  loading="lazy"
                  className="afsana-product-img afsana-product-img-secondary"
                />
              ) : null}
            </>
          ) : <Placeholder className="w-full h-full" />}
          {p.inStock === false && <span className="afsana-product-stock">Sold out</span>}
          <span className="afsana-product-image-mark">AFSANA</span>
        </div>
        <div className="afsana-product-info">
          <p className="afsana-product-category">{p.gender || 'Extrait de Parfum'}</p>
          <h3 className="afsana-product-name">{p.name}</h3>
          <div className="afsana-product-bottom">
            <p className="afsana-product-price">{p.priceFrom ? `From ${money(p.priceFrom)}` : '—'}</p>
            <span className="afsana-product-open" aria-hidden="true"><ArrowUpRight /></span>
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggle(p.id)}
        aria-pressed={liked}
        aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
        className="afsana-product-wishlist"
      >
        <Heart fill={liked ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}
