import { Link } from 'react-router-dom';
import { Play, ArrowRight, Sparkles, Instagram } from 'lucide-react';
import { Container } from './ui';
import ProductCard from './ProductCard';
import NewsletterSubscription from './components/NewsletterSubscription';
import useApi from '../hooks/useApi';
import { productsApi } from '../services';

const itemsFrom = (v) => Array.isArray(v)
  ? v
  : String(v || '').split('\n').filter(Boolean).map((x) => {
    const [title, ...rest] = x.split('|');
    return { title: title.trim(), text: rest.join('|').trim() };
  });

const isExternal = (url) => /^https?:\/\//i.test(String(url || ''));
const SmartLink = ({ to, children, ...props }) => (
  isExternal(to)
    ? <a href={to} {...props}>{children}</a>
    : <Link to={to || '/shop'} {...props}>{children}</Link>
);

const queryFromConfig = (config = {}, type) => {
  const raw = String(config.query || '').trim();
  const parsed = {};
  if (raw) {
    raw.split(/[&,\s]+/).filter(Boolean).forEach((part) => {
      const match = part.match(/^(category|collection|brand|gender|maxPrice|minPrice|sort|q):(.+)$/i);
      if (match) parsed[match[1]] = match[2];
    });
    if (!Object.keys(parsed).length) parsed.q = raw;
  }
  if (type === 'best_sellers' && !parsed.sort) parsed.sort = 'popular';
  if (type === 'new_arrivals' && !parsed.sort) parsed.sort = 'newest';
  if (type === 'under_2000' && parsed.maxPrice === undefined) parsed.maxPrice = 2000;
  return parsed;
};

function ProductsSection({ section }) {
  const q = queryFromConfig(section.config, section.type);
  const limit = Math.min(12, Math.max(1, Number(section.config?.limit) || 4));
  const { data, loading } = useApi(
    () => productsApi.list({ ...q, limit }),
    [section.type, section.config?.limit, section.config?.query]
  );
  const products = data?.products || [];
  const defaultTitles = {
    best_sellers: 'Our best sellers',
    new_arrivals: 'New arrivals',
    under_2000: 'Luxury under Rs. 2,000',
    featured_collection: 'Discover your collection',
    gift_boxes: 'Gift the Afsana experience',
  };
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Afsana Perfumes</p>
            <h2 className="font-display text-3xl sm:text-4xl mt-2">{section.title || defaultTitles[section.type] || 'Explore our collection'}</h2>
          </div>
          <Link to="/shop" className="text-sm text-primary inline-flex items-center gap-1 shrink-0">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: Math.min(4, limit) }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-surface-raised animate-pulse" />)}
          </div>
        ) : products.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center text-sm text-ink-muted">No fragrances are available in this section yet.</div>
        )}
      </Container>
    </section>
  );
}

