import { Link } from 'react-router-dom';
import { ArrowRight, Check, Instagram, Play, Quote, Sparkles } from 'lucide-react';
import { Container } from './ui';
import ProductCard from './ProductCard';
import NewsletterSubscription from './components/NewsletterSubscription';
import useApi from '../hooks/useApi';
import { productsApi, publicTaxonomyApi } from '../services';

const itemsFrom = (v) => Array.isArray(v) ? v : String(v || '').split('\n').filter(Boolean).map((x) => {
  const [title, ...rest] = x.split('|'); return { title: title.trim(), text: rest.join('|').trim() };
});
const isExternal = (url) => /^https?:\/\//i.test(String(url || ''));
const SmartLink = ({ to, children, ...props }) => isExternal(to) ? <a href={to} {...props}>{children}</a> : <Link to={to || '/shop'} {...props}>{children}</Link>;

const queryFromConfig = (config = {}, type) => {
  const raw = String(config.query || '').trim(), parsed = {};
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

function SectionIntro({ eyebrow='THE AFSANA EDIT', title, text, light=false, centered=true }) {
  return <div className={`mb-10 sm:mb-14 ${centered ? 'text-center mx-auto max-w-2xl' : ''} ${light ? 'text-white' : ''}`}>
    <p className={`text-[10px] sm:text-xs uppercase tracking-[.34em] font-semibold ${light ? 'text-gold' : 'text-primary'}`}>{eyebrow}</p>
    <div className="gold-line w-16 my-4 mx-auto" />
    <h2 className="font-display text-3xl sm:text-5xl leading-tight">{title}</h2>
    {text && <p className={`mt-4 text-sm sm:text-base leading-7 ${light ? 'text-white/70' : 'text-ink-muted'}`}>{text}</p>}
  </div>;
}

function ProductsSection({ section }) {
  const q = queryFromConfig(section.config, section.type);
  const limit = Math.min(12, Math.max(1, Number(section.config?.limit) || 4));
  const { data, loading } = useApi(() => productsApi.list({ ...q, limit }), [section.type, section.config?.limit, section.config?.query]);
  const products = data?.products || [];
  const titles = { best_sellers:'The Afsana Icons', new_arrivals:'New in the House', under_2000:'Luxury Within Reach', featured_collection:'Curated Collections', gift_boxes:'The Art of Gifting' };
  return <section className="py-16 sm:py-24 bg-bg">
    <Container>
      <SectionIntro eyebrow={section.config?.eyebrow || 'THE COLLECTION'} title={section.title || titles[section.type] || 'Explore the collection'} text={section.config?.subtitle} centered={false}/>
      {loading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-7">{Array.from({length:Math.min(4,limit)}).map((_,i)=><div key={i} className="aspect-[4/5] rounded-[2rem] bg-surface-raised animate-pulse"/>)}</div>
      : products.length ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-7">{products.map(p=><ProductCard key={p.id} product={p}/>)}</div>
      : <div className="rounded-3xl border border-border bg-surface p-10 text-center text-sm text-ink-muted">Our next fragrance edit is being prepared.</div>}
      <div className="mt-10 text-center"><Link to="/shop" className="inline-flex items-center gap-2 text-xs uppercase tracking-[.2em] font-semibold text-primary hover:text-gold transition-colors">Explore all fragrances <ArrowRight className="w-4 h-4"/></Link></div>
    </Container>
  </section>;
}

function Hero({ section }) {
  const c=section.config||{};
  const {data}=useApi(()=>productsApi.list({sort:'popular',limit:1}),[]);
  const heroProduct=data?.products?.[0];
  const heroImage=c.imageUrl||heroProduct?.image?.url;
  return <section className="relative isolate min-h-[680px] sm:min-h-[780px] overflow-hidden bg-[#160c19] text-white">
    {heroImage && <picture>{c.mobileImageUrl&&<source media="(max-width:639px)" srcSet={c.mobileImageUrl}/>}<img src={heroImage} alt="" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-35"/></picture>}
    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_74%_42%,rgba(200,161,95,.34),transparent_26%),linear-gradient(90deg,rgba(18,8,19,.98) 0%,rgba(36,18,42,.86) 52%,rgba(18,8,19,.35) 100%)]"/>
    <Container className="relative flex min-h-[680px] sm:min-h-[780px] items-center py-24">
      <div className="grid lg:grid-cols-[1.05fr_.95fr] items-center gap-8 lg:gap-14 w-full">
        <div className="max-w-2xl luxury-reveal">
          <div className="flex items-center gap-3 text-gold text-[10px] uppercase tracking-[.4em] font-semibold"><span className="w-10 h-px bg-gold"/>{c.eyebrow||'AFSANA PERFUMES'}</div>
          <h1 className="font-display text-5xl sm:text-7xl lg:text-[6.4rem] leading-[.9] mt-6">{section.title||'A scent that becomes your signature.'}</h1>
          <p className="mt-7 text-base sm:text-lg leading-8 text-white/75 max-w-xl">{c.subtitle||'Discover refined fragrances composed for presence, memory and everyday luxury.'}</p>
          {c.body&&<p className="mt-3 text-sm text-white/55 max-w-lg leading-6">{c.body}</p>}
          <div className="mt-9 flex flex-wrap gap-3">
            <SmartLink to={c.buttonLink||'/shop'} className="group inline-flex items-center gap-3 rounded-full bg-gold px-7 py-3.5 text-[#24152b] text-sm font-semibold transition hover:bg-white">{c.buttonText||'Shop the collection'}<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1"/></SmartLink>
            <Link to="/shop?gender=Women" className="inline-flex items-center rounded-full border border-white/30 px-7 py-3.5 text-sm font-medium hover:border-gold hover:text-gold transition">Discover for her</Link>
          </div>
          <div className="mt-12 flex items-center gap-7 text-[10px] uppercase tracking-[.22em] text-white/50"><span>Crafted with intention</span><span className="w-1 h-1 rounded-full bg-gold"/><span>Made to linger</span></div>
        </div>
        <div className="hidden lg:flex justify-center luxury-float">
          <div className="relative w-[330px] h-[470px]">
            <div className="absolute inset-8 rounded-full bg-gold/20 blur-3xl"/>
            <div className="absolute inset-0 rounded-[12rem] border border-gold/30 bg-white/[.04] backdrop-blur-[2px]"/>
            {heroImage ? <img src={heroImage} alt="" className="absolute inset-10 w-[250px] h-[360px] object-contain drop-shadow-[0_30px_35px_rgba(0,0,0,.55)]"/> : <div className="absolute inset-x-20 top-20 bottom-20 rounded-[5rem] bg-gradient-to-b from-[#e5d1ad] via-[#b9874e] to-[#3a1e3d] shadow-2xl"/>}
            <div className="absolute bottom-2 inset-x-0 text-center"><p className="text-[9px] uppercase tracking-[.35em] text-gold">The Afsana signature</p><p className="font-display text-xl mt-2">{heroProduct?.name||'Signature Collection'}</p></div>
          </div>
        </div>
      </div>
    </Container>
    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg to-transparent"/>
  </section>;
}

