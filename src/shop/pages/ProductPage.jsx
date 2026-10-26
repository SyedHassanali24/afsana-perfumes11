import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Heart, Check, Sparkles, Star, ShieldCheck, Truck, Clock, ArrowRight, Share2, Layers } from 'lucide-react';
import useApi from '../../hooks/useApi';
import { productsApi } from '../../services';
import { Container, StateBox, QtyStepper, Placeholder } from '../ui';
import ProductCard from '../ProductCard';
import ReviewsSection from '../ReviewsSection';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { money } from '../format';
import useTitle from '../useTitle';

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(() => productsApi.bySlug(slug), [slug]);
  const { add } = useCart();
  const { has, toggle } = useWishlist();

  const [vid, setVid] = useState(null);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');

  const p = data?.product;
  const variants = data?.variants || [];
  useTitle(p?.seo?.title || p?.name ? `${p.name} | Afsana Haute Parfumerie` : 'Afsana Fragrance');

  useEffect(() => {
    if (variants.length) {
      setVid((variants.find((v) => v.available > 0) || variants[0]).id);
      setQty(1);
      setImg(0);
      setAdded(false);
    }
  }, [data]);

  const v = variants.find((x) => x.id === vid);
  const price = v && (v.salePrice > 0 && v.salePrice < v.price ? v.salePrice : v.price);
  const media = [...(p?.media || [])].sort((a, b) =>
    a.kind === 'main' ? -1 : b.kind === 'main' ? 1 : (a.sortOrder || 0) - (b.sortOrder || 0)
  );
  const soldOut = !v || v.available <= 0;

  const handleAddToCart = () => {
    if (!v) return;
    add(v.id, qty, true);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleBuyNow = () => {
    if (!v) return;
    add(v.id, qty, false);
    navigate('/checkout');
  };

  return (
    <div className="py-8 sm:py-14">
      <Container>
        <StateBox
          loading={loading}
          error={error?.status === 404 ? { message: 'This haute fragrance could not be located in our private archive.' } : error}
          onRetry={reload}
        >
          {p && (
            <>
              {/* Breadcrumb Navigation */}
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-ink-muted uppercase tracking-wider mb-8">
                <Link to="/" className="hover:text-gold transition-colors">Afsana</Link>
                <span>/</span>
                <Link to="/shop" className="hover:text-gold transition-colors">Boutique</Link>
                <span>/</span>
                {p.category?.name && (
                  <>
                    <Link to={`/shop?category=${p.category.slug}`} className="hover:text-gold transition-colors">
                      {p.category.name}
                    </Link>
                    <span>/</span>
                  </>
                )}
                <span className="text-ink truncate font-medium">{p.name}</span>
              </nav>

              {/* Main Product Showcase (2-Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-start">
                {/* Left: Gallery Column */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Primary Flacon Image */}
                  <div className="aspect-[4/5] rounded-sm overflow-hidden border border-border bg-surface-raised relative group shadow-luxury">
                    {media[img] ? (
                      <img
                        src={media[img].url}
                        alt={media[img].alt || p.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <Placeholder className="w-full h-full" />
                    )}

                    {/* Concentration Floating Tag */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="px-3 py-1 rounded-sm bg-bg/95 backdrop-blur-md text-gold text-xs font-semibold uppercase tracking-wider border border-gold/30">
                        {p.fragrance?.concentration || 'Extrait de Parfum'}
                      </span>
                    </div>

                    {/* Wishlist Button */}
                    <button
                      type="button"
                      onClick={() => toggle(p._id || p.id)}
                      aria-pressed={has(p._id || p.id)}
                      aria-label={has(p._id || p.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                      className={`absolute right-4 top-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        has(p._id || p.id)
                          ? 'bg-gold text-bg shadow-md'
                          : 'bg-bg/85 backdrop-blur-md text-ink hover:text-gold border border-border'
                      }`}
                    >
                      <Heart className="w-4 h-4" fill={has(p._id || p.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {/* Thumbnail Row */}
                  {media.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {media.map((m, i) => (
                        <button
                          key={m.url + i}
                          type="button"
                          onClick={() => setImg(i)}
                          aria-label={`View flacon photograph ${i + 1}`}
                          className={`w-20 h-24 rounded-sm overflow-hidden border flex-shrink-0 transition-all ${
                            i === img ? 'border-gold ring-1 ring-gold shadow-md' : 'border-border opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Maison Assurance Banner */}
                  <div className="p-5 rounded-sm bg-surface-raised border border-border grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-ink-muted">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink">Discovery Guarantee</p>
                        <p className="text-[11px] leading-relaxed mt-0.5">
                          Every flacon comes with a 2ml tester vial. Try the sample first; return unopened flacon within 7 days for a 100% full refund.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink">Express Courier Across Pakistan</p>
                        <p className="text-[11px] leading-relaxed mt-0.5">
                          Complimentary on orders above PKR 5,000. Delivered in discreet, velvet-lined tamper-proof presentation boxes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Product Spec Column */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Category & Rating */}
                  <div className="flex items-center justify-between text-xs uppercase tracking-widest text-ink-muted">
                    <span>{p.fragrance?.gender || 'Haute Parfumerie'} · {p.fragrance?.scentType || 'Artisanal'}</span>
                    {p.ratingAvg > 0 && (
                      <span className="flex items-center gap-1.5 text-gold font-medium">
                        <Star className="w-4 h-4 fill-gold text-gold" />
                        <span className="text-sm font-semibold">{p.ratingAvg.toFixed(1)}</span>
                        <span className="text-ink-muted">({p.ratingCount} reviews)</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Tagline */}
                  <div>
                    <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight">
                      {p.name}
                    </h1>
                    <p className="text-xs uppercase tracking-[0.25em] text-gold font-semibold mt-1.5">
                      Flacon de Prestige · Limited Allocation
                    </p>
                  </div>

                  {/* Short Description */}
                  {p.content?.shortDescription && (
                    <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-light">
                      {p.content.shortDescription}
                    </p>
                  )}

                  {/* Size Selector */}
                  {variants.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="uppercase tracking-wider font-semibold text-ink-muted">Choose Volume / Flacon Size</span>
                        <span className="text-gold font-medium">Concentration: 32% Oil</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {variants.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => { setVid(item.id); setQty(1); setAdded(false); }}
                            className={`p-3.5 rounded-sm border text-left transition-all relative ${
                              item.id === vid
                                ? 'border-gold bg-gold/10 text-gold shadow-sm'
                                : 'border-border bg-surface text-ink hover:border-gold/50'
                            } ${item.available <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-display text-sm font-semibold">{item.label || `${item.sizeMl}ml`}</span>
                              <span className="text-xs font-semibold">{money(item.salePrice || item.price)}</span>
                            </div>
                            <p className="text-[10px] text-ink-muted mt-1">
                              {item.available <= 0 ? 'Sold Out' : item.available <= 5 ? `Only ${item.available} Left` : 'In Stock'}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Row */}
                  <div className="pt-2 flex items-baseline gap-4">
                    <span className="font-display text-3xl sm:text-4xl text-gold font-normal">
                      {money(price)}
                    </span>
                    {v && v.salePrice > 0 && v.salePrice < v.price && (
                      <span className="text-sm text-ink-muted line-through font-mono">
                        {money(v.price)}
                      </span>
                    )}
                    <span className="text-xs text-ink-muted uppercase tracking-wider">
                      Includes luxury presentation box
                    </span>
                  </div>

                  {/* Quantity Stepper & CTA Buttons */}
                  <div className="space-y-3 pt-2">
                    <div className="flex gap-3">
                      <div className="w-32">
                        <QtyStepper value={qty} onChange={setQty} max={v?.available || 1} />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={soldOut}
                        className="flex-1 py-3.5 px-6 rounded-sm bg-gold hover:bg-gold-hover disabled:opacity-40 text-bg text-xs font-semibold uppercase tracking-widest transition-all shadow-md active:scale-[0.99]"
                      >
                        {soldOut ? 'Sold Out' : added ? 'Added to Bag ✓' : 'Add to Bag'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={soldOut}
                      className="w-full py-3 px-6 rounded-sm border border-gold hover:bg-gold/10 disabled:opacity-40 text-gold text-xs font-semibold uppercase tracking-widest transition-colors"
                    >
                      Instant Express Checkout
                    </button>
                  </div>

                  {/* Olfactive Performance Metrics */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border text-xs">
                    <div className="p-3 bg-surface-raised border border-border rounded-sm">
                      <p className="text-[10px] uppercase tracking-wider text-ink-muted">Longevity on Skin</p>
                      <p className="font-display text-sm font-semibold text-ink mt-0.5">
                        {p.fragrance?.longevity || '14 to 16+ Hours'}
                      </p>
                    </div>
                    <div className="p-3 bg-surface-raised border border-border rounded-sm">
                      <p className="text-[10px] uppercase tracking-wider text-ink-muted">Sillage & Projection</p>
                      <p className="font-display text-sm font-semibold text-ink mt-0.5">
                        {p.fragrance?.projection || 'Radiating & Magnetic'}
                      </p>
                    </div>
                  </div>

                  {/* Tabbed Technical Breakdown */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex border-b border-border text-xs uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => setActiveTab('notes')}
                        className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
                          activeTab === 'notes' ? 'border-gold text-gold' : 'border-transparent text-ink-muted hover:text-ink'
                        }`}
                      >
                        Olfactive Notes
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('story')}
                        className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
                          activeTab === 'story' ? 'border-gold text-gold' : 'border-transparent text-ink-muted hover:text-ink'
                        }`}
                      >
                        Maison Story
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('usage')}
                        className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
                          activeTab === 'usage' ? 'border-gold text-gold' : 'border-transparent text-ink-muted hover:text-ink'
                        }`}
                      >
                        Application & Seasons
                      </button>
                    </div>

                    <div className="pt-4 text-xs text-ink-muted leading-relaxed">
                      {activeTab === 'notes' && (
                        <div className="space-y-4">
                          {p.notes?.top?.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-gold uppercase tracking-wider mb-1">Top Notes (Opening 0–30 min)</p>
                              <p className="text-ink">{p.notes.top.join(' · ')}</p>
                            </div>
                          )}
                          {p.notes?.heart?.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-gold uppercase tracking-wider mb-1">Heart Notes (Core 30 min–4 hrs)</p>
                              <p className="text-ink">{p.notes.heart.join(' · ')}</p>
                            </div>
                          )}
                          {p.notes?.base?.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-gold uppercase tracking-wider mb-1">Base Notes (Dry-down 4–16 hrs)</p>
                              <p className="text-ink">{p.notes.base.join(' · ')}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'story' && (
                        <p className="whitespace-pre-line text-ink/90">
                          {p.content?.fullDescription || p.content?.shortDescription || 'Crafted with master French noses and authentic aged essences.'}
                        </p>
                      )}

                      {activeTab === 'usage' && (
                        <div className="space-y-3">
                          <p>
                            <strong>Ideal Seasons:</strong> {p.fragrance?.seasons?.join(', ') || 'Autumn, Winter, Gala Evenings'}
                          </p>
                          <p>
                            <strong>Occasions:</strong> {p.fragrance?.occasions?.join(', ') || 'Formal gatherings, weddings, and signature daily presence'}
                          </p>
                          <p className="text-[11px] italic">
                            Tip: For optimal projection, apply 2-3 sprays to pulse points (base of the neck, wrists, and collarbone). Do not rub the wrists together, as this breaks down the top notes.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Customer Reviews Section */}
              <div className="mt-20 pt-16 border-t border-border">
                <ReviewsSection slug={slug} />
              </div>

              {/* Related Parfums Row */}
              {data.related?.length > 0 && (
                <section className="mt-20 pt-16 border-t border-border">
                  <div className="flex items-end justify-between mb-8">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-gold font-medium mb-1">Complementary Creations</p>
                      <h2 className="font-display text-2xl sm:text-3xl tracking-tight">You May Also Admire</h2>
                    </div>
                    <Link to="/shop" className="text-xs uppercase tracking-widest font-semibold text-gold hover:underline">
                      View Boutique
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    {data.related.map((r) => (
                      <ProductCard key={r._id || r.id} product={r} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </StateBox>
      </Container>
    </div>
  );
}
