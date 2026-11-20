import { Link } from 'react-router-dom';
import { ArrowRight, Gift, MessageCircle } from 'lucide-react';
import useApi from '../../hooks/useApi';
import { productsApi } from '../../services';
import useTitle from '../useTitle';
import ProductCard from '../ProductCard';
import { Container } from '../ui';

const Ey = ({ children, light = false }) => <p className={`eyebrow ${light ? 'text-[#ffbd37]' : 'text-[#496b4e]'}`}>{children}</p>;

export default function GiftingPage() {
  useTitle('AFSANA Gifting — Give a Memory');
  const { data, loading } = useApi(() => productsApi.list({ sort: 'popular', limit: 36 }), []);
  const products = (data?.products || []).filter((product) => product?.image?.url);
  const whatsapp = 'https://wa.me/923252032321?text=' + encodeURIComponent('Assalam-o-Alaikum! I would like help choosing an AFSANA perfume as a gift.');
  return <div className="bg-[#f7f4ed] text-[#173d26]">
    <section className="relative overflow-hidden bg-[#173d26] text-white">
      <Container className="relative grid min-h-[500px] items-center gap-8 py-16 sm:py-20 lg:grid-cols-[1.05fr_.95fr]">
        <div className="max-w-2xl">
          <Ey light>THE ART OF GIVING</Ey>
          <h1 className="mt-6 font-display text-6xl leading-[.9] tracking-[-.05em] sm:text-8xl">Give a<br/><em className="text-[#ffbd37]">memory.</em></h1>
          <p className="mt-7 max-w-xl text-sm leading-8 text-white/75">A fragrance is a personal kind of gift. Choose an AFSANA scent for birthdays, celebrations, thank-yous or the moments that deserve something thoughtful.</p>
          <Link to="/shop" className="mt-8 inline-flex items-center gap-4 bg-[#ffbd37] px-6 py-4 text-[9px] font-bold uppercase tracking-[.18em] text-[#173d26]">Explore gift fragrances <ArrowRight className="h-4 w-4"/></Link>
        </div>
        <div className="relative flex min-h-[330px] items-center justify-center">
          <div className="absolute h-[280px] w-[280px] rounded-full border border-[#ffbd37]/30 bg-[#ffbd37]/10"/>
          {products[0] ? <Link to={`/product/${products[0].slug}`} className="relative z-10 flex h-[340px] w-full items-center justify-center">
            <img src={products[0].image.url} alt={products[0].name} width="900" height="1200" loading="eager" decoding="async" className="h-full max-h-[340px] w-full object-contain drop-shadow-[0_26px_36px_rgba(0,0,0,.4)]"/>
          </Link> : <div className="relative z-10 text-center"><b className="font-display text-5xl text-[#ffbd37]">AFSANA</b><p className="mt-3 text-[9px] tracking-[.24em] text-white/60">{loading ? 'LOADING THE COLLECTION' : 'GIVE A MEMORY'}</p></div>}
          {products[0]?.name && <p className="absolute bottom-0 text-[9px] font-bold uppercase tracking-[.25em] text-[#ffbd37]">{products[0].name}</p>}
        </div>
      </Container>
    </section>
    <section className="py-16 sm:py-24">
      <Container>
        <div className="mb-10 max-w-2xl"><Ey>THE GIFT EDIT</Ey><h2 className="mt-5 font-display text-5xl sm:text-7xl">A thoughtful choice, beautifully personal.</h2><p className="mt-5 text-sm leading-8 text-[#687363]">Browse real fragrances from the current AFSANA catalogue. Choose a scent you know they will love—or ask the house for a little guidance.</p></div>
        {products.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{products.slice(0,8).map(product=><ProductCard key={product.id || product.slug} product={product}/>)}</div> : <p className="border border-[#173d26]/15 bg-white p-6 text-sm text-[#687363]">{loading ? 'Loading giftable AFSANA fragrances…' : 'Add primary product photos to the published catalogue to show the gift collection here.'}</p>}
      </Container>
    </section>
    <section className="bg-[#e8ede5] py-16 sm:py-20">
      <Container>
        <div className="grid gap-8 md:grid-cols-3">
          <article><Gift className="h-6 w-6 text-[#6d875e]"/><h3 className="mt-4 font-display text-3xl">Choose the fragrance</h3><p className="mt-3 text-xs leading-7 text-[#687363]">Browse the live collection and choose the bottle that best suits the person and occasion.</p></article>
          <article><Sparkles className="h-6 w-6 text-[#6d875e]"/><h3 className="mt-4 font-display text-3xl">Make it personal</h3><p className="mt-3 text-xs leading-7 text-[#687363]">Use the scent finder to explore fragrance moods and find a direction for your gift.</p><Link to="/discover" className="mt-4 inline-flex text-[9px] font-bold uppercase tracking-[.16em]">Find a scent ↗</Link></article>
          <article><MessageCircle className="h-6 w-6 text-[#6d875e]"/><h3 className="mt-4 font-display text-3xl">Ask the house</h3><p className="mt-3 text-xs leading-7 text-[#687363]">Need help choosing? Message the AFSANA team for fragrance and order guidance.</p><a href={whatsapp} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-[9px] font-bold uppercase tracking-[.16em]">WhatsApp AFSANA ↗</a></article>
        </div>
      </Container>
    </section>
  </div>;
}
