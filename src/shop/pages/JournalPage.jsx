import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import useApi from '../../hooks/useApi';
import { productsApi } from '../../services';
import useTitle from '../useTitle';
import ProductCard from '../ProductCard';
import { Container } from '../ui';

const Ey = ({ children }) => <p className="eyebrow text-[#496b4e]">{children}</p>;

export default function JournalPage() {
  useTitle('The AFSANA Journal — Notes from the House');
  const { data, loading } = useApi(() => productsApi.list({ sort: 'popular', limit: 36 }), []);
  const { data: featuredData, loading: featuredLoading } = useApi(() => productsApi.list({ q: 'Rose Miracle', limit: 8 }), []);
  const products = (data?.products || []).filter((product) => product?.image?.url);
  const roseMiracle = (featuredData?.products || []).find((product) => String(product?.name || '').toLowerCase().includes('rose miracle') && product?.image?.url) || null;
  const stories = [
    ['01 / THE SIGNATURE GUIDE','Find your signature scent','Begin with the feeling you want to carry. Explore the current AFSANA fragrances and find a composition that fits your mood and moment.'],
    ['02 / NOTES & ATMOSPHERE','A world in every note','Fresh, floral, woody and warm directions each create a different atmosphere. Discover the AFSANA collection and the bottle that speaks to you.'],
    ['03 / THE GIFT EDIT','A gift worth remembering','A fragrance can make a personal gesture feel even more considered. Explore AFSANA scents for birthdays, celebrations and everyday surprises.']
  ];
  return <div className="bg-[#f7f4ed] text-[#173d26]">
    <section className="relative overflow-hidden bg-[#173d26] py-16 text-white sm:py-20">
      <Container className="grid items-center gap-8 lg:grid-cols-[1fr_.8fr]">
        <div><Ey>NOTES FROM THE HOUSE</Ey><h1 className="mt-6 font-display text-6xl leading-[.9] tracking-[-.05em] sm:text-8xl">The scent<br/><em className="text-[#ffbd37]">journal.</em></h1><p className="mt-7 max-w-xl text-sm leading-8 text-white/75">Stories, ingredients and rituals from the world of AFSANA. Discover the fragrances behind the moments we remember.</p></div>
        <div className="relative flex min-h-[300px] items-center justify-center">
          <div className="absolute h-[260px] w-[260px] rounded-full border border-[#ffbd37]/25 bg-[#ffbd37]/10"/>
          {roseMiracle ? <Link to={`/product/${roseMiracle.slug}`} aria-label={`Explore ${roseMiracle.name}`} className="relative z-10 flex h-[310px] w-full items-center justify-center"><img src={roseMiracle.image.url} alt={roseMiracle.name} width="900" height="1200" loading="eager" decoding="async" className="h-full max-h-[310px] w-full object-contain drop-shadow-[0_28px_36px_rgba(0,0,0,.4)]"/></Link> : <div className="relative z-10 text-center"><b className="font-display text-5xl text-[#ffbd37]">AFSANA</b><p className="mt-2 text-[9px] tracking-[.2em] text-white/60">{featuredLoading ? 'LOADING ROSE MIRACLE' : 'ROSE MIRACLE IMAGE NOT SET IN THE LIVE CATALOGUE'}</p></div>}
          {roseMiracle?.name && <p className="absolute bottom-0 text-[9px] font-bold uppercase tracking-[.25em] text-[#ffbd37]">{roseMiracle.name}</p>}
        </div>
      </Container>
    </section>
    <section className="py-16 sm:py-24">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><Ey>THE EDITORIAL</Ey><h2 className="mt-4 font-display text-5xl sm:text-7xl">Ideas to linger.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[#687363]">Explore AFSANA fragrances through signature guides, scent notes and thoughtful gifting.</p></div><BookOpen className="h-8 w-8 text-[#8d9b78]"/></div>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_.85fr]">
          {stories.map(([kicker,title,body],i)=>{
            const product=products[i];
            return <article key={title} className={`overflow-hidden rounded-2xl border border-[#173d26]/10 bg-white ${i===0?'lg:row-span-3':''}`}>
              <Link to={product?.slug?`/product/${product.slug}`:'/shop'} className={`relative block overflow-hidden bg-[#173d26] ${i===0?'h-[330px] sm:h-[460px]':'h-[210px]'}`}>
                {product?.image?.url ? <img src={product.image.url} alt={product.name} width="1200" height="1000" loading="lazy" decoding="async" className="h-full w-full object-contain p-5 transition duration-700 hover:scale-[1.03]"/> : <div className="grid h-full place-items-center font-display text-4xl text-[#ffbd37]">AFSANA</div>}
                {product?.name && <span className="absolute bottom-4 left-4 bg-[#173d26]/90 px-3 py-2 text-[8px] font-bold uppercase tracking-[.18em] text-[#ffbd37]">{product.name}</span>}
              </Link>
              <div className="p-6 sm:p-7"><p className="text-[8px] font-bold uppercase tracking-[.22em] text-[#748e40]">{kicker}</p><h3 className="mt-3 font-display text-3xl sm:text-4xl">{title}</h3><p className="mt-3 text-xs leading-7 text-[#687363]">{body}</p><Link to={product?.slug?`/product/${product.slug}`:'/shop'} className="mt-5 inline-flex items-center gap-3 text-[9px] font-bold uppercase tracking-[.16em]">Explore fragrance <ArrowRight className="h-4 w-4"/></Link></div>
            </article>;
          })}
        </div>
      </Container>
    </section>
    <section className="bg-[#e8ede5] py-16 sm:py-20">
      <Container><div className="mb-9"><Ey>SCENT / IN OBJECTS</Ey><h2 className="mt-4 font-display text-5xl sm:text-6xl">The fragrances in our stories.</h2></div>
        {products.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{products.slice(0,8).map(product=><ProductCard key={product.id || product.slug} product={product}/>)}</div> : <p className="text-sm text-[#687363]">{loading?'Loading the AFSANA catalogue…':'Published product images will appear here once added in the catalogue.'}</p>}
      </Container>
    </section>
  </div>;
}
