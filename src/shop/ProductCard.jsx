import { Link } from 'react-router-dom';
import { Heart, ArrowUpRight } from 'lucide-react';
import { useWishlist } from './WishlistContext';
import { Placeholder } from './ui';
import { money, cardOf } from './format';
import { useCmsPageCopy } from './cmsCopy';

export default function ProductCard({ product }) {
  const copy = useCmsPageCopy('product_before');
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
          {p.inStock === false && <span className="afsana-product-stock">{copy.soldOutLabel}</span>}
          <span className="afsana-product-image-mark">{copy.cardBrandLabel}</span>
        </div>
        <div className="afsana-product-info">
          <p className="afsana-product-category">{p.gender || copy.cardCategoryFallback}</p>
          <h3 className="afsana-product-name">{p.name}</h3>
          <div className="afsana-product-bottom">
            <p className="afsana-product-price">{p.priceFrom ? `${copy.priceFromPrefix} ${money(p.priceFrom)}` : copy.emptyPrice}</p>
            <span className="afsana-product-open" aria-hidden="true"><ArrowUpRight /></span>
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggle(p.id)}
        aria-pressed={liked}
        aria-label={liked ? copy.removeWishlist : copy.addWishlist}
        className="afsana-product-wishlist"
      >
        <Heart fill={liked ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}
