import { responsiveUnsplashSrcSet } from './responsiveImages';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, X, Instagram, Facebook, Youtube, Music2, Pin, Volume2, VolumeX } from 'lucide-react';
import useApi from '../hooks/useApi';
import { productsApi, cmsPublicApi, reviewsApi } from '../services';
import useShopSettings from './useShopSettings';
import ProductCard from './ProductCard';
import NewsletterSubscription from './components/NewsletterSubscription';
import CmsTestimonials, { sampleTestimonialsSection } from './CmsTestimonials';
import { Container } from './ui';

const img={
 hero:'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1440&q=74',
 signature:'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=640&q=74',
 woods:'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=800&q=74',
 floral:'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=74',
 gifting:'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=74',
 story:'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=74'
};
const video='https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4';
// The public catalogue is the only source for perfume product imagery on editorial pages.
const isCatalogueImageUrl = (url) => {
  const path = String(url || '').split(/[?#]/, 1)[0].toLowerCase();
  return !!path && !['.mp4','.webm','.mov','.m4v','.glb','.gltf'].some((extension) => path.endsWith(extension));
};
const catalogImage = (product) => product?.image?.url || product?.media?.find?.((item) => item?.kind === 'main' && isCatalogueImageUrl(item?.url))?.url || product?.media?.find?.((item) => isCatalogueImageUrl(item?.url) && !['video','media360','model3d'].includes(String(item?.kind || '').toLowerCase()))?.url || '';
const catalogProductsWithImages = (products = []) => products.filter((product) => catalogImage(product));
const catalogProductAt = (products = [], index = 0) => {
  const available = catalogProductsWithImages(products);
  return available.length ? available[index % available.length] : null;
};
// Editorial page heroes must use the named AFSANA fragrance for that page.
// Never substitute a different bottle when the exact product is unavailable.
const editorialProductByPage = {
  discover: { name: 'Mood Swing', pattern: /\bmood\s*swing\b/i },
  journal: { name: 'Rose Miracle', pattern: /\brose\s*miracle\b/i },
  house: { name: 'Ember Light', pattern: /\bember\s*light\b/i },
  gifting: { name: 'Astral Drift', pattern: /\bastral\s*drift\b/i }
};
const catalogProductForEditorialPage = (products = [], pageKey = '') => {
  const target = editorialProductByPage[pageKey];
  if (!target) return null;
  return catalogProductsWithImages(products).find((product) =>
    target.pattern.test(String(product?.name || ''))
  ) || null;
};
const catalogProductLink = (product) => product?.slug ? `/product/${product.slug}` : '/shop';
const Eyebrow=({children,light=false,white=false})=><div className={'flex items-center gap-3 text-[9px] sm:text-[10px] uppercase tracking-[.38em] font-semibold '+(white?'!text-white':light?'text-[#b4bf41]':'text-[#263e0e]')}><span className="w-9 h-px bg-current opacity-70"/>{children}</div>;
function DeferredBackgroundVideo({ src, poster, autoPlay = true, muted = true, controls = false, className = '' }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const element = videoRef.current;
    if (!element || !src) return undefined;
    let disposed = false;
    const loadWhenVisible = () => {
      if (disposed) return;
      if (!element.getAttribute('src')) {
        element.src = src;
        element.load();
      }
      if (autoPlay) element.play().catch(() => {});
    };
    if (typeof IntersectionObserver === 'undefined') {
      loadWhenVisible();
      return () => { disposed = true; element.pause(); };
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        loadWhenVisible();
        observer.disconnect();
      }
    }, { rootMargin: '240px 0px' });
    observer.observe(element);
    return () => {
      disposed = true;
      observer.disconnect();
      element.pause();
    };
  }, [src, autoPlay]);
  return <video ref={videoRef} className={className} poster={poster || undefined} muted={muted} loop playsInline controls={controls} preload="none" onError={(event) => { event.currentTarget.style.display = 'none'; }}/>;
}