function VideoBanner({ section }) {
  const c=section.config||{};
  return <section className="relative isolate min-h-[480px] sm:min-h-[620px] overflow-hidden bg-black text-white">
    {c.videoUrl ? <video className="absolute inset-0 -z-20 h-full w-full object-cover" autoPlay={c.autoplay!==false} muted={c.muted!==false} loop playsInline poster={c.posterUrl||undefined} controls={!!c.controls}><source src={c.videoUrl}/></video>
    : c.posterUrl ? <img src={c.posterUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover"/> : null}
    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-black/20"/>
    <Container className="min-h-[480px] sm:min-h-[620px] flex items-center justify-center text-center py-16"><div className="max-w-3xl luxury-reveal">
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-gold/60 text-gold mb-7"><Play className="w-5 h-5 ml-0.5"/></span>
      <p className="text-[10px] uppercase tracking-[.4em] text-gold">THE AFSANA FILM</p>
      <h2 className="font-display text-4xl sm:text-6xl mt-4">{section.title||'See the story behind the scent'}</h2>
      {c.subtitle&&<p className="mt-5 text-white/70">{c.subtitle}</p>}
      {c.buttonText&&<SmartLink to={c.buttonLink} className="inline-flex mt-8 rounded-full border border-white/30 px-7 py-3 text-sm hover:border-gold hover:text-gold transition">{c.buttonText}</SmartLink>}
    </div></Container>
  </section>;
}

function SplitStory({section}) {
  const c=section.config||{};
  return <section className="py-20 sm:py-28 bg-surface"><Container className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
    <div className="relative luxury-reveal">
      <div className="absolute -inset-4 border border-gold/25 rounded-[2rem] translate-x-3 translate-y-3"/>
      {c.imageUrl?<img src={c.imageUrl} alt="" className="relative w-full aspect-[4/5] object-cover rounded-[1.75rem] shadow-hover"/>:<div className="relative aspect-[4/5] rounded-[1.75rem] bg-[radial-gradient(circle_at_50%_35%,#8c5c8f,#24152b_65%)]"/>}
    </div>
    <div className="lg:pl-4">
      <p className="text-[10px] uppercase tracking-[.35em] text-primary font-semibold">{c.eyebrow||'THE AFSANA STORY'}</p>
      <div className="gold-line w-14 my-5"/>
      <h2 className="font-display text-4xl sm:text-6xl leading-tight">{section.title||'Luxury is not loud. It lingers.'}</h2>
      <p className="mt-7 text-ink-muted leading-8 whitespace-pre-line">{c.body||c.subtitle||'Every Afsana fragrance is an invitation to leave an impression — quietly, beautifully and unmistakably yours.'}</p>
      {c.buttonText&&<SmartLink to={c.buttonLink} className="inline-flex mt-8 items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-white text-sm font-semibold hover:bg-primary-hover transition">{c.buttonText}<ArrowRight className="w-4 h-4"/></SmartLink>}
    </div>
  </Container></section>;
}


function CategoryTiles({section}) {
  const {data,loading}=useApi(()=>publicTaxonomyApi.list('categories'),[]);
  const cats=(data?.items||[]).filter(x=>!x.parentId).slice(0,6);
  if(loading) return <section className="py-16"><Container><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><div key={i} className="aspect-[4/3] rounded-[1.5rem] bg-surface-raised animate-pulse"/>)}</div></Container></section>;
  return <section className="py-20 sm:py-28 bg-bg"><Container><SectionIntro eyebrow="SHOP BY MOOD" title={section.title||'Find your fragrance world'} text={section.config?.subtitle}/>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">{cats.map((cat,i)=><Link key={cat.id} to={'/shop?category='+encodeURIComponent(cat.slug)} className="group relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-border bg-[#24152b]">
      {cat.image?.url?<img src={cat.image.url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-75 transition duration-700 group-hover:scale-105 group-hover:opacity-90"/>:<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(200,161,95,.55),transparent_30%),linear-gradient(135deg,#24152b,#743d78)]"/>}
      <div className="absolute inset-0 bg-gradient-to-t from-[#120813] via-transparent to-transparent"/>
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-white"><p className="text-[9px] uppercase tracking-[.3em] text-gold">Collection {String(i+1).padStart(2,'0')}</p><h3 className="font-display text-2xl sm:text-3xl mt-1">{cat.name}</h3><span className="inline-flex items-center gap-1 mt-3 text-[10px] uppercase tracking-[.2em] text-white/70">Explore <ArrowRight className="w-3 h-3"/></span></div>
    </Link>)}</div>
  </Container></section>;
}