export default function HomepageSections({ sections, faqs }) {
  return <>{sections.map((s) => {
    const c = s.config || {};
    const type = s.type;

    if (['best_sellers', 'new_arrivals', 'under_2000', 'featured_collection', 'gift_boxes'].includes(type)) {
      return <ProductsSection key={s.id} section={s} />;
    }

    if (type === 'hero' || type === 'image_banner') {
      return (
        <section key={s.id} className="relative isolate min-h-[520px] sm:min-h-[720px] overflow-hidden bg-[#170d1d]">
          {c.imageUrl && <picture>{c.mobileImageUrl && <source media="(max-width: 639px)" srcSet={c.mobileImageUrl} />}<img src={c.imageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" /></picture>}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#120813]/85 via-[#2c1834]/55 to-transparent" />
          <Container className="min-h-[440px] sm:min-h-[620px] flex items-center py-16">
            <div className="max-w-2xl text-white">
              {c.eyebrow && <p className="text-xs uppercase tracking-[0.3em] text-primary">{c.eyebrow}</p>}
              <h1 className="font-display text-5xl sm:text-7xl leading-[0.95] mt-3">{s.title || 'Scents that tell your story'}</h1>
              {c.subtitle && <p className="mt-6 text-lg text-white/85 max-w-xl">{c.subtitle}</p>}
              {c.body && <p className="mt-4 text-sm sm:text-base text-white/75 max-w-xl whitespace-pre-line">{c.body}</p>}
              {c.buttonText && <SmartLink to={c.buttonLink} className="inline-flex mt-8 rounded-xl bg-primary px-6 py-3 text-white font-medium">{c.buttonText}</SmartLink>}
            </div>
          </Container>
        </section>
      );
    }

    if (type === 'video_banner') {
      return (
        <section key={s.id} className="relative isolate min-h-[420px] sm:min-h-[560px] overflow-hidden bg-black">
          {c.videoUrl ? (
            <video className="absolute inset-0 -z-10 h-full w-full object-cover" autoPlay={c.autoplay !== false} muted={c.muted !== false} loop playsInline poster={c.posterUrl || undefined} controls={!!c.controls}>
              <source src={c.videoUrl} />
            </video>
          ) : c.posterUrl && <img src={c.posterUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/60 via-black/25 to-black/10" />
          <Container className="min-h-[360px] sm:min-h-[500px] flex items-center justify-center text-center py-12">
            <div className="max-w-2xl text-white">
              <Play className="mx-auto w-8 h-8 mb-4 text-primary" />
              <h2 className="font-display text-4xl sm:text-6xl">{s.title || 'A fragrance story in motion'}</h2>
              {c.subtitle && <p className="mt-4 text-white/80">{c.subtitle}</p>}
              {c.body && <p className="mt-3 text-sm text-white/70 whitespace-pre-line">{c.body}</p>}
              {c.buttonText && <SmartLink to={c.buttonLink} className="inline-flex mt-7 rounded-xl bg-primary px-6 py-3 text-white">{c.buttonText}</SmartLink>}
            </div>
          </Container>
        </section>
      );
    }

    if (type === 'split_story') {
      return (
        <section key={s.id} className="py-14 sm:py-20 bg-[#f4eaf7]">
          <Container className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            {c.imageUrl && <img src={c.imageUrl} alt="" className="w-full aspect-[4/3] object-cover rounded-2xl shadow-card" />}
            <div>
              {c.eyebrow && <p className="text-xs uppercase tracking-[0.25em] text-primary">{c.eyebrow}</p>}
              <h2 className="font-display text-4xl mt-3">{s.title || 'A fragrance beyond time'}</h2>
              <p className="mt-5 text-ink-muted whitespace-pre-line leading-7">{c.body || c.subtitle}</p>
              {c.buttonText && <SmartLink to={c.buttonLink} className="inline-flex mt-7 rounded-xl bg-primary px-6 py-3 text-white">{c.buttonText}</SmartLink>}
            </div>
          </Container>
        </section>
      );
    }

    if (type === 'benefits') {
      return <section key={s.id} className="py-8 border-y border-[#d8bfdc] bg-[#fbf3fc]"><Container className="grid grid-cols-2 md:grid-cols-4 gap-4">{itemsFrom(c.items).map((x, i) => <div key={i} className="text-center px-3 py-2"><Sparkles className="mx-auto w-5 h-5 text-primary" /><p className="font-display text-lg mt-2">{x.title}</p><p className="text-xs text-ink-muted mt-1">{x.text}</p></div>)}</Container></section>;
    }

    if (type === 'testimonials' || type === 'blog_grid') {
      return <section key={s.id} className="py-14 sm:py-20"><Container><div className="text-center mb-8"><p className="text-xs uppercase tracking-[0.25em] text-primary">Afsana stories</p><h2 className="font-display text-3xl sm:text-4xl mt-2">{s.title || (type === 'testimonials' ? 'What our customers say' : 'Journal & stories')}</h2></div><div className="grid md:grid-cols-3 gap-5">{itemsFrom(c.items).map((x, i) => <article key={i} className="rounded-2xl border border-border bg-surface p-6 shadow-card"><p className="font-display text-xl">{x.title}</p><p className="mt-3 text-sm text-ink-muted leading-6">{x.text}</p></article>)}</div></Container></section>;
    }

    if (type === 'faq') {
      return <section key={s.id} className="py-14 sm:py-20"><Container><div className="max-w-3xl mx-auto"><h2 className="font-display text-3xl text-center mb-7">{s.title || 'Frequently asked questions'}</h2><div className="divide-y divide-border border-y border-border">{(faqs || []).map((f) => <details key={f.id} className="py-4"><summary className="cursor-pointer font-medium">{f.question}</summary><p className="mt-3 text-sm text-ink-muted leading-6 whitespace-pre-line">{f.answer}</p></details>)}</div></div></Container></section>;
    }

    if (type === 'newsletter') {
      return <section key={s.id} className="py-14 sm:py-20"><Container><NewsletterSubscription /></Container></section>;
    }

    if (type === 'instagram') {
      return (
        <section key={s.id} className="py-14 sm:py-20">
          <Container>
            <div className="rounded-2xl border border-border bg-surface p-7 sm:p-10 shadow-card text-center">
              <Instagram className="mx-auto w-7 h-7 text-primary" />
              <p className="text-xs uppercase tracking-[0.25em] text-primary mt-3">Afsana on Instagram</p>
              <h2 className="font-display text-3xl sm:text-4xl mt-2">{s.title || 'Follow the Afsana story'}</h2>
              {c.body && <p className="mt-3 text-sm text-ink-muted max-w-xl mx-auto whitespace-pre-line">{c.body}</p>}
              <SmartLink to={c.url || 'https://instagram.com'} className="inline-flex mt-6 rounded-xl bg-primary px-6 py-3 text-white">{c.buttonText || 'Follow us'}</SmartLink>
            </div>
          </Container>
        </section>
      );
    }

    if (type === 'rich_text') {
      return <section key={s.id} className="py-14 sm:py-20"><Container className="max-w-4xl"><h2 className="font-display text-3xl">{s.title}</h2><p className="mt-5 text-ink-muted leading-7 whitespace-pre-line">{c.body}</p></Container></section>;
    }

    if (type === 'spacer') {
      return <div key={s.id} aria-hidden style={{ height: Math.min(500, Math.max(20, Number(c.height) || 80)) }} />;
    }

    return null;
  })}</>;
}
