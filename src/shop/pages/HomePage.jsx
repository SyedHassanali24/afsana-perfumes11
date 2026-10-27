import { Link } from 'react-router-dom';

const isExternal = (url) => /^https?:\/\//i.test(String(url || ''));
const SmartLink = ({ to, children, ...props }) => isExternal(to) ? <a href={to} {...props}>{children}</a> : <Link to={to} {...props}>{children}</Link>;
import useApi from '../../hooks/useApi';
import { productsApi, publicTaxonomyApi, shopContentApi } from '../../services';
import Button from '../../../admin/components/Button';
import { Container, StateBox, CardsSkeleton, Placeholder } from '../ui';
import ProductCard from '../ProductCard';
import useTitle from '../useTitle';

function Row({ title, query, to }) {
  const { data, loading, error, reload } = useApi(() => productsApi.list({ ...query, limit: 4 }), [JSON.stringify(query)]);
  const list = data?.products || [];
  return (
    <section className="mt-16">
      <Container>
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display text-2xl">{title}</h2>
          <Link to={to} className="text-sm text-primary underline underline-offset-4">View all</Link>
        </div>
        <StateBox loading={loading} error={error} onRetry={reload} empty={!list.length} emptyText="New fragrances are coming soon." skeleton={<CardsSkeleton n={4} />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </StateBox>
      </Container>
    </section>
  );
}

export default function HomePage() {
  useTitle();
  const cats = useApi(() => publicTaxonomyApi.list('categories'), []);
  const content = useApi(() => shopContentApi.get(), []);
  const banners = content.data?.banners || [];
  const faqs = content.data?.faqs || [];
  const top = (cats.data?.items || []).filter((c) => !c.parentId).slice(0, 6);
  return (
    <>
      {banners.length > 0 ? (
        <section className="-mt-8 border-b border-border bg-surface">
          {banners.map((banner, index) => (
            <div key={banner.id || index} className="relative isolate min-h-[360px] sm:min-h-[480px] overflow-hidden bg-surface">
              {(banner.desktopImage?.url || banner.mobileImage?.url) && (
                <picture>
                  {banner.mobileImage?.url && <source media="(max-width: 639px)" srcSet={banner.mobileImage.url} />}
                  <img src={banner.desktopImage?.url || banner.mobileImage.url} alt={banner.desktopImage?.alt || banner.mobileImage?.alt || ''} fetchPriority={index === 0 ? 'high' : 'auto'} className="absolute inset-0 -z-10 h-full w-full object-cover" />
                </picture>
              )}
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
              <Container className="flex min-h-[360px] sm:min-h-[480px] items-center py-16">
                <div className="max-w-2xl text-white">
                  <p className="text-xs uppercase tracking-[0.25em] text-primary">Afsana Perfumes</p>
                  {banner.heading && <h1 className="font-display text-4xl sm:text-6xl mt-4 leading-tight">{banner.heading}</h1>}
                  {banner.subtitle && <p className="mt-5 max-w-xl text-white/80">{banner.subtitle}</p>}
                  <div className="mt-8 flex flex-wrap gap-3">
                    {banner.buttonText && banner.buttonLink && <SmartLink to={banner.buttonLink}><Button>{banner.buttonText}</Button></SmartLink>}
                    <Link to="/shop"><Button variant="secondary">Shop all perfumes</Button></Link>
                  </div>
                </div>
              </Container>
            </div>
          ))}
        </section>
      ) : (
        <section className="-mt-8 border-b border-border bg-surface">
          <Container className="py-20 sm:py-28 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-primary">Afsana Perfumes</p>
            <h1 className="font-display text-4xl sm:text-6xl mt-4 leading-tight">Find the scent that<br />is unmistakably you</h1>
            <p className="text-ink-muted mt-5 max-w-xl mx-auto">Browse our collection, pay on delivery or by bank transfer, and track every order.</p>
            <div className="mt-8 flex justify-center gap-3">
              <Link to="/shop"><Button>Shop all perfumes</Button></Link>
              <Link to="/track"><Button variant="secondary">Track an order</Button></Link>
            </div>
          </Container>
        </section>
      )}

      {top.length > 0 && (
        <section className="mt-16">
          <Container>
            <h2 className="font-display text-2xl mb-6">Shop by category</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {top.map((c) => (
                <Link key={c.id} to={`/shop?category=${c.slug}`} className="group relative aspect-[16/9] overflow-hidden rounded-2xl border border-border">
                  {c.image?.url ? <img src={c.image.url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <Placeholder className="absolute inset-0" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute left-4 bottom-3 font-display text-xl text-white">{c.name}</span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      <Row title="New arrivals" query={{ sort: 'newest' }} to="/shop?sort=newest" />
      <Row title="Most loved" query={{ sort: 'popular' }} to="/shop?sort=popular" />

      {faqs.length > 0 && (
        <section className="mt-16">
          <Container>
            <div className="max-w-3xl mx-auto">
              <h2 className="font-display text-2xl mb-6">Frequently asked questions</h2>
              <div className="divide-y divide-border border-y border-border">
                {faqs.map((faq) => (
                  <details key={faq.id} className="py-4 group">
                    <summary className="cursor-pointer list-none font-medium flex items-center justify-between gap-4">
                      <span>{faq.question}</span><span className="text-primary text-xl" aria-hidden="true">+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-ink-muted whitespace-pre-line">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </Container>
        </section>
      )}

      <section className="mt-16">
        <Container className="grid gap-4 sm:grid-cols-3 text-center text-sm">
          {[['Cash on Delivery', 'Pay when your order arrives.'], ['Bank Transfer', 'Prefer to pay ahead? That works too.'], ['Track every order', 'Follow your parcel with your order number.']].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-border bg-surface p-5"><p className="font-display text-lg">{t}</p><p className="text-ink-muted mt-1">{d}</p></div>
          ))}
        </Container>
      </section>
    </>
  );
}