function CinematicStatement({section}) {
  const c=section.config||{};
  return <section className="relative overflow-hidden py-24 sm:py-36 bg-[#160c19] text-white">
    <div className="absolute -left-24 top-10 w-72 h-72 rounded-full bg-[#743d78]/30 blur-3xl"/>
    <div className="absolute -right-24 bottom-0 w-80 h-80 rounded-full bg-gold/20 blur-3xl"/>
    <Container className="relative max-w-5xl text-center luxury-reveal">
      <p className="text-[10px] uppercase tracking-[.42em] text-gold">{c.eyebrow||'THE ART OF PERFUMERY'}</p>
      <div className="gold-line w-20 my-6 mx-auto"/>
      <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl leading-[.95]">{section.title||'Wear the memory. Leave the impression.'}</h2>
      {c.body&&<p className="max-w-2xl mx-auto mt-7 text-white/65 leading-8">{c.body}</p>}
      {c.buttonText&&<SmartLink to={c.buttonLink||'/shop'} className="inline-flex mt-9 rounded-full border border-gold/50 px-7 py-3.5 text-sm text-gold hover:bg-gold hover:text-[#24152b] transition">{c.buttonText}<ArrowRight className="w-4 h-4"/></SmartLink>}
    </Container>
  </section>;
}

