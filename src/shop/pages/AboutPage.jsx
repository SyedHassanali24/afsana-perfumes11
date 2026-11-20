import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import useApi from '../../hooks/useApi';
import { productsApi } from '../../services';
import useTitle from '../useTitle';
import ProductCard from '../ProductCard';
import { Container } from '../ui';

const Ey = ({ children, light = false }) => <p className={`eyebrow ${light ? 'text-[#ffbd37]' : 'text-[#496b4e]'}`}>{children}</p>;

export default function AboutPage() {
  useTitle('The House of AFSANA — The Art of Scent');
  const { data, loading } = useApi(() => productsApi.list({ sort: 'popular', limit: 36 }), []);
  const { data: featuredData, loading: featuredLoading } = useApi(() => productsApi.list({ q: 'Ember Light', limit: 8 }), []);
  const products = (data?.products || []).filter((product) => product?.image?.url);
  const featured = (featuredData?.products || []).find((product) => /\\bember\\s*light\\b/i.test(String(product?.name || '')) && product?.image?.url) || null;
  return <div className="bg-[#f7f4ed] text-[#173d26]">
    <section className="relative overflow-hidden bg-[#173d26] text-white">
      <Container className="relative grid min-h-[520px] items-center gap-8 py-16 sm:py-20 lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative z-10 max-w-2xl">
          <Ey light>THE HOUSE OF AFSANA</Ey>
          <h1 className="mt-6 font-display text-6xl leading-[.9] tracking-[-.05em] sm:text-8xl">A house of<br/><em className="text-[#ffbd37]">memories.</em></h1>
          <p className="mt-7 max-w-xl text-sm leading-8 text-white/75">AFSANA is a modern fragrance house built around the feeling a scent leaves behind. Discover the compositions, stories and rituals that make every fragrance personal.</p>
          <Link to="/shop" className="mt-8 inline-flex items-center gap-4 bg-[#ffbd37] px-6 py-4 text-[9px] font-bold uppercase tracking-[.18em] text-[#173d26]">Explore the collection <ArrowRight className="h-4 w-4"/></Link>
        </div>
        <div className="relative flex min-h-[340px] items-center justify-center">
          <div className="absolute h-[300px] w-[300px] rounded-full border border-[#ffbd37]/30 bg-[#ffbd37]/10 shadow-[0_0_85px_rgba(255,189,55,.12)]"/>
          {featured ? <Link to={`/product/${featured.slug}`} aria-label={`Explore ${featured.name}`} className="relative z-10 flex h-[360px] w-full items-center justify-center">
            <img src={featured.image.url} alt={featured.name} width="900" height="1200" loading="eager" decoding="async" className="h-full max-h-[360px] w-full object-contain drop-shadow-[0_28px_38px_rgba(0,0,0,.42)]"/>
          </Link> : <div className="relative z-10 text-center"><b className="font-display text-5xl text-[#ffbd37]">AFSANA</b><p className="mt-3 text-[9px] tracking-[.28em] text-white/60">{featuredLoading ? 'LOADING EMBER LIGHT' : 'EMBER LIGHT IMAGE NOT SET IN THE LIVE CATALOGUE'}</p></div>}
          {featured?.name && <p className="absolute bottom-0 text-[9px] font-bold uppercase tracking-[.25em] text-[#ffbd37]">{featured.name}</p>}
        </div>
      </Container>
    </section>
    <section className="py-20 sm:py-28">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div><Ey>OUR PHILOSOPHY</Ey><h2 className="mt-6 font-display text-5xl leading-[.95] sm:text-7xl">A little unexpected.<br/><em>A lot unforgettable.</em></h2></div>
          <div className="max-w-2xl text-sm leading-8 text-[#687363]">
            <p>We believe fragrance is more than a finishing touch. It is part of how a moment feels, how a memory returns and how a person chooses to be remembered.</p>
            <p className="mt-5">The AFSANA collection brings together different moods and scent directions—from bright and effortless to warm, deep and expressive—so you can find the fragrance that feels like your own.</p>
            <p className="mt-5">Explore the current collection, discover the notes that draw you in and make fragrance part of your own daily ritual.</p>
            <Link to="/discover" className="mt-7 inline-flex items-center gap-3 border-b border-[#496b4e]/40 pb-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#173d26]">Find your scent <ArrowRight className="h-4 w-4"/></Link>
          </div>
        </div>
      </Container>
    </section>
    <section className="bg-[#173d26] py-16 text-white sm:py-20">
      <Container>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            ['01','A considered collection','Explore the live AFSANA fragrances and their distinct personalities.'],
            ['02','Find your own ritual','Choose a scent for your mood, moment and personal style.'],
            ['03','Made to be remembered','A fragrance becomes part of the moments you carry with you.']
          ].map(([number,title,body])=><article key={number} className="border-t border-[#ffbd37]/40 pt-5">
            <span className="text-[9px] tracking-[.25em] text-[#ffbd37]">{number} / THE AFSANA WAY</span>
            <h3 className="mt-5 font-display text-3xl">{title}</h3>
            <p className="mt-3 text-xs leading-7 text-white/65">{body}</p>
          </article>)}
        </div>
      </Container>
    </section>
    <section className="py-20 sm:py-28">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><Ey>THE AFSANA OBJECTS</Ey><h2 className="mt-5 font-display text-5xl sm:text-7xl">Meet the collection.</h2></div><Link to="/shop" className="text-[9px] font-bold uppercase tracking-[.18em]">View every fragrance ↗</Link></div>
        {products.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{products.slice(0,8).map(product=><ProductCard key={product.id || product.slug} product={product}/>)}</div> : <p className="border border-[#173d26]/15 bg-white p-6 text-sm text-[#687363]">{loading ? 'Loading the live AFSANA collection…' : 'Product photos will appear here when primary images are added to the published catalogue.'}</p>}
      </Container>
    </section>
    <section className="bg-[#e8ede5] py-16">
      <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div><Ey>YOUR AFSANA STORY</Ey><h2 className="mt-3 font-display text-4xl sm:text-5xl">Find the scent that feels like you.</h2></div>
        <Link to="/discover" className="inline-flex items-center gap-3 bg-[#173d26] px-6 py-4 text-[9px] font-bold uppercase tracking-[.18em] text-white">Start scent intelligence <Sparkles className="h-4 w-4"/></Link>
      </Container>
    </section>
  </div>;
}
