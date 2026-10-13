import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Check } from 'lucide-react';
import useApi from '../../hooks/useApi';
import { productsApi } from '../../services';
import Button from '../../../admin/components/Button';
import { Container, StateBox, QtyStepper, Placeholder } from '../ui';
import ProductCard from '../ProductCard';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { money } from '../format';
import useTitle from '../useTitle';

const NoteRow = ({ label, list }) => (list?.length ? <div className="flex gap-3 text-sm"><span className="w-16 text-ink-muted">{label}</span><span>{list.join(', ')}</span></div> : null);

export default function ProductPage() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useApi(() => productsApi.bySlug(slug), [slug]);
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const [vid, setVid] = useState(null);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const [added, setAdded] = useState(false);
  const p = data?.product;
  const variants = data?.variants || [];
  useTitle(p?.name);

  useEffect(() => { // pick the first size that is in stock
    if (variants.length) { setVid((variants.find((v) => v.available > 0) || variants[0]).id); setQty(1); setImg(0); setAdded(false); }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const v = variants.find((x) => x.id === vid);
  const price = v && (v.salePrice > 0 && v.salePrice < v.price ? v.salePrice : v.price);
  const media = [...(p?.media || [])].sort((a, b) => (a.kind === 'main' ? -1 : b.kind === 'main' ? 1 : (a.sortOrder || 0) - (b.sortOrder || 0)));
  const soldOut = !v || v.available <= 0;

  const addToCart = () => { add(v.id, qty); setAdded(true); };

  return (
    <Container>
      <StateBox loading={loading} error={error?.status === 404 ? { message: 'This perfume could not be found.' } : error} onRetry={reload}>
        {p && (
          <>
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <div className="aspect-square rounded-md border border-border bg-surface overflow-hidden">
                  {media[img] ? <img src={media[img].url} alt={media[img].alt || p.name} className="w-full h-full object-cover" /> : <Placeholder className="w-full h-full" />}
                </div>
                {media.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {media.map((m, i) => (
                      <button key={m.url + i} type="button" onClick={() => setImg(i)} aria-label={`Show picture ${i + 1}`} aria-current={i === img}
                        className={`w-16 h-16 shrink-0 rounded-sm overflow-hidden border ${i === img ? 'border-gold' : 'border-border'}`}><img src={m.url} alt="" className="w-full h-full object-cover" /></button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {p.fragrance?.gender && <p className="text-xs uppercase tracking-widest text-ink-muted">{p.fragrance.gender}{p.fragrance.concentration ? ` · ${p.fragrance.concentration}` : ''}</p>}
                <h1 className="font-display text-4xl mt-1">{p.name}</h1>
                {p.content?.shortDescription && <p className="text-ink-muted mt-3">{p.content.shortDescription}</p>}

                {variants.length === 0 ? <p className="mt-6 text-sm text-ink-muted">Currently unavailable.</p> : (
                  <>
                    <div className="mt-6">
                      <p className="text-sm mb-2">Size</p>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
                        {variants.map((x) => (
                          <button key={x.id} type="button" role="radio" aria-checked={x.id === vid} onClick={() => { setVid(x.id); setQty(1); setAdded(false); }}
                            className={`px-4 py-2 rounded-sm border text-sm ${x.id === vid ? 'border-gold bg-gold-soft text-gold' : 'border-border'} ${x.available <= 0 ? 'opacity-50' : ''}`}>
                            {x.label || `${x.sizeMl}ml`}{x.available <= 0 ? ' · sold out' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 flex items-baseline gap-3">
                      <span className="font-display text-3xl">{money(price)}</span>
                      {price < v.price && <span className="text-ink-muted line-through">{money(v.price)}</span>}
                    </div>
                    <p className={`text-sm mt-1 ${soldOut ? 'text-danger' : v.available <= 5 ? 'text-warning' : 'text-success'}`}>{soldOut ? 'Sold out' : v.available <= 5 ? `Only ${v.available} left` : 'In stock'}</p>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <QtyStepper value={qty} onChange={setQty} max={v?.available || 1} />
                      <Button onClick={addToCart} disabled={soldOut} className="flex-1 sm:flex-none sm:px-10">Add to cart</Button>
                      <button type="button" onClick={() => toggle(p._id)} aria-pressed={has(p._id)} aria-label={has(p._id) ? 'Remove from wishlist' : 'Add to wishlist'} className="p-2.5 border border-border rounded-sm hover:text-gold">
                        <Heart className="w-4 h-4" fill={has(p._id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    {added && <p role="status" className="mt-3 text-sm text-success flex items-center gap-2"><Check className="w-4 h-4" /> Added to your cart. <Link to="/cart" className="underline">View cart</Link></p>}
                  </>
                )}

                {(p.notes?.top?.length || p.notes?.heart?.length || p.notes?.base?.length) ? (
                  <div className="mt-8 space-y-2 border-t border-border pt-6">
                    <h2 className="font-display text-lg mb-2">Fragrance notes</h2>
                    <NoteRow label="Top" list={p.notes.top} /><NoteRow label="Heart" list={p.notes.heart} /><NoteRow label="Base" list={p.notes.base} />
                  </div>
                ) : null}
                {(p.fragrance?.longevity || p.fragrance?.projection || p.fragrance?.seasons?.length) ? (
                  <dl className="mt-6 grid grid-cols-2 gap-y-2 text-sm">
                    {p.fragrance.longevity && <><dt className="text-ink-muted">Longevity</dt><dd>{p.fragrance.longevity}</dd></>}
                    {p.fragrance.projection && <><dt className="text-ink-muted">Projection</dt><dd>{p.fragrance.projection}</dd></>}
                    {p.fragrance.seasons?.length > 0 && <><dt className="text-ink-muted">Best for</dt><dd>{p.fragrance.seasons.join(', ')}</dd></>}
                  </dl>
                ) : null}
                {p.content?.fullDescription && <div className="mt-6 border-t border-border pt-6"><h2 className="font-display text-lg mb-2">About this fragrance</h2><p className="text-sm text-ink-muted whitespace-pre-line">{p.content.fullDescription}</p></div>}
              </div>
            </div>

            {data.related?.length > 0 && (
              <section className="mt-16">
                <h2 className="font-display text-2xl mb-6">You may also like</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">{data.related.map((r) => <ProductCard key={r._id} product={r} />)}</div>
              </section>
            )}
          </>
        )}
      </StateBox>
    </Container>
  );
}