function Lookbook({section}) {
  const c=section.config||{};
  const cards=itemsFrom(c.items||'The signature edit|/shop\nFor evenings|/shop?sort=popular\nFor every day|/shop?sort=newest');
  return <section className="py-20 sm:py-28 bg-surface"><Container><SectionIntro eyebrow="THE LOOKBOOK" title={section.title||'A fragrance wardrobe for every moment'} text={c.subtitle}/>
    <div className="grid md:grid-cols-3 gap-4 sm:gap-6">{cards.slice(0,3).map((x,i)=><SmartLink key={i} to={x.text||'/shop'} className="group relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#24152b] border border-border">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(200,161,95,.38),transparent_25%),linear-gradient(145deg,#743d78,#160c19)] transition duration-700 group-hover:scale-105"/>
      <div className="absolute inset-0 bg-gradient-to-t from-[#120813] via-transparent to-transparent"/>
      <div className="absolute bottom-0 inset-x-0 p-6 text-white"><p className="text-[9px] uppercase tracking-[.3em] text-gold">Edit {String(i+1).padStart(2,'0')}</p><h3 className="font-display text-2xl mt-2">{x.title}</h3><span className="inline-flex items-center gap-1 mt-4 text-[10px] uppercase tracking-[.2em] text-white/65">Discover <ArrowRight className="w-3 h-3"/></span></div>
    </SmartLink>)}</div>
  </Container></section>;
}

function ValuesGrid({section}) {
  const items=itemsFrom(section.config?.items||'Crafted to be remembered|A considered fragrance experience from first spray to dry down.\nDesigned with intention|Elegant details without unnecessary noise.\nMade for your ritual|A signature for mornings, evenings and everything between.\nDelivered with care|Beautifully packed from house to home.');
  return <section className="py-16 sm:py-22 bg-primary-soft"><Container><SectionIntro eyebrow="THE AFSANA STANDARD" title={section.title||'Details matter'}/><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{items.slice(0,4).map((x,i)=><article key={i} className="luxury-card rounded-[1.5rem] border border-border bg-surface p-6"><span className="font-display text-4xl text-gold/70">0{i+1}</span><h3 className="font-display text-xl mt-4">{x.title}</h3><p className="text-sm text-ink-muted leading-6 mt-2">{x.text}</p></article>)}</div></Container></section>;
}


  const {data,loading}=useApi(()=>publicTaxonomyApi.list('categories'),[]);
  const cats=(data?.items||[]).filter(x=>!x.parentId).slice(0,6);
  if(loading) return <section className="py-16"><Container><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><div key={i} className="aspect-[4/3] rounded-[1.5rem] bg-surface-raised animate-pulse"/>)}</div></Container></section>;
  return <section className="py-20 sm:py-28 bg-bg"><Container><SectionIntro eyebrow="SHOP BY MOOD" title={section.title||'Find your fragrance world'} text={section.config?.subtitle}/>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">{cats.map((cat,i)=><Link key={cat.id} to={'/shop?category='+encodeURIComponent(cat.slug)} className="group relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-border bg-[#24152b]">
      {cat.image?.url?<img src={cat.image.url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-75 transition duration-700 group-hover:scale-105 group-hover:opacity-90"/>:<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(200,161,95,.55),transparent_30%),linear-gradient(135deg,#24152b,#743d78)]"/>}
      <div className="absolute inset-0 bg-gradient-to-t from-[#120813] via-transparent to-transparent"/>
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-white"><p className="text-[9px] uppercase tracking-[.3em] text-gold">Collection {String(i+1).padStart(2,'0')}</p><h3 className="font-display text-2xl sm:text-3xl mt-1">{cat.name}</h3><span className="inline-flex items-center gap-1 mt-3 text-[10px] uppercase tracking-[.2em] text-white/70">Explore <ArrowRight className="w-3 h-3"/></span></div>
    </Link>)}</div>
  </Container></section>;
}

