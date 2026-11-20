import { responsiveUnsplashSrcSet } from './responsiveImages';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowUpRight } from 'lucide-react';
import { useWishlist } from './WishlistContext';
import { Placeholder } from './ui';
import { money, cardOf } from './format';

export default function ProductCard({ product }) {
  const p = cardOf(product);
  const { has, toggle } = useWishlist();
  const liked = has(p.id);
  const [brokenImage, setBrokenImage] = useState('');
  const imageUrl = p.image?.url || '';
  const showImage = !!imageUrl && brokenImage !== imageUrl;
  const secondary = product?.media?.find?.((m) => {
    const url = String(m?.url || '').trim();
    const kind = String(m?.kind || '').toLowerCase();
    const pathname = url.toLowerCase().split(/[?#]/, 1)[0];
    const isNonImageFile = ['.mp4', '.webm', '.mov', '.m4v', '.glb', '.gltf'].some((ext) => pathname.endsWith(ext));
    return url && url !== imageUrl && !isNonImageFile && !['video', 'media360', 'model3d'].includes(kind);
  });

  return (
    <article className="afsana-product-card group relative">
      <Link to={`/product/${p.slug}`} className="afsana-product-link block">
        <div className="afsana-product-image">
          {showImage ? (
            <>
              <img
                src={imageUrl}
                srcSet={responsiveUnsplashSrcSet(imageUrl, 66)}
                sizes="(max-width: 640px) 48vw, (max-width: 1024px) 33vw, 25vw"
                alt={p.image.alt || p.name}
                width="1000"
                height="1250"
                loading="lazy"
                onError={() => setBrokenImage(imageUrl)}
                className={secondary?.url ? 'afsana-product-img afsana-product-img-primary has-secondary' : 'afsana-product-img afsana-product-img-primary'}
              />
              {secondary?.url ? (
                <img
                  src={secondary.url}
                  srcSet={responsiveUnsplashSrcSet(secondary.url, 66)}
                  sizes="(max-width: 640px) 48vw, (max-width: 1024px) 33vw, 25vw"
                  alt=""
                  width="1000"
                  height="1250"
                  loading="lazy"
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
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