function Hero(){
 return <section className="hero relative isolate min-h-[760px] sm:min-h-[900px] overflow-hidden bg-[#080a07] text-white">
  <video className="absolute inset-0 -z-20 h-full w-full object-cover" autoPlay muted loop playsInline poster={img.hero}><source src={video} type="video/mp4"/></video>
  <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_38%,rgba(163,197,233,.28),transparent_22%),radial-gradient(circle_at_18%_72%,rgba(123,0,58,.24),transparent_26%),linear-gradient(90deg,rgba(8,10,7,.98),rgba(38,62,14,.80),rgba(8,10,7,.42))]"/>
  <div className="hero-light"/><div className="hero-light two"/>
  <div className="container-xl hero-content"><div className="grid w-full items-center lg:grid-cols-[1.08fr_.92fr] gap-12">
   <div className="luxury-reveal">
    <Eyebrow light>AN AFSANA BEGINS</Eyebrow>
    <h1 className="hero-title mt-7 max-w-4xl font-display">SCENTS<br/>WITH A<br/><em className="text-[#ffe500]">A STORY.</em></h1>
    <p className="mt-4 text-[10px] uppercase tracking-[.42em] text-[#a3c5e9]/80">THE ART OF SCENT • PRIVATE COLLECTION</p>
    <p className="hero-description mt-8">Some scents are worn. Others become memories. Discover a cinematic fragrance world crafted to leave a trace long after you leave the room.</p>
    <div className="hero-buttons mt-9 flex flex-wrap gap-3">
      <Link to="/shop" className="group inline-flex items-center gap-3 bg-[#ffe500] px-7 py-4 text-xs font-semibold uppercase tracking-[.16em] text-[#080a07] hover:bg-white transition">Enter the Story <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition"/></Link>
      <a href="#finderSection" className="inline-flex items-center gap-3 border border-white/25 px-7 py-4 text-xs uppercase tracking-[.16em] text-white hover:border-[#d6a84f] hover:text-[#ffe500] transition">Find Your AFSANA <span>✦</span></a>
    </div>
    <div className="mt-8 flex flex-wrap gap-3 text-[8px] uppercase tracking-[.25em] text-white/45"><span className="border border-white/10 bg-white/[.03] px-3 py-2">Premium Oils</span><span className="border border-white/10 bg-white/[.03] px-3 py-2">Long Lasting</span><span className="border border-white/10 bg-white/[.03] px-3 py-2">Gift Ready</span></div>
   </div>
   <div className="hero-side hidden lg:block luxury-reveal">
    <div className="hero-card relative mx-auto hero-card-magical">
      <div className="absolute -top-4 -right-4 z-10 rounded-full border border-[#d6a84f]/40 bg-[#070807]/70 px-4 py-2 text-[8px] uppercase tracking-[.28em] text-[#ffe500] backdrop-blur">01 • Signature</div>
      <div className="hero-card-image"><img src={img.signature} srcSet={responsiveUnsplashSrcSet(img.signature)} sizes="(max-width: 700px) 90vw, 34vw" alt="Afsana fragrance" width="960" height="1200"/></div>
      <div className="text-left mt-4"><Eyebrow light>THE SIGNATURE</Eyebrow><p className="mt-4 font-display text-2xl">Citrus, saffron & a magnetic trail.</p></div>
    </div>
   </div>
  </div></div>
  <div className="absolute bottom-7 left-1/2 -translate-x-1/2 text-center text-[8px] uppercase tracking-[.35em] text-white/45"><span>Scroll to discover</span><div className="mx-auto mt-3 h-12 w-px bg-gradient-to-b from-[#b4bf41] to-transparent"/></div>
 </section>;
}
function Philosophy(){return <section className="bg-[#faf8f4] py-20 sm:py-28"><div className="container-xl"><div className="intro-grid"><Eyebrow>The Philosophy</Eyebrow><div><p className="font-display text-4xl sm:text-6xl leading-tight">We create fragrances for people who <em className="text-[#263e0e]">leave a trace.</em></p><p className="mt-7 max-w-xl text-sm leading-7 text-[#5f654f]">Every Afsana composition is designed as a story: an opening chapter, a mysterious heart and a final impression that refuses to disappear.</p></div></div><div className="intro-line"/></div></section>;}
function Worlds(){const cards=[['01 — Signature','House Icons',img.signature,'/shop?category=signature'],['02 — Oud','Dark Woods',img.woods,'/shop?category=oud'],['03 — Floral','Soft Light',img.floral,'/shop?category=floral'],['04 — Gifting','Made to Give',img.gifting,'/gifting']];return <section className="bg-white py-20 sm:py-28"><div className="container-xl"><div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8 mb-12"><div><Eyebrow>Explore the house</Eyebrow><h2 className="mt-5 font-display text-5xl sm:text-7xl leading-[.9]">Find your<br/><em className="text-[#263e0e]">world.</em></h2></div><Link to="/shop" className="inline-flex w-fit items-center gap-2 border border-[#263e0e] px-6 py-3 text-[10px] uppercase tracking-[.2em] hover:bg-[#263e0e] hover:text-white transition">View all fragrances ↗</Link></div><div className="collection-grid cinematic-grid">{cards.map(([ey,t,src,to])=><Link key={t} to={to} className="group relative aspect-[.78] overflow-hidden bg-[#263e0e]"><img src={src} srcSet={responsiveUnsplashSrcSet(src, 66)} sizes="(max-width: 640px) 48vw, (max-width: 1024px) 50vw, 25vw" alt="" width="1000" height="1250" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-1000 group-hover:scale-110 group-hover:opacity-95"/><div className="absolute inset-0 bg-gradient-to-t from-[#182308] via-transparent to-transparent"/><div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-white"><p className="text-[8px] uppercase tracking-[.3em] text-[#b4bf41]">{ey}</p><h3 className="mt-2 font-display text-2xl sm:text-3xl">{t}</h3><span className="mt-4 inline-flex text-[9px] uppercase tracking-[.2em] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition">Discover ↗</span></div></Link>)}</div></div></section>;}
function BestSellers(){const {data,loading}=useApi(()=>productsApi.list({sort:'popular',limit:4}),[]);return <section className="bg-[#f3f1e9] py-20 sm:py-28"><div className="container-xl"><div className="flex items-end justify-between mb-12"><div><Eyebrow>The edit</Eyebrow><h2 className="mt-5 font-display text-5xl sm:text-7xl leading-[.9]">Most<br/><em className="text-[#263e0e]">wanted.</em></h2></div><Link to="/shop" className="hidden sm:flex text-[10px] uppercase tracking-[.2em]">Shop all</Link></div>{loading?<div className="grid grid-cols-2 md:grid-cols-4 gap-5">{[1,2,3,4].map(i=><div key={i} className="aspect-[4/5] bg-white animate-pulse"/>)}</div>:<div className="product-grid purchase-grid">{(data?.products||[]).map(p=><ProductCard key={p.id} product={p}/>)}</div>}</div></section>;}
function AfsanaMemoryFeature(){
  const {data,loading}=useApi(()=>productsApi.list({q:'Drama Queen',limit:8}),[]);
  const catalogue=data?.products||[];
  const dramaQueen=catalogue.find((product)=>/drama\s*queen/i.test(String(product?.name||'')))||null;
  const bottle=dramaQueen?.image?.url
    || dramaQueen?.media?.find?.((item)=>item?.kind==='main'&&item?.url)?.url
    || dramaQueen?.media?.find?.((item)=>item?.url&&!/\.(mp4|webm|mov|glb|gltf)(\?|$)/i.test(item.url))?.url
    || '';
  const productPath=dramaQueen?.slug?'/product/'+dramaQueen.slug:'/shop?q=Drama%20Queen';
  return <section className="afsana-memory-feature">
    <div className="container-xl afsana-memory-feature-grid">
      <div className="afsana-memory-feature-copy">
        <p className="afsana-memory-feature-eyebrow">THE ART OF SCENT</p>
        <h2>A fragrance<br/>becomes a <em>memory.</em></h2>
        <p>Discover signature scents crafted to leave a lasting impression.</p>
        <Link to="/shop" className="afsana-memory-feature-cta">Explore the collection <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="afsana-memory-feature-product">
        <div className="afsana-memory-feature-halo" aria-hidden="true"/>
        {bottle ? <Link to={productPath} className="afsana-memory-feature-bottle-link" aria-label="Explore AFSANA Drama Queen perfume">
          <img src={bottle} srcSet={responsiveUnsplashSrcSet(bottle,70)} sizes="(max-width: 700px) 80vw, 38vw" width="1000" height="1300" loading="lazy" decoding="async" alt="AFSANA Drama Queen perfume bottle"/>
        </Link> : <div className="afsana-memory-feature-bottle-pending" role="status">
          <span>AFSANA</span>
          <strong>DRAMA<br/>QUEEN</strong>
          <small>{loading?'LOADING THE LIVE COLLECTION':'PRODUCT PHOTO NOT SET IN THE LIVE CATALOGUE'}</small>
        </div>}
        <div className="afsana-memory-feature-product-caption">
          <span>THE AFSANA EDIT</span>
          <strong>DRAMA QUEEN</strong>
          {dramaQueen?.fragrance?.family && <small>{dramaQueen.fragrance.family}</small>}
        </div>
      </div>
    </div>
  </section>;
}

function Finder({ section = {} }){
  const navigate=useNavigate();
  const {data}=useApi(()=>productsApi.list({sort:'popular',limit:100}),[]);
  const products=data?.products||[];
  const c=section.config||{};
  const defaults=[
    {q:'How do you want your fragrance to feel?',sub:'Start with the energy you want to carry.',opts:[['Magnetic','Deep, confident and a little mysterious.'],['Luminous','Fresh, airy and effortlessly radiant.'],['Electric','Bright, bold and full of energy.'],['Comforting','Warm, soft and quietly addictive.']]},
    {q:'Which world pulls you in?',sub:'Think about the atmosphere you love.',opts:[['After dark','Warm lights, velvet textures and late nights.'],['Open air','Sunlight, fresh air and wide-open spaces.'],['City pulse','Art, movement, music and new ideas.'],['Slow mornings','Soft light, calm rituals and comfort.']]},
    {q:'Which notes sound most like you?',sub:'Choose what you naturally gravitate towards.',opts:[['Amber & woods','Warm resin, sandalwood and smoky depth.'],['Florals & musk','Petals, clean skin and soft elegance.'],['Citrus & spice','Fresh zest, pepper and aromatic lift.'],['Vanilla & tonka','Creamy warmth and gentle sweetness.']]},
    {q:'When will you wear it most?',sub:'A scent can change with the moment.',opts:[['Everyday signature','Something that feels like you, daily.'],['Evening presence','A memorable trail after sunset.'],['Special occasions','Something expressive and distinctive.'],['A little of everything','Versatile, balanced and easy to love.']]},
    {q:'How should it announce you?',sub:'The final detail makes the match personal.',opts:[['Close & intimate','A personal discovery, just for those close.'],['Noticeable & elegant','A beautiful trail that turns heads.'],['Bold & unforgettable','A confident entrance with presence.'],['Fresh & effortless','A clean impression that feels natural.']]}
  ];
  const qs=defaults.map((base,index)=>{
    const n=index+1, raw=String(c['step'+n+'Options']||'').trim();
    const opts=raw?raw.split(/\r?\n/).map(line=>{const [title='',description='',slugs='']=line.split('|');return [title.trim(),description.trim(),slugs.split(',').map(x=>x.trim()).filter(Boolean)]}).filter(x=>x[0]):base.opts.map(x=>[...x,[]]);
    return {q:c['step'+n+'Title']||base.q,sub:c['step'+n+'Subtitle']||base.sub,opts:opts.length?opts:base.opts.map(x=>[...x,[]])};
  });
  const [step,setStep]=useState(0),[answers,setAnswers]=useState([]);
  const tags=[['oud','amber','wood'],['fresh','citrus','floral'],['citrus','spice','aromatic'],['amber','vanilla','musk']];
  const selectedNotes=tags[answers[2] ?? 0] || tags[0];
  const mappedVotes={};
  answers.forEach((answer,index)=>{const option=qs[index]?.opts?.[answer];(option?.[2]||[]).forEach(slug=>{mappedVotes[slug]=(mappedVotes[slug]||0)+1;});});
  const mappedSlug=Object.keys(mappedVotes).sort((a,b)=>mappedVotes[b]-mappedVotes[a])[0];
  const mappedProduct=mappedSlug?products.find(p=>String(p.slug||'').toLowerCase()===mappedSlug.toLowerCase()):null;
  const ranked=[...products].sort((a,b)=>{
    const text=(p)=>[p.name,p.fragrance?.family,p.fragrance?.gender,p.notes?.top,p.notes?.heart,p.notes?.base].flat().filter(Boolean).join(' ').toLowerCase();
    const score=(p)=>selectedNotes.reduce((n,k)=>n+(text(p).includes(k)?1:0),0)+(answers[0]===0&&/evening|unisex/i.test(text(p))?1:0)+(answers[0]===1&&/fresh|floral/i.test(text(p))?1:0);
    return score(b)-score(a);
  });
  const match=mappedProduct||ranked[0];
  const matchImage=match?.image?.url || match?.media?.find?.((item)=>item?.kind==='main' && item?.url)?.url || match?.media?.find?.((item)=>item?.url)?.url || '';
  const choose=(index)=>setAnswers(prev=>{const next=[...prev];next[step]=index;return next;});
  const next=()=>{if(answers[step]===undefined)return;setStep(v=>Math.min(qs.length,v+1));};
  const reset=()=>{setStep(0);setAnswers([]);};
  const total=String(qs.length).padStart(2,'0');
  return <><section className={`afsana-ref-finder${step>=qs.length?' afsana-ref-finder-result':''}`} id="finderSection"><div className="container-xl"><div className="afsana-ref-finder-grid"><div><p className="afsana-ref-eyebrow">{c.finderEyebrow||'AFSANA SCENT INTELLIGENCE'}</p><h2>{c.finderHeading||'Your scent'}<br/><em>{c.finderHeadingAccent||'has a personality.'}</em></h2><p>{c.finderIntro||'Answer five thoughtful questions and discover a fragrance from the live AFSANA collection that matches your mood, notes and moment.'}</p></div><div className="afsana-ref-finder-box"><div className="afsana-ref-finder-progress"><span style={{width:`${(step/qs.length)*100}%`}}/></div>{step<qs.length?<><p className="afsana-ref-finder-step">{(c.stepLabel||'STEP')} {String(step+1).padStart(2,'0')} / {total}</p><h3>{qs[step].q}</h3><p className="afsana-ref-finder-sub">{qs[step].sub}</p><div className="afsana-ref-finder-options">{qs[step].opts.map(([title,description],i)=><button type="button" key={title+'-'+i} onClick={()=>choose(i)} className={answers[step]===i?'selected':''}><b>{title}</b><small>{description}</small></button>)}</div><div className="afsana-ref-finder-footer"><button type="button" disabled={step===0} onClick={()=>setStep(v=>Math.max(0,v-1))}>{c.backText||'← Back'}</button><button type="button" disabled={answers[step]===undefined} onClick={next}>{step===qs.length-1?(c.revealText||'Reveal my scent'):(c.nextText||'Next step')} ↗</button></div></>:<><p className="afsana-ref-finder-step">{c.resultEyebrow||'YOUR SCENT MATCH IS READY'}</p><h3>{c.resultTitle||<>Your next chapter<br/>smells like this.</>}</h3>{match?<div className="afsana-ref-match"><div className="afsana-ref-match-image">{matchImage?<img src={matchImage} srcSet={responsiveUnsplashSrcSet(matchImage, 66)} sizes="(max-width: 700px) 90vw, 40vw" alt={match.name||'Matched AFSANA fragrance'} width="1000" height="1250" loading="lazy"/>:<div className="afsana-ref-match-image-empty"><span>AFSANA</span><small>PRODUCT IMAGE NOT AVAILABLE</small></div>}</div><div className="afsana-ref-match-copy"><p>{c.matchLabel||'YOUR MATCH · CURATED FROM THE LIVE COLLECTION'}</p><h4>{match.name}</h4><span>{match.fragrance?.family||match.fragrance?.concentration||'AFSANA SIGNATURE'}</span><p>{match.content?.shortDescription||c.matchFallback||'A fragrance selected from the AFSANA collection based on your answers.'}</p><strong>{match.priceFrom? `From PKR ${Number(match.priceFrom).toLocaleString('en-PK')}`:'Explore fragrance'}</strong></div></div>:<p className="afsana-ref-finder-sub">{c.noMatchText||'Your matching collection is loading. Browse the complete collection to find your scent.'}</p>}<div className="afsana-ref-finder-footer"><button type="button" onClick={reset}>{c.restartText||'Start again'}</button><button type="button" onClick={()=>navigate(match?.slug?'/product/'+match.slug:'/shop')}>{match?(c.matchButtonText||'Explore my match'):(c.noMatchButtonText||'Explore collection')} ↗</button></div></>}</div></div></div></section><AfsanaMemoryFeature/></>;
}
function Story(){return <section className="bg-[#faf8f4] py-20 sm:py-32"><div className="container-xl"><div className="story-grid"><div className="story-image"><div className="absolute -inset-4 border border-[#748e40]/35 translate-x-4 translate-y-4"/><img src={img.story} srcSet={responsiveUnsplashSrcSet(img.story, 66)} sizes="(max-width: 700px) 100vw, 50vw" alt="The House of Afsana" width="1000" height="1136" loading="lazy" decoding="async" className="relative aspect-[.88] w-full object-cover"/></div><div><Eyebrow>The House of Afsana</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">A fragrance<br/>is a <em className="text-[#263e0e]">memory.</em></h2><p className="mt-7 text-sm leading-7 text-[#5f654f]">We believe the most powerful fragrances are not simply smelled — they are remembered.</p><p className="mt-4 text-sm leading-7 text-[#5f654f]">Our perfumers combine traditional craftsmanship with contemporary composition, creating scents that feel timeless yet distinctly personal.</p><div className="mt-9 font-display italic text-2xl text-[#263e0e]">Crafted for the unforgettable.</div></div></div></div></section>;}
function Film(){const cards=[['01 / Atmosphere','The First Impression',img.signature],['02 / Ingredient','Dark Woods',img.woods],['03 / Craft','Made by Hand',img.floral],['04 / Emotion','Leave a Trace',img.gifting]];return <section className="bg-[#182308] py-20 sm:py-28 text-white"><div className="container-xl"><div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-7 mb-12"><div><Eyebrow light>A moving story</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">Watch the<br/><em className="text-[#b4bf41]">world of Afsana.</em></h2></div><p className="max-w-md text-sm leading-7 text-white/55">Four glimpses into the atmosphere, ingredients, craftsmanship and emotion behind the house.</p></div><div className="video-wall cinematic-video-wall">{cards.map(([n,t,src])=><article key={t} className="video-card group cinematic-video-card"><video className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-1000 group-hover:scale-110 group-hover:opacity-95" autoPlay muted loop playsInline preload="metadata" poster={src} aria-label={t}><source src={video} type="video/mp4"/></video><div className="absolute inset-0 bg-gradient-to-t from-[#182308] via-[#182308]/10 to-transparent"/><div className="video-label"><span>{n}</span><h3>{t}</h3><p className="mt-2 max-w-[18rem] text-[10px] leading-5 text-white/55">A moving glimpse into the world, material and emotion of Afsana.</p></div></article>)}</div></div></section>;}
function Ritual(){const items=[['01','Prepare','Apply to clean, moisturised skin to give the fragrance a soft foundation.'],['02','Pulse','Focus on pulse points where warmth allows the fragrance to evolve naturally.'],['03','Layer','Combine complementary notes to create a scent that feels entirely yours.'],['04','Leave','The final note should arrive softly — and stay in someone’s memory.']];return <section className="bg-white py-20 sm:py-28"><div className="container-xl"><Eyebrow>The fragrance ritual</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl">Make it<br/><em className="text-[#263e0e]">yours.</em></h2><div className="ritual-grid">{items.map(([n,t,d])=><article key={n} className="bg-white p-7 sm:p-9"><span className="font-display text-4xl text-[#748e40]">{n}</span><h3 className="mt-7 font-display text-2xl">{t}</h3><p className="mt-3 text-sm leading-7 text-[#5f654f]">{d}</p></article>)}</div></div></section>;}
function PrivateCollection(){return <section className="private-banner"><img src={img.hero} srcSet={responsiveUnsplashSrcSet(img.hero, 68)} sizes="100vw" alt="" width="1920" height="1080" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,35,8,.97),rgba(24,35,8,.62),rgba(24,35,8,.35))]"/><Container className="relative flex min-h-[650px] items-center"><div className="max-w-xl"><Eyebrow light>The Private Collection</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">Some stories<br/>deserve to be <em className="text-[#b4bf41]">private.</em></h2><p className="mt-7 text-sm leading-7 text-white/60">Discover our most concentrated compositions, created for evenings that deserve to be remembered.</p><Link to="/shop" className="mt-8 inline-flex bg-[#b4bf41] px-7 py-4 text-xs font-semibold uppercase tracking-[.18em] text-[#263e0e]">Explore Private Collection <ArrowRight className="ml-2 w-4"/></Link></div></Container></section>;}
function Trust(){const items=[['✦','Premium Oils','Carefully selected fragrance oils and sophisticated compositions.'],['◌','Long Lasting','Designed to evolve beautifully through the day rather than disappear quickly.'],['♢','Gift Ready','Every order is prepared with the experience of opening a luxury gift.'],['✓','Easy Exchange','A considered customer experience from discovery through delivery.']];return <section className="bg-[#f3f1e9] py-20 sm:py-28"><div className="container-xl"><Eyebrow>Why Afsana</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl">Designed for<br/><em className="text-[#263e0e]">trust.</em></h2><div className="trust-grid trust-grid-premium">{items.map(([i,t,d])=><article key={t} className="border border-[#263e0e]/10 bg-white p-7 hover:-translate-y-1 transition"><span className="text-2xl text-[#748e40]">{i}</span><h3 className="mt-6 font-display text-2xl">{t}</h3><p className="mt-3 text-sm leading-7 text-[#5f654f]">{d}</p></article>)}</div></div></section>;}
function Journal(){const posts=[['Guide / Fragrance','How to find your signature scent',img.floral],['Ingredient / Oud','The mysterious world of oud',img.woods],['Ritual / Lifestyle','The psychology of scent',img.gifting]];return <section className="bg-white py-20 sm:py-28"><Container><div className="flex items-end justify-between mb-12"><div><Eyebrow>From the journal</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">Stories worth<br/><em className="text-[#263e0e]">remembering.</em></h2></div><Link to="/journal" className="hidden sm:block text-[10px] uppercase tracking-[.2em]">Enter Journal</Link></div><div className="editorial-grid">{posts.map(([meta,title,src])=><article key={title} className="group"><div className="aspect-[1.05] overflow-hidden"><img src={src} srcSet={responsiveUnsplashSrcSet(src, 66)} sizes="(max-width: 700px) 100vw, 50vw" alt="" width="1200" height="900" className="w-full h-full object-cover transition duration-700 group-hover:scale-105"/></div><div className="pt-5"><p className="text-[8px] uppercase tracking-[.25em] text-[#263e0e]">{meta}</p><h3 className="mt-3 font-display text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-[#5f654f]">The art of choosing a fragrance that feels like an extension of yourself.</p></div></article>)}</div></Container></section>;}
function Testimonials(){
 const [reviews,setReviews]=useState([]);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    const catalog=await productsApi.list({sort:'popular',limit:8});
    const products=(catalog?.products||[]).filter(p=>p?.slug).slice(0,8);
    const groups=await Promise.all(products.map(async product=>{
     try{
      const response=await reviewsApi.list(product.slug,{page:1,limit:3});
      return (response?.reviews||[]).map(review=>({...review,productName:product.name}));
     }catch{return [];}
    }));
    const genuine=groups.flat().filter(review=>(review?.text||review?.title)&&Number(review?.rating)>0);
    if(active)setReviews(genuine.slice(0,3));
   }catch{if(active)setReviews([]);}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[]);
 if(loading||!reviews.length)return null;
 return <section className="bg-[#263e0e] py-20 sm:py-28 text-white"><div className="container-xl"><Eyebrow light>Real customer feedback</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl">Loved by<br/><em className="text-[#b4bf41]">the unforgettable.</em></h2><div className="testimonial-track testimonial-track-premium">{reviews.map((review,index)=><article key={review.id||review._id||index} className="border border-white/10 p-7 sm:p-9"><div className="text-[#b4bf41] tracking-[.3em]" aria-label={`${Number(review.rating)} out of 5 stars`}>{'★'.repeat(Math.max(0,Math.min(5,Number(review.rating)||0)))}</div><blockquote className="mt-7 font-display text-2xl leading-tight">“{review.text||review.title}”</blockquote><p className="mt-7 text-[9px] uppercase tracking-[.22em] text-white/40">— {review.customerName||'Afsana customer'} / {review.productName}</p></article>)}</div></div></section>;
}
function SelectionBanner(){return <section aria-label="The Afsana Selection" className="relative isolate overflow-hidden border-y border-[#c5a878]/25 bg-[#18251f] text-[#f7f2e8]">
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_48%,rgba(197,168,120,.20),transparent_30%),radial-gradient(ellipse_at_12%_0%,rgba(111,129,91,.24),transparent_38%),linear-gradient(112deg,#18251f_0%,#26372d_56%,#344337_100%)]"/>
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[.13] [background-image:repeating-linear-gradient(118deg,rgba(255,255,255,.12)_0px,rgba(255,255,255,.12)_1px,transparent_1px,transparent_88px)]"/>
  <div className="container-xl mx-auto grid min-h-[290px] max-w-[1320px] grid-cols-1 items-center gap-8 px-6 py-14 sm:px-10 md:grid-cols-[1fr_auto] md:gap-12 md:py-16 lg:px-14">
    <div className="max-w-3xl">
      <p className="flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[.34em] text-[#ffe500] sm:text-[10px]"><span className="h-px w-8 bg-[#c5a878]"/>THE AFSANA SELECTION</p>
      <h2 className="mt-5 font-sans text-[clamp(2.8rem,7vw,5.8rem)] font-semibold leading-[.92] tracking-[-.045em] text-white">Objects of <em className="text-[#ffe500]">desire.</em></h2>
      <p className="mt-5 max-w-xl text-sm leading-7 text-white sm:text-base">Discover the fragrances that define the house.</p>
      <Link to="/shop" className="group mt-8 inline-flex min-h-12 items-center gap-8 rounded-full border border-[#d4bd91] bg-[#d4bd91] px-6 py-3 text-[10px] font-bold uppercase tracking-[.19em] text-[#1d2a22] shadow-[0_12px_30px_rgba(0,0,0,.22)] transition duration-300 hover:-translate-y-1 hover:border-[#ead8b7] hover:bg-[#ead8b7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ead8b7] sm:text-[11px]">View full collection <span aria-hidden="true" className="text-base transition-transform duration-300 group-hover:translate-x-1">↗</span></Link>
    </div>
    <div aria-hidden="true" className="relative mx-auto hidden h-44 w-44 items-center justify-center md:flex lg:mr-8 lg:h-52 lg:w-52">
      <span className="absolute inset-0 rounded-full border border-[#d4bd91]/35 shadow-[0_0_0_16px_rgba(212,189,145,.045),0_0_0_34px_rgba(212,189,145,.025)]"/>
      <span className="absolute inset-5 rounded-full border border-[#d4bd91]/20"/>
      <span className="font-display text-5xl italic text-[#d8c39e]/90">A.</span>
      <span className="absolute -bottom-1 text-[7px] font-semibold uppercase tracking-[.3em] text-[#d4bd91]/80">THE ART OF SCENT</span>
    </div>
  </div>
</section>;}
function DefaultHome(){return <div className="bg-[#faf8f4] text-[#263e0e]"><Hero/><SelectionBanner/><Philosophy/><Worlds/><BestSellers/><Finder/><Story/><Film/><Ritual/><PrivateCollection/><Trust/><Journal/><Testimonials/><CommunityPulse section={{type:'community_pulse',title:'A house people come back to.',config:{}}}/><PremiumFooterShowcase section={{type:'footer_showcase',title:'Leave the final impression.',config:{}}}/><section className="bg-[#263e0e] py-14 sm:py-20 text-white"><div className="container-xl"><div className="newsletter-grid"><div><Eyebrow light>The private list</Eyebrow><h2 className="mt-5 font-display text-4xl sm:text-6xl">Be the first<br/>to <em className="text-[#b4bf41]">know.</em></h2><p className="mt-4 max-w-xl text-sm text-white/55">Early access to new compositions, private drops, exclusive stories and fragrance events.</p></div><NewsletterSubscription/></div></div></section></div>;}


const cmsItems = (items) => Array.isArray(items) ? items : [];
function CmsTimer({ endAt, digital = false }) {
  const [left, setLeft] = useState(Math.max(0, new Date(endAt || 0).getTime() - Date.now()));
  useEffect(() => { const id = window.setInterval(() => setLeft(Math.max(0, new Date(endAt || 0).getTime() - Date.now())), 1000); return () => window.clearInterval(id); }, [endAt]);
  if (!endAt || left <= 0) return null;
  const total = Math.floor(left / 1000), d = Math.floor(total / 86400), h = Math.floor((total % 86400) / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return digital ? <div className="cms-timer afsana-digital-countdown" aria-label="Offer countdown">
    <span className="cms-timer-unit"><b>{String(d).padStart(2,'0')}</b><small>DAYS</small></span><i>:</i>
    <span className="cms-timer-unit"><b>{String(h).padStart(2,'0')}</b><small>HRS</small></span><i>:</i>
    <span className="cms-timer-unit"><b>{String(m).padStart(2,'0')}</b><small>MIN</small></span><i>:</i>
    <span className="cms-timer-unit"><b>{String(s).padStart(2,'0')}</b><small>SEC</small></span>
  </div> : <div className="cms-timer" aria-label="Offer countdown"><span>{String(d).padStart(2,'0')}d</span><b>:</b><span>{String(h).padStart(2,'0')}h</span><b>:</b><span>{String(m).padStart(2,'0')}m</span><b>:</b><span>{String(s).padStart(2,'0')}s</span></div>;
}

const nextOfferResetAt = (timestamp) => {
  const next = new Date(timestamp);
  next.setHours(24, 0, 0, 0);
  return next.getTime();
};
const resolveOfferTarget = (endAt, now) => {
  const parsed = endAt ? new Date(endAt).getTime() : NaN;
  return Number.isFinite(parsed) && parsed > now ? parsed : nextOfferResetAt(now);
};
function OfferCountdown({ endAt }) {
  const [now, setNow] = useState(() => Date.now());
  const [target, setTarget] = useState(() => resolveOfferTarget(endAt, Date.now()));
  useEffect(() => { setTarget(resolveOfferTarget(endAt, Date.now())); }, [endAt]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (target <= now) setTarget(nextOfferResetAt(now));
  }, [target, now]);
  const total = Math.max(0, Math.floor((target - now) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const units = [[days, 'DAYS'], [hours, 'HRS'], [minutes, 'MINS'], [seconds, 'SECS']];
  return <div className="afsana-private-offer-countdown" role="timer" aria-live="off" aria-label={`Offer countdown: ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`}>
    {units.map(([value, label]) => <div key={label} className="afsana-private-offer-unit">
      <span className="afsana-private-offer-number">{String(value).padStart(2, '0')}</span>
      <span className="afsana-private-offer-unit-label">{label}</span>
    </div>)}
  </div>;
}

function AnimatedValue({ value }) {
  const raw = String(value ?? '').trim();
  const numeric = /^\d+(?:[.,]\d+)?[kKmM%+]*$/.test(raw);
  const target = numeric ? Number(raw.replace(/[,kKmM%+]/g, '')) : 0;
  const [shown, setShown] = useState(numeric ? 0 : raw);
  useEffect(() => {
    if (!numeric) return;
    const duration = 1200, started = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - started) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [numeric, target, raw]);
  if (!numeric) return <>{raw}</>;
  const suffix = raw.match(/[kKmM%+]+$/)?.[0] || '';
  return <>{shown.toLocaleString()}{suffix}</>;
}
function MuseScene({ section, products = [] }) {
  const c = section.config || {};
  const ownProduct = ['discover','journal','house','gifting'].includes(section.pageKey) ? catalogProductAt(products, 2) : null;
  const visualImage = ownProduct ? catalogImage(ownProduct) : c.characterImageUrl;
  return <section className="relative min-h-[620px] sm:min-h-[760px] overflow-hidden bg-[#080a07] text-white">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_42%,rgba(180,191,65,.22),transparent_22%),radial-gradient(circle_at_30%_70%,rgba(123,0,58,.18),transparent_28%)]"/>
    <div className="absolute left-[52%] top-1/2 h-[390px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-[48%] bg-gradient-to-b from-white/10 via-[#b4bf41]/10 to-transparent blur-2xl animate-pulse"/>
    <div className="absolute left-[52%] top-[48%] h-[430px] w-[190px] -translate-x-1/2 -translate-y-1/2 rounded-[46%] border border-[#b4bf41]/25 shadow-[0_0_100px_rgba(180,191,65,.14)]"/>
    <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:42px_42px]"/>
    <div className="container-xl relative grid min-h-[620px] sm:min-h-[760px] items-center lg:grid-cols-[.8fr_1.2fr]">
      <div className="relative z-10 max-w-xl py-20">
        <Eyebrow light>{c.eyebrow || 'THE AFSANA MUSE'}</Eyebrow>
        <h2 className="mt-6 font-display text-6xl sm:text-8xl leading-[.82]">{section.title || 'Wear the story.'}</h2>
        <p className="mt-7 max-w-md text-sm leading-7 text-white/55">{c.body || 'A cinematic character-led chapter where fragrance, fashion and atmosphere meet.'}</p>
        {c.buttonText && <Link to={c.buttonLink || '/shop'} className="mt-8 inline-flex bg-[#b4bf41] px-7 py-4 text-[10px] font-semibold uppercase tracking-[.2em] text-[#263e0e]">{c.buttonText} ↗</Link>}
      </div>
      <div className="relative hidden lg:block h-full">
        {visualImage ? <img src={visualImage} alt={ownProduct?.name || 'AFSANA perfume'} width="900" height="1300" loading="lazy" decoding="async" className="absolute left-1/2 top-1/2 h-[600px] w-[360px] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_35px_90px_rgba(180,191,65,.25)] animate-[afsanaFloat_6s_ease-in-out_infinite]" /> : <div className="absolute left-1/2 top-1/2 grid h-[500px] w-[270px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[45%] bg-gradient-to-b from-white/20 via-[#a3c5e9]/12 to-[#7b003a]/10 text-[10px] tracking-[.3em] text-white/70">AFSANA</div>}
        <div className="absolute left-1/2 top-[38%] h-[150px] w-[150px] -translate-x-1/2 rounded-full border border-white/10 bg-white/[.025] backdrop-blur"/>
        <div className="absolute left-[36%] top-[34%] text-[9px] uppercase tracking-[.3em] text-[#b4bf41] animate-pulse">Presence</div>
        <div className="absolute right-[18%] top-[54%] text-[9px] uppercase tracking-[.3em] text-white/35">Memory</div>
      </div>
    </div>
  </section>;
}
function Product3DShowcase({ section, products=[] }) {
  const c=section.config||{};
  useEffect(()=>{if(!c.product3dModelUrl||customElements.get('model-viewer'))return;const existing=document.querySelector('script[data-afsana-model-viewer]');if(existing)return;const script=document.createElement('script');script.type='module';script.src='https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';script.dataset.afsanaModelViewer='true';document.head.appendChild(script);},[c.product3dModelUrl]);
  const requestedProduct=products.find(p=>c.productSlug && (p.slug===c.productSlug || p.id===c.productSlug));
  const chosen=(requestedProduct && catalogImage(requestedProduct)) ? requestedProduct : catalogProductAt(products,0) || requestedProduct || products[0];
  const media=[...(chosen?.media||[])].filter(x=>isCatalogueImageUrl(x?.url) && !['video','media360','model3d'].includes(String(x?.kind||'').toLowerCase())).slice(0,8);
  const ownProductImage=catalogImage(chosen);
  const frames=media.length?media:(ownProductImage?[{url:ownProductImage}]:[]);
  const [frame,setFrame]=useState(0),[auto,setAuto]=useState(true);
  const drag=useRef({active:false,x:0});
  useEffect(()=>{if(!auto||frames.length<2)return;const id=window.setInterval(()=>setFrame(v=>(v+1)%frames.length),900);return()=>window.clearInterval(id)},[auto,frames.length]);
  const startTurn=(event)=>{if(frames.length<2)return;setAuto(false);drag.current={active:true,x:event.clientX};event.currentTarget.setPointerCapture?.(event.pointerId);};
  const moveTurn=(event)=>{if(!drag.current.active||frames.length<2)return;const delta=event.clientX-drag.current.x;const steps=Math.trunc(delta/22);if(!steps)return;drag.current.x+=steps*22;setFrame((current)=>(current-steps+frames.length)%frames.length);};
  const endTurn=()=>{drag.current.active=false;};
  return <section className="relative overflow-hidden bg-[#080a07] text-white py-20 sm:py-28">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(163,197,233,.18),transparent_22%),radial-gradient(circle_at_25%_70%,rgba(123,0,58,.20),transparent_28%)]"/>
    <div className="container-xl relative grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
      <div><Eyebrow white>{c.eyebrow||'THE AFSANA OBJECT'}</Eyebrow><h2 className="!text-white mt-6 font-display text-5xl sm:text-7xl leading-[.9]">{section.title||chosen?.name||'The bottle in motion.'}</h2><p className="mt-6 max-w-xl text-sm leading-7 text-white/55">{c.body||'Explore the signature bottle through a cinematic multi-frame experience.'}</p>
      {c.buttonText&&<Link to={c.buttonLink||'/shop'} className="mt-8 inline-flex bg-[#ffe500] px-7 py-4 text-[10px] font-semibold uppercase tracking-[.2em] text-[#080a07]">{c.buttonText} ↗</Link>}</div>
      <div className="relative min-h-[500px] flex items-center justify-center">
        <div className="absolute h-[360px] w-[360px] rounded-full bg-[#a3c5e9]/10 blur-3xl"/>
        {c.product3dModelUrl ? <model-viewer src={c.product3dModelUrl} poster={ownProductImage || undefined} alt={chosen?.name || 'AFSANA 3D perfume bottle'} camera-controls auto-rotate shadow-intensity="1.1" exposure="1.05" environment-image="neutral" style={{width:'100%',height:'480px',background:'transparent','--poster-color':'transparent'}}/> : <div className="relative h-[440px] w-[330px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none" style={{perspective:'1200px',touchAction:'pan-y'}} onPointerDown={startTurn} onPointerMove={moveTurn} onPointerUp={endTurn} onPointerCancel={endTurn} onLostPointerCapture={endTurn} aria-label="Drag left or right to rotate through the product gallery">
          <div className="absolute inset-0 flex items-center justify-center" style={{transform:`rotateY(${frame* (360/Math.max(frames.length,1))}deg) rotateX(${Math.sin(frame)*3}deg)`,transformStyle:'preserve-3d',transition:'transform .7s cubic-bezier(.2,.8,.2,1)'}}>
            {frames.length ? <img src={frames[frame]?.url} alt={chosen?.name||'AFSANA fragrance'} width="960" height="1200" loading="lazy" decoding="async" onError={(e)=>{e.currentTarget.style.display='none';}} className="max-h-[420px] max-w-[300px] object-contain drop-shadow-[0_45px_50px_rgba(0,0,0,.65)]"/> : <div className="grid h-[420px] w-[300px] place-items-center border border-white/15 bg-white/5 p-8 text-center"><div><b className="font-display text-3xl text-[#ffe500]">AFSANA</b><p className="mt-4 text-[9px] uppercase tracking-[.2em] text-white/55">Add a primary product photo in the live catalogue to enable the bottle showcase.</p></div></div>}
          </div>
        </div>}
        <div className="absolute bottom-4 left-0 text-[8px] uppercase tracking-[.18em] text-white/45">Drag to rotate · {frames.length} gallery angles</div><button type="button" onClick={()=>setAuto(v=>!v)} className="absolute bottom-4 right-0 border border-white/15 bg-white/5 px-4 py-3 text-[9px] uppercase tracking-[.2em] hover:border-[#ffe500]">{auto?'Pause 360°':'Play 360°'}</button>
      </div>
    </div>
  </section>;
}
function FragranceDNA({ section }) {
  const c=section.config||{};
  const items=cmsItems(c.items).length?cmsItems(c.items):[
    {title:'OUD',text:'Deep & mysterious'}, {title:'AMBER',text:'Warm & magnetic'},
    {title:'ROSE',text:'Soft & luminous'}, {title:'MUSK',text:'Clean & intimate'}
  ];
  return <section className="bg-[#f4f0e7] py-20 sm:py-28 text-[#263e0e]">
    <div className="container-xl">
      <Eyebrow>{c.eyebrow || 'FRAGRANCE DNA'}</Eyebrow>
      <div className="mt-6 grid lg:grid-cols-[.8fr_1.2fr] gap-12 items-center">
        <div><h2 className="font-display text-5xl sm:text-7xl leading-[.9]">{section.title || 'Know the notes.'}</h2><p className="mt-6 max-w-md text-sm leading-7 text-[#5f654f]">{c.body || 'Explore the personality behind every composition.'}</p></div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          {items.slice(0,4).map((x,i)=><article key={i} className="group relative min-h-[180px] sm:min-h-[220px] overflow-hidden rounded-[2rem] border border-[#263e0e]/10 bg-white p-6 sm:p-8 transition duration-500 hover:-translate-y-2 hover:shadow-[0_24px_60px_rgba(38,62,14,.14)]">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#b4bf41]/20 blur-xl group-hover:scale-150 transition duration-700"/>
            <span className="relative text-[9px] tracking-[.3em] text-[#748e40]">0{i+1}</span><h3 className="relative mt-10 font-display text-3xl sm:text-4xl">{x.title}</h3><p className="relative mt-2 text-xs text-[#5f654f]">{x.text || x.description}</p>
          </article>)}
        </div>
      </div>
    </div>
  </section>;
}
function InteractiveGallery({ section, products = [] }) {
  const c=section.config||{}, items=cmsItems(c.items);
  const useCatalog=['discover','journal','house','gifting'].includes(section.pageKey);
  const sourceItems=items.length?items:[{title:'The Signature'},{title:'Dark Woods'},{title:'Soft Light'},{title:'Made to Give'}];
  const galleryItems=sourceItems.map((item,i)=>{
    const product=catalogProductAt(products,i);
    return {...item,image:useCatalog?catalogImage(product):(item.image||item.link||''),link:useCatalog?catalogProductLink(product):(item.link||'/shop'),productName:useCatalog?product?.name:''};
  });
  return <section className="bg-[#faf8f4] py-20 sm:py-28">
    <div className="container-xl"><Eyebrow>{c.eyebrow || 'THE VISUAL JOURNEY'}</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl">{section.title || 'A scent in motion.'}</h2>
      <div className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5 [scrollbar-width:none]">{galleryItems.map((x,i)=><Link to={x.link||'/shop'} key={i} className="group relative min-w-[78vw] sm:min-w-[48vw] lg:min-w-[31vw] aspect-[.82] snap-start overflow-hidden rounded-[2rem] bg-[#173d26]">
        {x.image ? <img src={x.image} alt={x.productName||x.title||'AFSANA perfume'} width="1200" height="1000" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain p-5 transition duration-1000 group-hover:scale-105"/> : <div className="absolute inset-0 grid place-items-center font-display text-4xl text-[#ffbd37]">AFSANA</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080a07] via-transparent to-transparent"/><div className="absolute bottom-0 p-7 text-white"><p className="text-[9px] uppercase tracking-[.3em] text-[#ffbd37]">0{i+1}</p><h3 className="mt-2 font-display text-3xl">{x.title}</h3><p className="mt-2 text-xs text-white/75">{x.productName || x.description || x.text}</p></div>
      </Link>)}</div>
    </div>
  </section>;
}
function CommunityPulse({ section }) {
  const c = section.config || {};
  const items = cmsItems(c.items).slice(0, 6);
  const fallback = [
    { title: 'Afsana Circle', text: 'Growing', link: '' },
    { title: 'Verified Reviews', text: 'Real', link: '' },
    { title: 'Signature Scents', text: 'Explore', link: '/shop' },
    { title: 'Gift Moments', text: 'Made to give', link: '/gifting' },
  ];
  const rows = items.length ? items : fallback;
  return <section className="relative overflow-hidden bg-[#0a0d08] text-white border-y border-[#b4bf41]/15">
    <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_40%,rgba(180,191,65,.16),transparent_24%),radial-gradient(circle_at_80%_60%,rgba(123,0,58,.18),transparent_25%)]"/>
    <div className="container-xl relative py-16 sm:py-20">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
        <div>
          <Eyebrow light>{c.eyebrow || 'THE AFSANA CIRCLE'}</Eyebrow>
          <h2 className="mt-5 font-display text-4xl sm:text-6xl">{section.title || 'A house people come back to.'}</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/55">{c.subtitle || 'A living pulse of the people, stories and fragrances around AFSANA.'}</p>
        </div>
        <div className="text-[9px] uppercase tracking-[.22em] text-[#b4bf41]">Live brand pulse</div>
      </div>
      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 overflow-hidden rounded-2xl border border-white/10">
        {rows.map((x, i) => <Link key={i} to={x.link || '/shop'} className="group bg-white/[.035] p-6 sm:p-8 hover:bg-white/[.07] transition">
          <div className="font-display text-3xl sm:text-5xl text-[#b4bf41] tabular-nums"><AnimatedValue value={x.text || '—'} /></div>
          <div className="mt-4 text-[10px] uppercase tracking-[.22em] text-white/80">{x.title || 'AFSANA'}</div>
          {x.image && <p className="mt-2 text-xs text-white/45">{x.image}</p>}
          <span className="mt-6 inline-block text-[9px] uppercase tracking-[.2em] text-white/35 group-hover:text-[#b4bf41] transition">Discover ↗</span>
        </Link>)}
      </div>
      <p className="mt-5 text-[9px] uppercase tracking-[.18em] text-white/25">{c.disclaimer || 'Only publish verified numbers in this section. Labels without numbers remain editorial and are never presented as fake activity.'}</p>
    </div>
  </section>;
}
function PremiumFooterShowcase({ section }) {
  const c = section.config || {};
  return <section className="relative overflow-hidden bg-[#f4f0e7] text-[#263e0e] border-t border-[#263e0e]/10">
    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#a3c5e9]/25 blur-3xl"/>
    <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#7b003a]/10 blur-3xl"/>
    <div className="container-xl relative py-16 sm:py-24">
      <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-10 items-end">
        <div>
          <p className="text-[9px] uppercase tracking-[.4em] text-[#748e40]">{c.eyebrow || 'THE FINAL CHAPTER'}</p>
          <div className="mt-4 font-display text-[clamp(5rem,15vw,12rem)] leading-[.72] tracking-[-.06em]">AFSANA</div>
          <p className="mt-8 max-w-xl font-display text-2xl sm:text-4xl leading-tight">{section.title || 'Leave the final impression.'}</p>
          {c.body && <p className="mt-4 max-w-xl text-sm leading-7 text-[#5f654f]">{c.body}</p>}
        </div>
        <div className="rounded-3xl border border-[#263e0e]/10 bg-white/70 p-6 sm:p-8 backdrop-blur">
          <p className="text-[9px] uppercase tracking-[.28em] text-[#263e0e]">{c.offerLabel || 'PRIVATE ACCESS'}</p>
          <h3 className="mt-4 font-display text-3xl">{c.offerText || 'Discover your signature scent.'}</h3>
          {c.buttonText && c.buttonLink && <Link to={c.buttonLink} className="mt-7 inline-flex bg-[#263e0e] text-white px-6 py-3 text-[10px] uppercase tracking-[.2em]">{c.buttonText}<ArrowRight className="ml-2 w-4"/></Link>}
        </div>
      </div>
    </div>
  </section>;
}
function ConciergeFloat({ section }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const choices = [['Fresh & clean', 'fresh'], ['Warm & sensual', 'amber'], ['Dark & woody', 'oud'], ['Soft & floral', 'floral']];
  return <div className="fixed bottom-6 right-6 z-[85]">
    {open && <div className="mb-3 w-[min(330px,calc(100vw-32px))] rounded-3xl border border-white/15 bg-[#100d24] p-5 text-white shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.24em] text-[#d9ff55]">AFSANA PRIVATE CONCIERGE</p><h3 className="mt-2 font-display text-2xl">Find your scent mood.</h3><p className="mt-2 text-xs text-white/60">Choose the feeling you want your fragrance to leave.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close concierge"><X className="h-4 w-4"/></button></div>
      <div className="mt-4 grid grid-cols-2 gap-2">{choices.map(([label,value]) => <button key={value} type="button" onClick={() => navigate('/shop?q='+encodeURIComponent(value))} className="rounded-xl border border-white/15 px-3 py-3 text-left text-xs hover:border-[#d9ff55] hover:bg-white/5">{label}</button>)}</div>
    </div>}
    <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full bg-[#d9ff55] px-5 py-3 text-xs font-semibold text-[#100d24] shadow-xl hover:scale-105"><Sparkles className="h-4 w-4"/>{section.config?.label || 'Scent Concierge'}</button>
  </div>;
}

function ReferenceHero({ section, config, products }) {
  if (config.layout === 'inner') {
    const featuredProduct = catalogProductForEditorialPage(products, section.pageKey);
    const featuredImage = catalogImage(featuredProduct);
    const pageCopy = {
      discover: { eyebrow: 'AFSANA SCENT INTELLIGENCE', title: 'There is a scent for that.', subtitle: 'Explore the live AFSANA collection by mood, notes and the moments you want to make your own.', buttonText: 'Begin your scent match', buttonLink: '/discover' },
      journal: { eyebrow: 'NOTES FROM THE HOUSE', title: 'A world in every note.', subtitle: 'Stories, ingredients and rituals from the House of AFSANA—through the fragrances that bring each feeling to life.', buttonText: 'Explore the AFSANA collection', buttonLink: '/shop' },
      house: { eyebrow: 'THE HOUSE OF AFSANA', title: 'We make memories visible.', subtitle: 'A modern fragrance house shaped by contrast, character and the memories a scent leaves behind.', buttonText: 'Discover the house', buttonLink: '/shop' },
      gifting: { eyebrow: 'GIVE WITH FEELING', title: 'Wrap up the extraordinary.', subtitle: 'Choose a real AFSANA fragrance for birthdays, celebrations, thoughtful gestures and the moments worth remembering.', buttonText: 'Explore gift fragrances', buttonLink: '/gifting' }
    }[section.pageKey] || {};
    return <section className="afsana-ref-inner-hero afsana-ref-inner-hero-catalog">
      <div className="afsana-ref-inner-overlay"/>
      <div className="container-xl afsana-ref-inner-catalog-grid relative z-10">
        <div className="afsana-ref-inner-catalog-copy">
          <p className="afsana-ref-eyebrow">{config.eyebrow || pageCopy.eyebrow || 'THE ART OF SCENT'}</p>
          <h1>{section.title || pageCopy.title || 'A world in every note.'}</h1>
          <p>{config.subtitle || pageCopy.subtitle || 'Discover the AFSANA collection and find a fragrance that feels like you.'}</p>
          <Link className="afsana-ref-btn" to={config.buttonLink || pageCopy.buttonLink || '/shop'}>{config.buttonText || pageCopy.buttonText || 'Explore the collection'} <span>↗</span></Link>
        </div>
        <div className="afsana-ref-inner-catalog-product">
          {featuredImage ? <Link to={catalogProductLink(featuredProduct)} aria-label={`Explore ${featuredProduct.name}`}>
            <img src={featuredImage} srcSet={responsiveUnsplashSrcSet(featuredImage, 68)} sizes="(max-width: 700px) 90vw, 42vw" alt={featuredProduct.name || 'AFSANA perfume'} width="900" height="1200" loading="eager" decoding="async" fetchPriority="high"/>
          </Link> : <div className="afsana-ref-inner-product-pending"><b>AFSANA</b><span>THE ART OF SCENT</span></div>}
          {featuredProduct?.name && <p>{featuredProduct.name}</p>}
        </div>
      </div>
    </section>;
  }
  const product = products?.[0];
  const bottle = config.heroBottleImageUrl || product?.image?.url || product?.media?.find((m) => m.kind === 'main')?.url || product?.media?.[0]?.url;
  return <section className="afsana-ref-hero">
    <div className="container-xl afsana-ref-hero-grid">
      <div className="afsana-ref-hero-copy">
        <p className="afsana-ref-eyebrow">{config.heroKicker || config.eyebrow || 'A NEW DIMENSION OF FRAGRANCE'}</p>
        <h1>SCENT IS<br/><em>YOUR</em><br/>ENERGY.</h1>
        <p className="afsana-ref-hero-sub">{config.subtitle || 'Not just a fragrance. A feeling that enters the room before you do. Explore a world of unexpected notes, bold presence and unforgettable rituals.'}</p>
        <div className="afsana-ref-actions">
          <Link className="afsana-ref-btn" to={config.buttonLink || '/shop'}>{config.buttonText || 'Explore the collection'} <span>↗</span></Link>
          <Link className="afsana-ref-btn afsana-ref-btn-ghost" to="/discover">{config.secondaryButtonText || 'Find your scent'} <span>✳</span></Link>
        </div>
        <div className="afsana-ref-meta"><div><strong>01—08</strong><span>Signature scents</span></div><div><strong>12h+</strong><span>Long-wear ritual*</span></div><div><strong>∞</strong><span>Ways to be you</span></div></div>
      </div>
      <div className="afsana-ref-hero-stage">
        <div className="afsana-ref-glow"/><div className="afsana-ref-orbit"><i/></div>
        {bottle ? <img className="afsana-ref-bottle-img" src={bottle} srcSet={responsiveUnsplashSrcSet(bottle, 70)} sizes="(max-width: 700px) 90vw, 42vw" alt={product?.name || 'AFSANA perfume bottle'} width="1200" height="1500" fetchPriority="high" decoding="async" onError={(e)=>{e.currentTarget.style.display='none';}}/> : <div className="afsana-ref-bottle-css"><b>AFSANA</b><small>EAU DE PARFUM</small></div>}
        <div className="afsana-ref-sticker">SCENT<br/>OBJECT<br/>NO. 001</div>
        <div className="afsana-ref-index">OBJECT 001 / {product?.name || 'AFSANA SIGNATURE'}</div>
      </div>
    </div>
    <div className="afsana-ref-scroll">Scroll to experience</div>
  </section>;
}

function CmsSection({ section, products, faq, referenceAssets = {}, shopSettings = null }) {
  const c = { ...referenceAssets, ...(section.config || {}) };
  const align = c.align === 'center' ? 'text-center items-center' : c.align === 'right' ? 'text-right items-end' : 'text-left items-start';
  const style = {
    width: `${Math.min(100, Math.max(20, Number(c.width) || 100))}%`,
    marginLeft: c.align === 'right' ? 'auto' : c.align === 'center' ? 'auto' : '0',
    marginRight: c.align === 'left' ? 'auto' : c.align === 'center' ? 'auto' : '0',
    paddingTop: `${Math.max(0, Number(c.paddingTop) || 0)}px`,
    paddingBottom: `${Math.max(0, Number(c.paddingBottom) || 0)}px`,
    minHeight: c.height && c.height !== 'auto' ? String(c.height).match(/^\d+(\.\d+)?(px|vh|rem|%)$/) ? c.height : undefined : undefined,
    background: c.background || undefined,
  };
  const cols = Math.min(6, Math.max(1, Number(c.columns) || 4));
  const gap = Math.min(64, Math.max(0, Number(c.gap) || 16));
  const gridStyle = { '--cms-cols': cols, gap: `${gap}px` };
  const heading = section.title ? <div className={`mb-8 flex flex-col ${align}`}><Eyebrow light={['hero','video_grid','promo_timer','testimonials','cinematic_statement','lookbook'].includes(section.type)}>{c.eyebrow || 'AFSANA'}</Eyebrow><h2 className="mt-5 font-display text-4xl sm:text-6xl leading-[.95]">{section.title}</h2>{c.subtitle && <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5f654f]">{c.subtitle}</p>}</div> : null;
  const btn = c.buttonText && c.buttonLink ? <Link to={c.buttonLink} className="mt-7 inline-flex items-center gap-2 bg-[#b4bf41] px-6 py-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#263e0e]">{c.buttonText}<ArrowRight className="w-4 h-4"/></Link> : null;
  if (section.type === 'custom_footer') {
    const store = shopSettings?.store || {};
    const configuredLinks = cmsItems(c.items).filter((item) => item && (item.title || item.text || item.link));
    const exploreLinks = configuredLinks.length ? configuredLinks : [
      { title: 'The collection', text: 'Discover the AFSANA fragrances.', link: '/shop' },
      { title: 'Scent finder', text: 'Find a scent that feels like you.', link: '/discover' },
      { title: 'The house', text: 'The story and philosophy of AFSANA.', link: '/about' },
      { title: 'The journal', text: 'Notes, rituals and inspiration.', link: '/journal' },
      { title: 'Gifting', text: 'Thoughtful fragrance gifts.', link: '/gifting' }
    ];
    const socials = [
      ['Instagram', c.instagramUrl || store.instagram, Instagram],
      ['Facebook', c.facebookUrl || store.facebook, Facebook],
      ['TikTok', c.tiktokUrl, Music2],
      ['YouTube', c.youtubeUrl, Youtube],
      ['Pinterest', c.pinterestUrl, Pin],
      ['X', c.xUrl, X]
    ].filter(([, url]) => /^https?:\/\//i.test(String(url || '')));
    const email = String(c.email || store.email || '').trim();
    const phone = String(c.phone || store.phone || '').trim();
    const address = String(c.address || store.address || '').trim();
    const whatsappDisplay = String(c.whatsapp || store.whatsapp || '+92 325 2032321').trim();
    const whatsappNumber = whatsappDisplay.replace(/[^\d]/g, '') || '923252032321';
    const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Assalam-o-Alaikum! I need help with AFSANA fragrances or an order.')}`;
    const year = new Date().getFullYear();
    const careLinks = [
      ['Track an order', '/track'],
      ['Contact the house', '/contact'],
      ['Customer account', '/account']
    ];
    return <footer className="afsana-pro-footer relative overflow-hidden text-white">
      <div aria-hidden="true" className="afsana-footer-glow pointer-events-none absolute inset-0"/>
      <div className="container-xl relative">
        <div className="afsana-footer-grid">
          <div className="afsana-footer-brand-col">
            <p className="afsana-footer-eyebrow">{c.tagline || 'THE ART OF SCENT'}</p>
            <h2 className="afsana-footer-brand">{c.brandName || 'AFSANA'}</h2>
            <p className="afsana-footer-description">{c.description || 'Fragrance is more than a note. It is a memory, a feeling, a signature.'}</p>
            {socials.length > 0 && <div className="afsana-footer-socials">
              <p className="afsana-footer-label">Follow the house</p>
              <div className="afsana-footer-social-links">
                {socials.map(([label, url, Icon]) => <a key={label} href={url} target="_blank" rel="noreferrer" aria-label={`AFSANA on ${label}`} title={label} className="afsana-footer-social">
                  <Icon className="h-4 w-4"/>
                </a>)}
              </div>
            </div>}
          </div>

          <div className="afsana-footer-group">
            <h3 className="afsana-footer-heading">Explore the house</h3>
            <nav className="afsana-footer-links" aria-label="Explore AFSANA">
              {exploreLinks.map((item, index) => <Link key={item.id || item.link || item.title || index} to={item.link || '/shop'} title={item.text || item.title}>
                <span>{item.title || item.text || 'Explore'}</span><span aria-hidden="true">↗</span>
              </Link>)}
            </nav>
          </div>

          <div className="afsana-footer-group">
            <h3 className="afsana-footer-heading">Customer care</h3>
            <nav className="afsana-footer-links" aria-label="Customer care">
              {careLinks.map(([label, link]) => <Link key={link} to={link}>
                <span>{label}</span><span aria-hidden="true">↗</span>
              </Link>)}
            </nav>
            <p className="afsana-footer-detail">Order tracking, delivery questions and fragrance advice.</p>
          </div>

          <div className="afsana-footer-group afsana-footer-contact">
            <h3 className="afsana-footer-heading">Contact the house</h3>
            <p className="afsana-footer-detail">For fragrance recommendations, gifting help and order support.</p>
            {email && <a className="afsana-footer-contact-line" href={`mailto:${email}`}>{email}</a>}
            {phone && <a className="afsana-footer-contact-line" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a>}
            {address && <p className="afsana-footer-contact-line afsana-footer-address">{address}</p>}
            <a className="afsana-footer-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">
              <span>WhatsApp support</span><ArrowRight className="h-4 w-4"/>
            </a>
            <p className="afsana-footer-whatsapp-number">{whatsappDisplay}</p>
          </div>
        </div>

        <div className="afsana-footer-bottom">
          <span>{c.footerNote || `© ${year} AFSANA PERFUMES. ALL RIGHTS RESERVED.`}</span>
          <span className="afsana-footer-made">Made to leave a memory.</span>
          <nav aria-label="Legal and company information">
            <Link to="/privacy-policy">Privacy policy</Link>
            <Link to="/terms-of-service">Terms of service</Link>
            <Link to="/contact">Customer care</Link>
          </nav>
        </div>
      </div>
    </footer>;
  }
  if (section.type === 'reference_assets' || section.type === 'nav_menu') return null;
  if (section.type === 'whatsapp_float') {
    const phone = '923252032321';
    if (!phone) return null;
    const href = `https://wa.me/${phone}?text=${encodeURIComponent(c.message || 'Assalam-o-alaikum, I need help with AFSANA fragrances.')}`;
    return <a href={href} target="_blank" rel="noreferrer" aria-label="Chat with AFSANA on WhatsApp" title="Chat with AFSANA on WhatsApp" className="fixed bottom-24 right-6 z-[86] isolate inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#20c768] p-0 text-white shadow-2xl transition hover:-translate-y-1 hover:scale-105">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[#20c768]/55 animate-ping" style={{ animationDuration: '5s' }}/>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0">
        <path fill="currentColor" d="M20.52 3.48A11.77 11.77 0 0 0 12.15 0C5.64 0 .34 5.3.34 11.81c0 2.08.54 4.12 1.57 5.91L.25 24l6.45-1.69a11.8 11.8 0 0 0 5.45 1.31h.01c6.51 0 11.81-5.3 11.81-11.81 0-3.15-1.23-6.11-3.45-8.33ZM12.16 21.6h-.01a9.8 9.8 0 0 1-4.99-1.37l-.36-.21-3.83 1 1.02-3.73-.23-.38a9.77 9.77 0 0 1-1.5-5.1c0-5.42 4.41-9.83 9.84-9.83 2.63 0 5.1 1.03 6.96 2.89a9.78 9.78 0 0 1 2.88 6.97c0 5.42-4.41 9.83-9.78 9.83Zm5.39-7.36c-.29-.15-1.7-.84-1.97-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.91 1.13-.17.2-.34.22-.63.08-.29-.15-1.22-.45-2.32-1.43-.86-.76-1.44-1.7-1.61-1.99-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.3-.49.1-.19.05-.36-.02-.51-.08-.15-.64-1.54-.88-2.11-.23-.55-.47-.48-.64-.49l-.55-.01c-.2 0-.51.08-.78.37-.27.29-1.03 1.01-1.03 2.47 0 1.46 1.05 2.87 1.2 3.07.15.2 2.07 3.16 5.01 4.43.7.3 1.25.49 1.68.63.71.23 1.36.2 1.87.12.57-.09 1.7-.7 1.94-1.38.24-.68.24-1.26.17-1.38-.08-.12-.27-.2-.56-.34Z"/>
      </svg>
    </a>;
  }
  if (section.type === 'ai_concierge') return <ConciergeFloat section={section}/>;
  if (section.type === 'spacer') return <div style={{ height: Number(c.height) || 80 }} />;
  if (section.type === 'offer_timer') return <section className="relative isolate overflow-hidden bg-white px-4 py-14 font-sans text-[#261638] sm:px-6 sm:py-20">
    <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-[-5rem] h-80 w-80 rounded-full bg-[#fff0a8]/45 blur-3xl"/>
    <div aria-hidden="true" className="pointer-events-none absolute right-[-8rem] top-[-4rem] h-[26rem] w-[26rem] rounded-full bg-pink-100/80 blur-3xl"/>
    <div aria-hidden="true" className="pointer-events-none absolute bottom-[-10rem] left-[35%] h-96 w-96 rounded-full bg-sky-100/80 blur-3xl"/>
    <div className="container-xl relative mx-auto grid max-w-[1320px] overflow-hidden rounded-[28px] border border-purple-100 bg-gradient-to-br from-white via-[#fffaff] to-[#f0f9ff] shadow-[0_24px_80px_rgba(65,41,105,.12)] lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative flex flex-col items-start justify-center p-7 sm:p-10 lg:p-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-2 text-[9px] font-bold uppercase tracking-[.2em] text-purple-700 shadow-sm sm:text-[10px]"><span className="h-2 w-2 rounded-full bg-[#f6d957] shadow-[0_0_0_4px_rgba(246,217,87,.2)]"/>{c.label || 'A LITTLE EXTRA FROM THE HOUSE'}</span>
        <p className="mt-7 text-[9px] font-bold uppercase tracking-[.25em] text-sky-700 sm:text-[10px]">A GESTURE FROM AFSANA</p>
        <h2 className="mt-3 max-w-xl font-sans text-3xl font-semibold leading-[1.08] tracking-[-.04em] text-[#261638] sm:text-4xl lg:text-5xl">{section.title || 'Good taste. Even better delivery.'}</h2>
        <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">{c.offerText || 'Complimentary delivery on orders above PKR 7,500. Your next favourite arrives wrapped in the AFSANA experience.'}</p>
        <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-[#f2df87] bg-gradient-to-r from-[#fff9d9] via-white to-[#fff0f8] px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ffe66d] text-lg text-[#261638]">✳</span>
          <span><b className="block text-[10px] font-extrabold uppercase tracking-[.12em] text-purple-800">Complimentary delivery</b><small className="mt-1 block text-[9px] font-semibold uppercase tracking-[.12em] text-slate-500">On orders above PKR 7,500</small></span>
        </div>
        <Link to={c.buttonLink || '/shop'} className="group mt-8 inline-flex min-h-12 items-center gap-5 rounded-full bg-gradient-to-r from-purple-700 via-violet-600 to-pink-500 px-6 py-3 text-[10px] font-bold uppercase tracking-[.16em] text-white shadow-[0_12px_28px_rgba(109,40,217,.2)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(109,40,217,.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 sm:text-[11px]">{c.buttonText || 'Explore the private edit'}<span className="grid h-7 w-7 place-items-center rounded-full bg-[#ffe66d] text-base text-[#261638] transition-transform duration-300 group-hover:translate-x-1">↗</span></Link>
      </div>
      <div className="afsana-private-offer-panel">
        <div className="afsana-private-offer-inner">
          <div className="afsana-private-offer-topline">
            <span className="afsana-private-offer-brand"><span aria-hidden="true">✧</span> AFSANA PRIVATE OFFER</span>
            <span className="afsana-private-offer-badge"><span aria-hidden="true">◷</span> Limited time</span>
          </div>
          <h3 className="afsana-private-offer-heading"><span>Your</span> <em>offer</em> <span>window</span></h3>
          <div className="afsana-private-offer-countdown-wrap"><OfferCountdown endAt={c.endAt}/></div>
          <div className="afsana-private-offer-footer"><span>Live digital countdown</span><span>D · H · M · S</span></div>
        </div>
      </div>
    </div>
  </section>;
  if (section.type === 'offer_timer' || section.type === 'promo_timer') return <section className="bg-[#263e0e] text-white"><div className="container-xl" style={style}><div className={`flex flex-col ${align}`}><Eyebrow light>{c.label || 'LIMITED OFFER'}</Eyebrow><h2 className="mt-4 font-display text-4xl sm:text-6xl">{section.title || 'A moment worth discovering.'}</h2><p className="mt-4 max-w-xl text-sm leading-7 text-white/65">{c.offerText}</p>{!c.hideTimer && c.endAt ? <CmsTimer endAt={c.endAt}/> : null}{btn}</div></div></section>;
  if (section.type === 'muse_scene') return <MuseScene section={section} products={products}/>;
    if (section.type === 'product_3d_showcase') return <Product3DShowcase section={{...section,config:c}} products={products}/>;
    if (section.type === 'fragrance_dna') return <FragranceDNA section={section}/>;
    if (section.type === 'interactive_gallery') return <InteractiveGallery section={section} products={products}/>;
    if (section.type === 'community_pulse') return <CommunityPulse section={section}/>;
    if (section.type === 'footer_showcase') return <PremiumFooterShowcase section={section}/>;
    if (section.type === 'video_grid') {
    const editorialPage = ['discover','journal','house','gifting'].includes(section.pageKey);
    const sourceVideos = cmsItems(c.items);
    const videoItems = sourceVideos.length ? sourceVideos : ['The First Impression','Dark Woods','Made by Hand','Leave a Trace'].map((title)=>({title}));
    const videos = videoItems.slice(0, Math.max(1, Number(c.limit)||cols)).map((x,i) => ({
      ...x,
      image: x.image || [c.filmAtmosphereVideoUrl,c.filmBotanicalVideoUrl,c.filmCraftVideoUrl,c.filmEmotionVideoUrl][i] || '',
      link: editorialPage ? catalogImage(catalogProductAt(products,i)) : (x.link || [c.filmAtmosphereImageUrl,c.filmBotanicalImageUrl,c.filmCraftImageUrl,c.filmEmotionImageUrl][i] || '')
    }));
    return <section className="relative isolate overflow-hidden bg-white py-16 text-[#241638] sm:py-20 lg:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-[-5rem] h-96 w-96 rounded-full bg-purple-100/80 blur-3xl"/>
      <div aria-hidden="true" className="pointer-events-none absolute right-[-8rem] top-[18%] h-[30rem] w-[30rem] rounded-full bg-pink-100/80 blur-3xl"/>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[-10rem] left-[38%] h-96 w-96 rounded-full bg-sky-100/80 blur-3xl"/>
      <div className="container-xl relative mx-auto max-w-[1440px]">
        <div className="mb-9 flex flex-col gap-5 px-1 sm:mb-12 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="max-w-3xl">
            <p className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[.32em] text-purple-700 sm:text-[10px]"><span className="h-px w-8 bg-gradient-to-r from-purple-500 to-pink-400"/>{c.eyebrow || 'THE AFSANA MOVING IMAGE'}</p>
            <h2 className="mt-5 font-display text-[clamp(2.8rem,7vw,6.5rem)] font-medium leading-[.9] tracking-[-.055em] text-[#241638]">Feel the <em className="bg-gradient-to-r from-purple-700 via-pink-500 to-sky-500 bg-clip-text text-transparent">fragrance.</em></h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-base lg:mb-2">{c.subtitle || 'Stories that begin with a note, gather emotion and stay long after the moment has passed.'}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">{videos.map((x,i)=><FilmCard key={i} film={x} index={i} autoplay={c.autoplay!==false}/>)}</div>
      </div>
    </section>;
  }
  if (section.type === 'post_grid' || section.type === 'blog_grid') {
    const journalPage = section.pageKey === 'journal';
    const defaultPosts = [
      { title: 'Find your signature scent', text: 'Begin with the feeling you want to carry. Explore the AFSANA collection and discover a fragrance that belongs in your everyday ritual.' },
      { title: 'A world in every note', text: 'Fresh, floral, woody and warm compositions each create a different atmosphere. Explore the AFSANA fragrances and find the notes that feel like you.' },
      { title: 'The art of giving', text: 'A considered fragrance gift turns an ordinary occasion into a personal memory. Discover the AFSANA edit for thoughtful gifting.' }
    ];
    const sourcePosts = cmsItems(c.items);
    const posts = (sourcePosts.length ? sourcePosts : defaultPosts).slice(0, Math.max(3, Number(c.limit)||3)).map((x,i) => {
      const product = catalogProductAt(products, i);
      return {
        ...x,
        image: ['discover','journal','house','gifting'].includes(section.pageKey) ? catalogImage(product) : (x.image || [c.journalImage1Url,c.journalImage2Url,c.journalImage3Url][i] || ''),
        link: ['discover','journal','house','gifting'].includes(section.pageKey) && product ? catalogProductLink(product) : (x.link || '/journal'),
        productName: ['discover','journal','house','gifting'].includes(section.pageKey) ? product?.name : ''
      };
    });
    const featured = posts[0];
    const supporting = posts.slice(1,3);
    return <section className="afsana-journal-pro">
      <div className="container-xl">
        <div className="afsana-journal-heading">
          <div>
            <p className="afsana-journal-kicker"><span/> {c.eyebrow || 'NOTES FROM THE HOUSE'}</p>
            <h2>The scent <em>journal.</em></h2>
            <p className="afsana-journal-intro">{c.subtitle || 'Ideas, ingredients and rituals behind the fragrances we remember.'}</p>
          </div>
          <Link to="/journal" className="afsana-journal-all">Explore the journal <ArrowRight className="h-4 w-4"/></Link>
        </div>
        {featured ? <div className="afsana-journal-layout">
          <Link to={featured.link || '/journal'} className="afsana-journal-feature">
            {featured.image ? <img src={featured.image} srcSet={responsiveUnsplashSrcSet(featured.image, 66)} sizes="(max-width: 700px) 100vw, 58vw" alt={featured.productName || featured.title || 'AFSANA journal feature'} width="1600" height="1100" loading="lazy" decoding="async" onError={(e)=>{e.currentTarget.style.display='none';}}/> : <div className="afsana-journal-image-fallback"><span>AFSANA</span><small>THE ART OF SCENT</small></div>}
            <div className="afsana-journal-feature-shade"/>
            <div className="afsana-journal-feature-meta"><span>THE FEATURED STORY</span><span>01 / {String(posts.length).padStart(2,'0')}</span></div>
            <div className="afsana-journal-feature-copy">
              <p>THE AFSANA EDIT</p>
              <h3>{featured.title}</h3>
              {featured.text && <span>{featured.text}</span>}
              <b>{journalPage ? 'Explore fragrance' : 'Read the story'} <ArrowRight className="h-4 w-4"/></b>
            </div>
          </Link>
          <div className="afsana-journal-side">
            {supporting.map((post,index)=><Link to={post.link || '/journal'} key={post.title || index} className="afsana-journal-side-card">
              <div className="afsana-journal-side-image">{post.image ? <img src={post.image} srcSet={responsiveUnsplashSrcSet(post.image, 66)} sizes="(max-width: 700px) 46vw, 30vw" alt={post.productName || post.title || 'AFSANA journal story'} width="900" height="1100" loading="lazy" decoding="async" onError={(e)=>{e.currentTarget.style.display='none';}}/> : <div className="afsana-journal-image-fallback"><span>AFSANA</span></div>}<span>0{index+2}</span></div>
              <div className="afsana-journal-side-copy">
                <small>{index===0?'INGREDIENT NOTES':'SCENT & RITUAL'}</small>
                <h3>{post.title}</h3>
                {post.text && <p>{post.text}</p>}
                <b>{journalPage ? 'Explore fragrance' : 'Discover story'} <ArrowRight className="h-3.5 w-3.5"/></b>
              </div>
            </Link>)}
            <div className="afsana-journal-note"><span>AFSANA / JOURNAL</span><p>Every fragrance holds a story. Here are a few worth discovering.</p><Link to="/journal">Enter the journal ↗</Link></div>
          </div>
        </div> : <div className="afsana-journal-empty"><p>Stories from the House of AFSANA.</p><Link to="/journal">Explore the journal ↗</Link></div>}
      </div>
    </section>;
  }
  if (['featured_collection','best_sellers','new_arrivals','under_2000','gift_boxes'].includes(section.type)) {
    const picks=(products||[]).slice(0, Number(c.limit)||4);
    const isObjects=section.type==='best_sellers';
    if(isObjects) return <section className="relative overflow-hidden bg-[#100d24] py-20 sm:py-28 text-white">
      <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-[#7357ff]/20 blur-3xl"/>
      <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-[#d9ff55]/10 blur-3xl"/>
      <div className="container-xl relative">
        <div className="mb-12 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="!text-white flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[.35em]"><span className="h-px w-10 bg-white"/> THE AFSANA SELECTION</p>
            <h2 className="!text-white mt-5 max-w-3xl font-display text-5xl leading-[.9] sm:text-7xl">Objects of <em className="!text-white">desire.</em></h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/55">{c.subtitle || 'Signature fragrances chosen for presence, character and the memories they leave behind.'}</p>
          </div>
          <Link to="/shop" className="inline-flex w-fit items-center gap-3 border border-white/20 px-6 py-3 text-[9px] font-semibold uppercase tracking-[.2em] transition hover:border-[#d9ff55] hover:text-[#d9ff55]">View full collection <ArrowRight className="h-3.5 w-3.5"/></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {picks.map((p,i)=>{
            const price=p.priceFrom ? `PKR ${Number(p.priceFrom).toLocaleString('en-PK')}` : 'Price on request';
            const media=(p.media||[]).filter(m=>m?.url&&m?.kind!=='video');
            const image=media[0]?.url || p.image?.url || '';
            const second=media[1]?.url || '';
            return <Link key={p.id||i} to={`/product/${p.slug}`} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.045] p-2 transition duration-500 hover:-translate-y-2 hover:border-[#d9ff55]/40 hover:bg-white/[.07]">
              <div className="relative aspect-[.82] overflow-hidden rounded-xl bg-[#f4f0e8]">
                {image ? <><img src={image} srcSet={responsiveUnsplashSrcSet(image, 66)} sizes="(max-width: 640px) 48vw, (max-width: 1024px) 33vw, 25vw" alt={p.name||'AFSANA fragrance'} width="1000" height="1220" loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${second?'group-hover:opacity-0 group-hover:scale-105':'group-hover:scale-105'}`}/>{second&&<img src={second} srcSet={responsiveUnsplashSrcSet(second, 66)} sizes="(max-width: 640px) 48vw, (max-width: 1024px) 33vw, 25vw" alt="" width="1000" height="1220" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 group-hover:opacity-100 group-hover:scale-105"/>}</> : <div className="grid h-full place-items-center text-[#100d24] text-xs uppercase tracking-[.2em]">AFSANA</div>}
                <span className="absolute left-3 top-3 rounded-full border border-[#100d24]/10 bg-white/90 px-3 py-1 text-[8px] font-semibold uppercase tracking-[.16em] text-[#100d24]">01 · Signature</span>
                <span className="absolute bottom-3 right-3 rounded-full bg-[#d9ff55] px-3 py-1.5 text-[9px] font-bold tracking-[.08em] text-[#100d24]">View fragrance ↗</span>
              </div>
              <div className="px-3 pb-4 pt-4">
                <p className="text-[8px] uppercase tracking-[.22em] text-[#d9ff55]/70">{p.fragrance?.family || p.fragrance?.gender || 'Extrait de Parfum'}</p>
                <div className="mt-1 flex items-start justify-between gap-3"><h3 className="font-display text-xl leading-tight">{p.name}</h3><span className="shrink-0 pt-1 text-[10px] font-semibold text-[#d9ff55]">{price}</span></div>
                <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-white/45">{p.content?.shortDescription || p.description || 'A signature AFSANA composition made to leave a lasting impression.'}</p>
              </div>
            </Link>
          })}
        </div>
      </div>
    </section>;
    return <section className="bg-[#f3f1e9]"><div className="container-xl" style={style}>{heading}<div className="cms-grid" style={gridStyle}>{picks.map(p=><ProductCard key={p.id} product={p}/>)}</div>{btn}</div></section>;
  }
  if (section.type === 'scent_finder') return <Finder section={section}/>;
  if (section.type === 'newsletter') return (
    <section className="afsana-ref-newsletter">
      <div className="container-xl afsana-ref-newsletter-shell" style={style}>
        <div className="afsana-ref-newsletter-copy">
          <p className="afsana-ref-newsletter-kicker">{c.eyebrow || 'THE PRIVATE LIST'}</p>
          <h2>{section.title || 'Be the first to know.'}</h2>
          <p className="afsana-ref-newsletter-description">{c.body || 'Early access to new compositions, private drops and exclusive stories.'}</p>
          <div className="afsana-ref-newsletter-signoff"><span>AFSANA PRIVÉ</span><i/> <span>LETTERS FROM THE HOUSE</span></div>
        </div>
        <div className="afsana-ref-newsletter-form"><NewsletterSubscription/></div>
      </div>
    </section>
  );
  if (section.type === 'faq') return <section className="bg-[#faf8f4]"><div className="container-xl" style={style}>{heading}<div className="max-w-3xl space-y-3">{(faq||[]).map((x,i)=><details key={i} className="border-b border-[#263e0e]/10 py-4"><summary className="cursor-pointer font-display text-xl">{x.question}</summary><p className="mt-3 text-sm leading-7 text-[#5f654f]">{x.answer}</p></details>)}</div></div></section>;
  if (section.type === 'category_tiles') {
    const assetImages = section.pageKey === 'gifting'
      ? [c.giftImage1Url,c.giftImage2Url,c.giftImage3Url]
      : section.pageKey === 'discover'
        ? [c.discoverEnergyImageUrl,c.discoverSoftImageUrl,c.discoverNightImageUrl]
        : [c.worldDarkImageUrl,c.worldSoftImageUrl,c.worldBoldImageUrl];
    const defaultWorlds = section.pageKey === 'gifting' ? [
      { title: 'Signature gifting', text: 'A personal fragrance for someone unforgettable.' },
      { title: 'Discover a scent', text: 'Choose a fragrance that feels like them.' },
      { title: 'Gift-ready moments', text: 'Make every celebration feel considered.' }
    ] : [
      { title: 'Make a statement', text: 'Confident, vivid and unforgettable.' },
      { title: 'Feel luminous', text: 'Soft, airy and effortless.' },
      { title: 'Stay mysterious', text: 'Deep, warm and magnetic.' }
    ];
    const sourceWorlds = cmsItems(c.items);
    const useCatalogImages = ['discover','gifting','house','journal'].includes(section.pageKey);
    const worlds = (sourceWorlds.length ? sourceWorlds : defaultWorlds).slice(0,3).map((item, i) => {
      const product = catalogProductAt(products, i);
      return {
        ...item,
        image: useCatalogImages ? catalogImage(product) : (item.image || assetImages[i] || ''),
        link: useCatalogImages && product ? catalogProductLink(product) : (item.link || '/shop'),
        productName: useCatalogImages ? product?.name : ''
      };
    });
    return <section className="afsana-ref-worlds"><div className="container-xl"><div className="afsana-ref-section-head"><div><p className="afsana-ref-tag">{c.eyebrow || 'CHOOSE YOUR ATMOSPHERE'}</p><h2>{section.pageKey === 'gifting' ? 'Give them a feeling.' : section.pageKey === 'discover' ? 'Choose a feeling.' : <>Enter a scent <em>world.</em></>}</h2></div><p>{c.subtitle || 'Every fragrance has a universe. Find the one that feels like yours—from magnetic woods to luminous skin scents.'}</p></div><div className="afsana-ref-world-grid">{worlds.slice(0,3).map((x,i)=><Link to={x.link || '/shop'} key={i} className="afsana-ref-world-card">{x.image ? <img src={x.image} srcSet={responsiveUnsplashSrcSet(x.image, 66)} sizes="(max-width: 700px) 92vw, 30vw" alt={x.productName || x.title || 'AFSANA perfume'} width="1200" height="1000" loading="lazy" decoding="async" onError={(e)=>{e.currentTarget.style.display='none';}}/> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,rgba(255,189,55,.16),transparent_45%),linear-gradient(145deg,#173d26,#24583a)]"><div className="text-center"><b className="font-display text-4xl tracking-[.2em] text-[#ffbd37]">AFSANA</b><small className="mt-3 block text-[8px] font-semibold uppercase tracking-[.24em] text-white/65">THE ART OF SCENT</small></div></div>}<div className="afsana-ref-world-info"><small>{String(i+1).padStart(2,'0')} / {section.pageKey === 'gifting' ? ['THE PERSONAL TOUCH','THE FIRST CHAPTER','THE LITTLE EXTRA'][i] : section.pageKey === 'discover' ? ['THE ENERGY SEEKER','THE SOFT ROMANTIC','THE NIGHT THINKER'][i] : ['THE AFTER DARK EDIT','THE DAYLIGHT EDIT','THE STATEMENT EDIT'][i]}</small><h3>{x.title}</h3><p>{x.text}</p></div><span className="afsana-ref-world-arrow">↗</span></Link>)}</div></div></section>;
  }
  if (section.type === 'testimonials') return <CmsTestimonials section={section}/>;
  if (['benefits','trust_grid','values_grid'].includes(section.type)) return <section className="bg-[#faf8f4]"><div className="container-xl" style={style}>{heading}<div className="cms-grid" style={gridStyle}>{cmsItems(c.items).map((x,i)=><article key={i} className="rounded-2xl border border-[#263e0e]/10 bg-white p-6"><span className="text-2xl text-[#748e40]">✦</span><h3 className="mt-5 font-display text-2xl">{x.title}</h3><p className="mt-3 text-sm leading-7 text-[#5f654f]">{x.text}</p>{x.link && <Link to={x.link} className="mt-5 inline-block text-[9px] uppercase tracking-[.2em] text-[#263e0e]">Discover ↗</Link>}</article>)}</div></div></section>;
  if (section.type === 'marquee') return <section className="overflow-hidden bg-[#b4bf41] text-[#263e0e]"><div className="marquee-track flex gap-12 py-4 text-[10px] font-bold uppercase tracking-[.25em]">{cmsItems(c.items).concat(cmsItems(c.items)).map((x,i)=><span key={i}>{x.title || x.text || 'THE ART OF SCENT'} ✦</span>)}</div></section>;
  if (section.type === 'rich_text') return <section className="bg-[#faf8f4]"><div className={`container-xl flex flex-col ${align}`} style={style}><Eyebrow>{c.eyebrow || 'THE HOUSE OF AFSANA'}</Eyebrow><h2 className="mt-5 max-w-5xl font-display text-4xl sm:text-7xl">{section.title}</h2><p className="mt-6 max-w-3xl text-sm leading-7 opacity-70">{c.body}</p>{btn}</div></section>;
  if (section.type === 'cinematic_statement') { const instagramMatch = String(c.videoUrl || '').match(/^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/([\w-]+)/i); const instagramEmbed = instagramMatch ? `https://www.instagram.com/${String(c.videoUrl).match(/instagram\.com\/(reel|p|tv)\//i)?.[1]}/${instagramMatch[1]}/embed/` : ''; return <section className="relative isolate overflow-hidden bg-[#10150a] text-white">{instagramEmbed ? <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(180,191,65,.18),transparent_65%)]"/> : c.videoUrl ? <DeferredBackgroundVideo src={c.videoUrl} poster={c.posterUrl} autoPlay={c.autoplay !== false} muted={c.muted !== false} controls={!!c.controls} className="absolute inset-0 -z-20 h-full w-full object-cover"/> : null}<div className={`container-xl relative flex min-h-[520px] flex-col items-center justify-center py-12 ${align}`} style={style}><Eyebrow light>{c.eyebrow || 'THE HOUSE OF AFSANA'}</Eyebrow><h2 className="mt-5 max-w-5xl font-display text-4xl sm:text-7xl">{section.title}</h2>{c.body && <p className="mt-6 max-w-3xl text-sm leading-7 text-white/75">{c.body}</p>}{instagramEmbed && <iframe title="AFSANA Instagram Reel" src={instagramEmbed} className="mt-8 h-[620px] w-full max-w-[420px] rounded-xl border-0 bg-black" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen loading="lazy"/>}{btn}</div></section>; }
  if (section.type === 'split_story') {
    const editorialPage = ['discover','journal','house','gifting'].includes(section.pageKey);
    const houseProduct = editorialPage ? catalogProductAt(products, 1) : null;
    const storyImage = editorialPage ? catalogImage(houseProduct) : (c.aboutStoryImageUrl || c.imageUrl || '');
    return <section className="afsana-ref-story"><div className="container-xl grid items-center gap-12 lg:grid-cols-2">
      <div className="afsana-ref-story-copy">
        <Eyebrow>{c.eyebrow || (editorialPage ? 'THE AFSANA PHILOSOPHY' : 'OUR PHILOSOPHY')}</Eyebrow>
        <h2>{section.title || (section.pageKey === 'house' ? 'A little unexpected. A lot unforgettable.' : section.pageKey === 'gifting' ? 'A gift with a point of view.' : section.pageKey === 'journal' ? 'Every fragrance has a story.' : 'Find the feeling behind the fragrance.')}</h2>
        <p>{c.body || (section.pageKey === 'house' ? 'AFSANA is built around a simple belief: scent can turn an ordinary moment into a lasting memory. Explore compositions made for presence, character and personal expression.' : section.pageKey === 'gifting' ? 'A fragrance is a thoughtful way to mark a moment. Choose a real AFSANA composition that feels personal, considered and made to be remembered.' : section.pageKey === 'journal' ? 'From first impression to final trail, explore the ideas, notes and rituals that shape the AFSANA fragrance experience.' : 'Start with the mood you want to carry, then explore the AFSANA collection for a scent that feels like your own.')}</p>
        {btn}
        {houseProduct?.name && <Link to={catalogProductLink(houseProduct)} className="mt-5 inline-flex text-[9px] font-semibold uppercase tracking-[.2em] text-[#263e0e]">Discover {houseProduct.name} ↗</Link>}
      </div>
      <div className="afsana-ref-story-image">
        {storyImage ? (houseProduct ? <Link to={catalogProductLink(houseProduct)} aria-label={`Explore ${houseProduct.name}`}><img src={storyImage} srcSet={responsiveUnsplashSrcSet(storyImage, 66)} sizes="(max-width: 700px) 92vw, 44vw" alt={houseProduct.name || 'AFSANA perfume'} width="1200" height="1350" loading="lazy" decoding="async"/></Link> : <img src={storyImage} srcSet={responsiveUnsplashSrcSet(storyImage, 66)} sizes="(max-width: 700px) 92vw, 44vw" alt={section.title || 'AFSANA story'} width="1200" height="1350" loading="lazy" decoding="async"/>) : <div className="afsana-journal-image-fallback"><span>AFSANA</span><small>THE HOUSE OF SCENT</small></div>}
      </div>
    </div></section>;
  }
  if (section.type === 'video_banner') {
    const videoSource = /world of afsana/i.test(section.title || '') ? 'https://www.instagram.com/reel/DfMwPQwo4TV/' : c.videoUrl;
    const reelParts = (() => {
      try {
        const u = new URL(videoSource || '');
        const parts = u.pathname.split('/').filter(Boolean);
        return u.hostname.endsWith('instagram.com') && ['reel','p','tv'].includes(parts[0]) && parts[1] ? parts : [];
      } catch { return []; }
    })();
    const reelEmbed = reelParts.length ? `https://www.instagram.com/${reelParts[0]}/${reelParts[1]}/embed/` : '';
    if (reelEmbed) return (
      <section className="afsana-world-reel">
        <div className="afsana-world-reel-shell container-xl">
          <div className="afsana-world-reel-copy">
            <p className="afsana-world-reel-kicker">AFSANA / IN MOTION</p>
            <h2>{section.title || 'The World of Afsana.'}</h2>
            <p>{c.subtitle || 'A closer look at the fragrances, details and moments that make the AFSANA world.'}</p>
            <a href="https://www.instagram.com/reel/DfMwPQwo4TV/" target="_blank" rel="noreferrer" className="afsana-world-reel-link">Watch on Instagram <span>↗</span></a>
          </div>
          <div className="afsana-world-reel-frame">
            <iframe title="AFSANA Instagram Reel" src={reelEmbed} scrolling="no" className="afsana-world-reel-iframe" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen loading="lazy"/>
          </div>
        </div>
      </section>
    );
    return <section className="relative overflow-hidden bg-[#182308] text-white">
      <DeferredBackgroundVideo src={videoSource} poster={c.posterUrl} autoPlay={c.autoplay!==false} muted={c.muted!==false} controls={!!c.controls} className="absolute inset-0 h-full w-full object-cover"/>
      <div className="absolute inset-0 afsana-video-overlay"/>
      <div className="container-xl relative" style={style}><div className={`flex min-h-[520px] flex-col justify-center ${align}`}>
        <Eyebrow light>{c.eyebrow || 'A MOVING STORY'}</Eyebrow>
        <h2 className="mt-5 max-w-5xl font-display text-5xl sm:text-8xl leading-[.9]">{section.title || 'The world of Afsana.'}</h2>
        {c.subtitle && <p className="mt-6 max-w-2xl text-sm leading-7 text-white/70">{c.subtitle}</p>}
        {btn}
      </div></div>
    </section>;
  }
  if (section.type === 'hero' && ['reference','inner'].includes(c.layout)) return <ReferenceHero section={section} config={c} products={products}/>;
  if (['hero','image_banner','split_story','lookbook'].includes(section.type)) {
    const editorialPage = ['discover','journal','house','gifting'].includes(section.pageKey);
    const pageProduct = editorialPage ? catalogProductForEditorialPage(products, section.pageKey) : null;
    const pageProductImage = catalogImage(pageProduct);
    if (editorialPage) return <section className="afsana-ref-inner-hero afsana-ref-inner-hero-catalog">
      <div className="afsana-ref-inner-overlay"/>
      <div className="container-xl afsana-ref-inner-catalog-grid relative z-10">
        <div className="afsana-ref-inner-catalog-copy">
          <p className="afsana-ref-eyebrow">{c.eyebrow || 'THE ART OF SCENT'}</p>
          <h1>{section.title || 'A world in every note.'}</h1>
          {c.subtitle && <p>{c.subtitle}</p>}
          {c.body && <p>{c.body}</p>}
          {btn}
        </div>
        <div className="afsana-ref-inner-catalog-product">
          {pageProductImage ? <Link to={catalogProductLink(pageProduct)} aria-label={`Explore ${pageProduct.name}`}><img src={pageProductImage} srcSet={responsiveUnsplashSrcSet(pageProductImage, 68)} sizes="(max-width: 700px) 90vw, 42vw" alt={pageProduct.name || 'AFSANA perfume'} width="900" height="1200" loading="eager" decoding="async" fetchPriority="high"/></Link> : <div className="afsana-ref-inner-product-pending"><b>AFSANA</b><span>THE ART OF SCENT</span></div>}
          {pageProduct?.name && <p>{pageProduct.name}</p>}
        </div>
      </div>
    </section>;
    return <section className={section.type==='hero' ? 'relative overflow-hidden bg-[#182308] text-white' : 'relative overflow-hidden bg-[#faf8f4]'}>
      <div className="absolute inset-0">{c.imageUrl && <picture><source media="(max-width: 700px)" srcSet={responsiveUnsplashSrcSet(c.mobileImageUrl || c.imageUrl, 68) || (c.mobileImageUrl || c.imageUrl)} sizes="100vw"/><img src={c.imageUrl} srcSet={responsiveUnsplashSrcSet(c.imageUrl, 68)} sizes="100vw" alt="" width="1600" height="900" loading={section.type === 'hero' ? 'eager' : 'lazy'} fetchPriority={section.type === 'hero' ? 'high' : 'auto'} decoding="async" className="h-full w-full object-cover"/></picture>}<div className={`absolute inset-0 ${section.type==='hero' ? 'bg-[linear-gradient(90deg,rgba(24,35,8,.98),rgba(38,62,14,.72),rgba(24,35,8,.25))]' : 'bg-black/25'}`}/></div>
      <div className="container-xl relative" style={style}><div className={`flex min-h-[520px] flex-col justify-center ${align}`}><Eyebrow light={section.type==='hero'}>{c.eyebrow || 'THE ART OF SCENT'}</Eyebrow><h2 className="mt-5 max-w-5xl font-display text-5xl sm:text-8xl leading-[.9]">{section.title || 'SCENTS WITH A STORY.'}</h2>{c.subtitle && <p className="mt-6 max-w-2xl text-sm leading-7 opacity-75">{c.subtitle}</p>}{c.body && <p className="mt-3 max-w-2xl text-sm leading-7 opacity-70">{c.body}</p>}{btn}</div></div>
    </section>;
  }
  return null;
}
function FilmCard({ film, index, autoplay = true }) {
  const [muted, setMuted] = useState(true);
  const [nearViewport, setNearViewport] = useState(false);
  const [visible, setVisible] = useState(false);
  const videoRef = useRef(null);
  const source = String(film.image || '').trim();
  const poster = String(film.link || '').trim();
  const labels = ['CAMPAIGN FILM 01','THE INGREDIENT EDIT','INSIDE THE HOUSE','THE EMOTION SERIES'];
  const accents = [
    'from-purple-500/55 via-fuchsia-400/10 to-transparent',
    'from-sky-400/55 via-blue-400/10 to-transparent',
    'from-pink-400/55 via-rose-400/10 to-transparent',
    'from-amber-300/55 via-yellow-300/10 to-transparent'
  ];
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setNearViewport(true);
      setVisible(entry.isIntersecting);
    }, { rootMargin: '240px 0px' });
    observer.observe(video);
    return () => observer.disconnect();
  }, [source]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source || !nearViewport) return;
    video.muted = muted;
    if (autoplay && visible) video.play().catch(() => {});
    else video.pause();
  }, [source, muted, autoplay, nearViewport, visible]);
  return <article className="group relative isolate min-h-[390px] aspect-[.78] overflow-hidden rounded-[22px] border border-purple-100 bg-[#201632] shadow-[0_18px_48px_rgba(42,27,70,.13)] transition duration-700 hover:-translate-y-2 hover:border-pink-200 hover:shadow-[0_28px_64px_rgba(96,52,148,.22)] sm:min-h-[440px] xl:min-h-[500px]">
    {source
      ? <video ref={videoRef} key={source} src={nearViewport ? source : undefined} poster={poster || undefined} autoPlay={false} muted={muted} loop playsInline preload="none" controls={false} onError={(e)=>{e.currentTarget.dataset.videoError='true';}} className="absolute inset-0 h-full w-full object-cover saturate-[1.08] contrast-[1.04] transition duration-[1200ms] group-hover:scale-110 group-hover:saturate-[1.2]"/>
      : poster ? <img src={poster} alt={film.title || 'AFSANA fragrance'} width="1000" height="1300" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain bg-[#173d26] p-7"/> : <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#173d26] via-[#214d32] to-[#102b1a] px-5 text-center text-[9px] font-bold uppercase tracking-[.22em] text-[#ffbd37]">AFSANA / THE ART OF SCENT</div>}
    <div aria-hidden="true" className={'pointer-events-none absolute inset-0 bg-gradient-to-br '+(accents[index] || accents[0])}/>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#160d2d]/95 via-[#211638]/16 to-[#1d1230]/10"/>
    <div aria-hidden="true" className="pointer-events-none absolute inset-[10px] rounded-[15px] border border-white/25 transition duration-700 group-hover:inset-[15px] group-hover:border-white/45"/>
    {source && <button type="button" className="absolute right-5 top-5 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/45 bg-white/20 text-white shadow-lg backdrop-blur-xl transition hover:scale-110 hover:border-[#ffe66d] hover:bg-[#ffe66d] hover:text-[#241638] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300" aria-label={muted ? 'Unmute video' : 'Mute video'} title={muted ? 'Unmute video' : 'Mute video'} onClick={() => setMuted((value) => !value)}>{muted ? <VolumeX className="h-4 w-4"/> : <Volume2 className="h-4 w-4"/>}</button>}
    <span aria-hidden="true" className="absolute left-1/2 top-1/2 z-10 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/20 pl-1 text-lg text-white shadow-[0_0_0_8px_rgba(255,255,255,.08),0_12px_30px_rgba(0,0,0,.2)] backdrop-blur-xl transition duration-500 group-hover:scale-110 group-hover:border-[#ffe66d] group-hover:bg-[#ffe66d] group-hover:text-[#241638] sm:h-16 sm:w-16">▶</span>
    <div className="absolute bottom-0 left-0 right-0 z-10 p-5 sm:p-6">
      <small className="mb-3 flex items-center gap-2 text-[7px] font-bold uppercase tracking-[.2em] text-[#ffe66d] sm:text-[8px]"><span className="h-px w-5 bg-[#ffe66d]"/>{labels[index] || 'AFSANA FILM'}</small>
      <h3 className="font-display text-2xl font-medium leading-tight text-white drop-shadow-lg sm:text-3xl">{film.title}</h3>
      <div className="mt-4 h-px w-full bg-gradient-to-r from-white/60 via-white/20 to-transparent"/>
      <p className="mt-3 text-[8px] font-semibold uppercase tracking-[.2em] text-white/65">A moving story from the house <span className="float-right text-[#ffe66d]">0{index+1}</span></p>
    </div>
  </article>;
}
function AfsanaEditorialProductShelf({ pageKey, products }) {
  const picks = catalogProductsWithImages(products).slice(0,4);
  const copy = {
    discover: ['THE AFSANA COLLECTION', 'Find your next signature.', 'Explore the live AFSANA fragrances and discover the bottle that fits your mood.'],
    journal: ['SCENT / IN OBJECTS', 'Stories you can wear.', 'Meet the AFSANA fragrances behind the notes, rituals and stories in our journal.'],
    house: ['THE HOUSE COLLECTION', 'Meet the fragrances of AFSANA.', 'Every bottle is part of the AFSANA story. Explore the current collection.'],
    gifting: ['THE GIFT EDIT', 'Give a scent worth remembering.', 'Choose a fragrance from the live AFSANA collection for a thoughtful, personal gift.']
  }[pageKey] || ['THE AFSANA COLLECTION', 'Discover AFSANA.', 'Explore the live fragrance collection.'];
  return <section className="afsana-editorial-product-shelf">
    <div className="container-xl">
      <div className="afsana-editorial-product-shelf-head">
        <div><p>{copy[0]}</p><h2>{copy[1]}</h2><span>{copy[2]}</span></div>
        <Link to="/shop">View all fragrances ↗</Link>
      </div>
      {picks.length ? <div className="afsana-editorial-product-shelf-grid">{picks.map((product)=><ProductCard key={product.id || product.slug} product={product}/>)}</div> : <div className="afsana-editorial-product-empty">AFSANA product photographs are being prepared. Please add a primary image to each published product in the catalogue.</div>}
    </div>
  </section>;
}

function CmsSectionList({ sections, faq, inheritedAssets = {}, pageKey = 'home' }) {
  const source = Array.isArray(sections) ? sections : [];
  const safe = source.filter((s) => s?.isEnabled !== false && s?.type !== 'footer_showcase');
  const editorialPage = ['discover','journal','house','gifting'].includes(pageKey);
  const needsProducts = editorialPage || safe.some((section) =>
    ['featured_collection', 'best_sellers', 'new_arrivals', 'under_2000', 'gift_boxes', 'product_3d_showcase'].includes(section?.type) ||
    (section?.type === 'hero' && ['reference', 'inner'].includes(section?.config?.layout))
  );
  const { data } = useApi(
    () => needsProducts ? productsApi.list({ sort: 'popular', limit: editorialPage ? 36 : 12 }) : Promise.resolve({ products: [] }),
    [needsProducts, editorialPage]
  );
  const selectedEditorialProduct = editorialProductByPage[pageKey];
  const { data: selectedEditorialData } = useApi(
    () => selectedEditorialProduct
      ? productsApi.list({ q: selectedEditorialProduct.name, limit: 8 })
      : Promise.resolve({ products: [] }),
    [selectedEditorialProduct?.name]
  );
  const shopSettings = useShopSettings();
  const products = [...(data?.products || []), ...(selectedEditorialData?.products || [])];
  const hasCatalogSection = safe.some((section) =>
    ['featured_collection','best_sellers','new_arrivals','under_2000','gift_boxes'].includes(section?.type)
  );
  const showEditorialShelf = editorialPage && !hasCatalogSection;
  const referenceAssets = {
    ...inheritedAssets,
    ...(safe.find((s) => s?.type === 'reference_assets')?.config || {}),
    publicWhatsapp: '923252032321'
  };
  return <div className="bg-[#f7f4ed] text-[#100d24]">
    {safe.map((s) =>
      <div key={s.id} className="afsana-cms-section afsana-cms-theme-neon">
        <CmsSection section={{...s,pageKey}} products={products} faq={faq} referenceAssets={referenceAssets} shopSettings={shopSettings}/>
      </div>
    )}
    {showEditorialShelf && <AfsanaEditorialProductShelf pageKey={pageKey} products={products}/>}
  </div>;
}

function CmsDrivenHome({ sections, faq, referenceAssets = {} }) {
  return <CmsSectionList sections={sections} faq={faq} inheritedAssets={referenceAssets}/>;
}

function readCmsPreview() {
  try {
    const query = new URLSearchParams(window.location.search);
    if (query.get('afsanaPreview') !== '1') return null;
    const current = JSON.parse(localStorage.getItem('afsana_cms_preview_v3') || 'null');
    if (current && Array.isArray(current.sections)) return current;
    const legacy = JSON.parse(localStorage.getItem('afsana_cms_preview_v1') || 'null');
    return legacy && Array.isArray(legacy.sections) ? { pageKey: 'home', sections: legacy.sections } : null;
  } catch { return null; }
}

export function ManagedCmsPage({ pageKey, fallback = null }) {
  const { data } = useApi(() => cmsPublicApi.content(), [pageKey]);
  const preview = readCmsPreview();
  const queryPage = new URLSearchParams(window.location.search).get('afsanaPageKey');
  const previewSections = Array.isArray(preview?.layouts?.[pageKey]) ? preview.layouts[pageKey] : preview && (queryPage || preview.pageKey || 'home') === pageKey ? preview.sections : null;
  const sections = previewSections || data?.pageSections?.[pageKey] || (pageKey === 'home' ? data?.homepageSections : []) || [];
  const isPreviewPage = !!preview && (Array.isArray(preview.layouts?.[pageKey]) || (queryPage || preview.pageKey || 'home') === pageKey);
  const hasManagedLayout = (data?.managedPageKeys || []).includes(pageKey);
  if (!sections.length && !isPreviewPage && !hasManagedLayout) return fallback;
  const previewAssets = preview?.layouts?.home?.find((item) => item.type === 'reference_assets')?.config || {};
  const referenceAssets = Object.keys(previewAssets).length ? previewAssets : (data?.homepageSections || []).find((item) => item.type === 'reference_assets')?.config || {};
  return <CmsSectionList sections={sections} faq={data?.faqs || []} inheritedAssets={referenceAssets} pageKey={pageKey} />;
}

export function ScentFinderPage(){
  const {data,loading}=useApi(()=>productsApi.list({sort:'popular',limit:36}),[]);
  const {data:featuredData,loading:featuredLoading}=useApi(()=>productsApi.list({q:'Mood Swing',limit:8}),[]);
  const products=data?.products||[];
  const visualProducts=catalogProductsWithImages(products).slice(0,3);
  const featuredMoodSwing=(featuredData?.products||[]).find((product)=>String(product?.name||'').toLowerCase().includes('mood swing')&&catalogImage(product))||null;
  const worlds=[
    ['THE AFTER DARK EDIT','Make a statement','Confident, vivid and unforgettable.'],
    ['THE DAYLIGHT EDIT','Feel luminous','Soft, airy and effortless.'],
    ['THE STATEMENT EDIT','Stay mysterious','Deep, warm and magnetic.']
  ];
  return <div className="bg-[#f7f4ed] text-[#173d26]">
    <section className="relative overflow-hidden bg-[#173d26] text-white">
      <div className="container-xl grid min-h-[400px] items-center gap-8 py-14 sm:py-20 lg:grid-cols-[1fr_.8fr]">
        <div className="self-start pt-3 sm:pt-5"><p className="text-[9px] font-bold uppercase tracking-[.3em] text-[#ffbd37]">AFSANA SCENT INTELLIGENCE / DISCOVER</p>
          <h1 className="mt-6 font-display text-6xl leading-[.9] sm:text-8xl">There is a<br/><em className="text-[#ffbd37]">scent for that.</em></h1>
          <p className="mt-6 max-w-xl text-sm leading-8 text-white/75">Not sure what you love yet? Tell us how you want to feel, where you are going and which notes pull you in. We will help you find a starting point.</p>
          <a href="#finderSection" className="mt-7 inline-flex bg-[#ffbd37] px-6 py-4 text-[9px] font-bold uppercase tracking-[.18em] text-[#173d26]">Begin your scent match ↗</a>
        </div>
        <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[28px] border border-white/15 bg-white/[.045] p-4 sm:min-h-[430px]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-8 rounded-full bg-[#e8b3c9]/20 blur-3xl"/>
          {featuredMoodSwing ? <Link to={catalogProductLink(featuredMoodSwing)} aria-label={`Explore ${featuredMoodSwing.name}`} className="relative z-10 flex h-[360px] w-full items-center justify-center sm:h-[430px]">
            <img src={catalogImage(featuredMoodSwing)} alt={featuredMoodSwing.name} width="900" height="1200" loading="eager" decoding="async" className="h-full max-h-[430px] w-full object-contain"/>
          </Link> : <div className="relative z-10 text-center"><b className="font-display text-4xl text-[#ffbd37]">AFSANA</b><p className="mt-3 text-[9px] tracking-[.2em] text-white/55">{featuredLoading?'LOADING MOOD SWING':'MOOD SWING IMAGE NOT SET IN THE LIVE CATALOGUE'}</p></div>}
          {featuredMoodSwing?.name && <p className="absolute bottom-4 z-20 text-[9px] font-bold uppercase tracking-[.22em] text-[#ffbd37]">{featuredMoodSwing.name}</p>}
        </div>
      </div>
    </section>
    <section className="bg-white py-16 sm:py-20">
      <div className="container-xl">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-6"><div><p className="text-[9px] font-bold uppercase tracking-[.28em] text-[#7357ff]">A MORE PERSONAL DISCOVERY</p><h2 className="mt-3 font-display text-5xl sm:text-6xl">Enter a scent <em>world.</em></h2></div><p className="max-w-sm text-xs leading-7 text-[#687363]">Fragrance is personal. Let your instinct lead and explore a scent world that matches your energy.</p></div>
        <div className="grid gap-4 md:grid-cols-3">{worlds.map(([kicker,title,body],i)=>{const product=visualProducts[i];return <Link key={title} to={catalogProductLink(product)} className="group relative min-h-[340px] overflow-hidden rounded-2xl bg-[#241638] text-white">
          {product && <img src={catalogImage(product)} alt={product.name} width="900" height="1100" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain p-7 transition duration-700 group-hover:scale-[1.04]"/>}
          <div className="absolute inset-0 bg-gradient-to-t from-[#100d24] via-[#100d24]/5 to-transparent"/>
          <div className="absolute bottom-6 left-6 right-6"><small className="text-[8px] font-bold uppercase tracking-[.2em] text-[#ffdf90]">{kicker}</small><h3 className="mt-2 font-display text-3xl">{title}</h3><p className="mt-2 text-xs text-white/75">{body}</p>{product?.name && <span className="mt-4 inline-block text-[8px] font-bold uppercase tracking-[.16em] text-[#ffbd37]">{product.name} ↗</span>}</div>
        </Link>})}</div>
      </div>
    </section>
    <Finder/>
    <AfsanaEditorialProductShelf pageKey="discover" products={products}/>
  </div>;
}

export default function AfsanaSignatureHome(){
  const { data, loading } = useApi(() => cmsPublicApi.content(), []);
  const preview = readCmsPreview();
  const previewSections = Array.isArray(preview?.layouts?.home) ? preview.layouts.home : preview && (new URLSearchParams(window.location.search).get('afsanaPageKey') || preview.pageKey || 'home') === 'home' ? preview.sections : null;
  if (loading && !data && !previewSections) {
    return <section className="afsana-cms-home-reserve" aria-busy="true" aria-label="Loading AFSANA homepage">
      <div className="container-xl">
        <p>THE ART OF SCENT</p>
        <div>AFSANA</div>
      </div>
    </section>;
  }
  const sections = previewSections || data?.pageSections?.home || data?.homepageSections || [];
  const homeSections = sections.some((item) => item?.type === 'testimonials')
    ? sections
    : (() => {
        const next = [...sections];
        const before = next.findIndex((item) => ['newsletter', 'footer_showcase'].includes(item?.type));
        next.splice(before < 0 ? next.length : before, 0, sampleTestimonialsSection);
        return next;
      })();
  return <CmsDrivenHome
    sections={homeSections}
    faq={data?.faqs || []}
    referenceAssets={(data?.homepageSections || []).find((item) => item.type === 'reference_assets')?.config || {}}
  />;
}

// Cloudflare deploy trigger: video-grid upload playback and per-card mute controls.