function Marquee({section}) {
  const items=itemsFrom(section.config?.items||'Afsana Perfumes|Crafted with intention\nMade to linger|A signature worth remembering');
  const repeated=[...items,...items,...items,...items];
  return <section className="overflow-hidden border-y border-gold/20 bg-[#160c19] text-gold"><div className="marquee-track flex items-center py-4">{repeated.map((x,i)=><div key={i} className="flex items-center whitespace-nowrap"><span className="text-[10px] sm:text-xs uppercase tracking-[.3em] font-semibold px-7">{x.title}</span><span className="w-1.5 h-1.5 rounded-full bg-gold/70"/></div>)}</div></section>;
}

function TrustGrid({section}) {
  const items=itemsFrom(section.config?.items||'Authentic fragrances|Original Afsana collection\nSecure checkout|Protected customer sessions\nCarefully packed|Every order handled with care\nTrack your order|Stay close to your delivery');
  return <section className="py-14 sm:py-18 bg-surface"><Container><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{items.slice(0,4).map((x,i)=><div key={i} className="rounded-2xl border border-border p-5 sm:p-6 luxury-card"><Check className="w-4 h-4 text-gold"/><h3 className="font-display text-lg mt-3">{x.title}</h3><p className="text-xs leading-5 text-ink-muted mt-1">{x.text}</p></div>)}</div></Container></section>;
}

function Benefits({section}) {
  const items=itemsFrom(section.config?.items||'Signature-worthy sillage|Designed to be remembered\nThoughtful ingredients|Chosen for a beautiful finish\nElegant packaging|Ready to gift or keep\nPakistan-wide delivery|Packed with care');
  return <section className="border-y border-border bg-surface-raised py-8 sm:py-10"><Container><div className="grid grid-cols-2 md:grid-cols-4">{items.slice(0,4).map((x,i)=><div key={i} className={`px-4 py-3 text-center ${i?'border-l border-border':''}`}><Sparkles className="w-4 h-4 mx-auto text-gold"/><p className="font-display text-lg mt-2">{x.title}</p><p className="text-[11px] text-ink-muted mt-1 leading-5">{x.text}</p></div>)}</div></Container></section>;
}

function EditorialCards({section}) {
  const items=itemsFrom(section.config?.items||'The language of scent|How fragrance becomes memory and identity.\nFrom first spray to dry down|Understanding the quiet evolution of a perfume.\nThe art of gifting|A thoughtful fragrance says more than words.');
  return <section className="py-20 sm:py-28 bg-primary-soft"><Container><SectionIntro eyebrow="THE JOURNAL" title={section.title||'Notes from the house'} text={section.config?.subtitle}/>
    <div className="grid md:grid-cols-3 gap-5">{items.slice(0,3).map((x,i)=><article key={i} className="group luxury-card rounded-[1.75rem] border border-border bg-surface overflow-hidden"><div className="aspect-[16/10] bg-[radial-gradient(circle_at_20%_20%,rgba(200,161,95,.5),transparent_35%),linear-gradient(135deg,#24152b,#743d78)]"/><div className="p-6 sm:p-7"><p className="text-[10px] uppercase tracking-[.25em] text-primary">Journal {String(i+1).padStart(2,'0')}</p><h3 className="font-display text-2xl mt-3">{x.title}</h3><p className="mt-3 text-sm leading-6 text-ink-muted">{x.text}</p><Link to="/shop" className="inline-flex mt-5 items-center gap-1 text-xs uppercase tracking-[.18em] font-semibold text-primary">Read more <ArrowRight className="w-3 h-3"/></Link></div></article>)}</div>
  </Container></section>;
}

function Testimonials({section}) {
  const items=itemsFrom(section.config?.items||'A perfume that feels incredibly polished from the first spray.|Verified customer\nThe packaging and scent both feel premium. Beautifully done.|Verified customer\nI finally found a signature fragrance that feels like me.|Verified customer');
  return <section className="py-20 sm:py-28 bg-[#24152b] text-white"><Container><SectionIntro light eyebrow="THE AFSANA EXPERIENCE" title={section.title||'Loved, remembered, recommended.'}/>
    <div className="grid md:grid-cols-3 gap-5">{items.slice(0,3).map((x,i)=><article key={i} className="rounded-[1.75rem] border border-white/10 bg-white/[.04] p-7 sm:p-8"><Quote className="w-7 h-7 text-gold"/><p className="font-display text-xl leading-8 mt-6">“{x.title}”</p><p className="mt-5 text-[10px] uppercase tracking-[.2em] text-white/45">{x.text||'Afsana customer'}</p></article>)}</div>
  </Container></section>;
}

function Faq({faqs,section}) {
  return <section className="py-20 sm:py-28 bg-bg"><Container className="max-w-4xl"><SectionIntro eyebrow="QUESTIONS" title={section.title||'Everything you need to know'}/><div className="border-y border-border">{(faqs||[]).length ? faqs.map(f=><details key={f.id} className="group py-5 border-b last:border-b-0 border-border"><summary className="cursor-pointer list-none flex items-center justify-between gap-5 font-display text-xl">{f.question}<span className="text-gold text-2xl group-open:rotate-45 transition-transform">+</span></summary><p className="mt-4 text-sm leading-7 text-ink-muted max-w-3xl">{f.answer}</p></details>) : <p className="py-8 text-center text-sm text-ink-muted">Questions and answers will appear here from your CMS.</p>}</div></Container></section>;
}

function InstagramBlock({section}) {
  const c=section.config||{};
  return <section className="py-16 sm:py-20"><Container><div className="rounded-[2rem] border border-border bg-surface p-8 sm:p-14 text-center luxury-card"><Instagram className="mx-auto w-7 h-7 text-gold"/><p className="text-[10px] uppercase tracking-[.35em] text-primary mt-4">FOLLOW THE HOUSE</p><h2 className="font-display text-3xl sm:text-5xl mt-3">{section.title||'Afsana, beyond the bottle.'}</h2>{c.body&&<p className="mt-4 max-w-xl mx-auto text-sm text-ink-muted">{c.body}</p>}<SmartLink to={c.url||'https://instagram.com'} className="inline-flex mt-7 rounded-full bg-primary px-7 py-3.5 text-white text-sm font-semibold">{c.buttonText||'Follow Afsana'}</SmartLink></div></Container></section>;
}

export default function HomepageSections({sections,faqs}) {
  return <>{sections.filter(s=>s?.isEnabled!==false).map((s,index)=>{
    const type=s.type, c=s.config||{}, key=s.id||index;
    if(['best_sellers','new_arrivals','under_2000','featured_collection','gift_boxes'].includes(type)) return <ProductsSection key={key} section={s}/>;
    if(type==='hero'||type==='image_banner') return <Hero key={key} section={s}/>;
    if(type==='video_banner') return <VideoBanner key={key} section={s}/>;
    if(type==='split_story') return <SplitStory key={key} section={s}/>;
    if(type==='benefits') return <Benefits key={key} section={s}/>;
    if(type==='category_tiles') return <CategoryTiles key={key} section={s}/>;
    if(type==='cinematic_statement') return <CinematicStatement key={key} section={s}/>;
    if(type==='lookbook') return <Lookbook key={key} section={s}/>;
    if(type==='values_grid') return <ValuesGrid key={key} section={s}/>
    if(type==='marquee') return <Marquee key={key} section={s}/>;
    if(type==='trust_grid') return <TrustGrid key={key} section={s}/>;
    if(type==='testimonials') return <Testimonials key={key} section={s}/>;
    if(type==='blog_grid') return <EditorialCards key={key} section={s}/>;
    if(type==='faq') return <Faq key={key} faqs={faqs} section={s}/>;
    if(type==='newsletter') return <section key={key} className="py-16 sm:py-24"><Container><NewsletterSubscription/></Container></section>;
    if(type==='instagram') return <InstagramBlock key={key} section={s}/>;
    if(type==='rich_text') return <section key={key} className="py-16"><Container className="max-w-4xl"><SectionIntro eyebrow={c.eyebrow||'FROM THE HOUSE'} title={s.title||'Afsana Perfumes'}/><p className="text-ink-muted leading-8 whitespace-pre-line text-center">{c.body}</p></Container></section>;
    if(type==='spacer') return <div key={key} aria-hidden style={{height:Math.min(500,Math.max(20,Number(c.height)||80))}}/>;
    return null;
  })}</>;
}
