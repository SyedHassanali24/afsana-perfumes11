import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MessageCircle, Sparkles, X } from 'lucide-react';
import useApi from '../hooks/useApi';
import { productsApi, cmsPublicApi } from '../services';
import ProductCard from './ProductCard';
import NewsletterSubscription from './components/NewsletterSubscription';
import { Container } from './ui';

const img={
 hero:'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=2200&q=85',
 signature:'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=85',
 woods:'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=1000&q=85',
 floral:'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=85',
 gifting:'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1000&q=85',
 story:'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1300&q=85'
};
const video='https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4';
const Eyebrow=({children,light=false})=><div className={'flex items-center gap-3 text-[9px] sm:text-[10px] uppercase tracking-[.38em] font-semibold '+(light?'text-[#b4bf41]':'text-[#263e0e]')}><span className="w-9 h-px bg-current opacity-70"/>{children}</div>;

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
      <div className="hero-card-image"><img src={img.signature} alt="Afsana fragrance"/></div>
      <div className="text-left mt-4"><Eyebrow light>THE SIGNATURE</Eyebrow><p className="mt-4 font-display text-2xl">Citrus, saffron & a magnetic trail.</p></div>
    </div>
   </div>
  </div></div>
  <div className="absolute bottom-7 left-1/2 -translate-x-1/2 text-center text-[8px] uppercase tracking-[.35em] text-white/45"><span>Scroll to discover</span><div className="mx-auto mt-3 h-12 w-px bg-gradient-to-b from-[#b4bf41] to-transparent"/></div>
 </section>;
}
function Philosophy(){return <section className="bg-[#faf8f4] py-20 sm:py-28"><div className="container-xl"><div className="intro-grid"><Eyebrow>The Philosophy</Eyebrow><div><p className="font-display text-4xl sm:text-6xl leading-tight">We create fragrances for people who <em className="text-[#263e0e]">leave a trace.</em></p><p className="mt-7 max-w-xl text-sm leading-7 text-[#5f654f]">Every Afsana composition is designed as a story: an opening chapter, a mysterious heart and a final impression that refuses to disappear.</p></div></div><div className="intro-line"/></div></section>;}
function Worlds(){const cards=[['01 — Signature','House Icons',img.signature,'/shop?category=signature'],['02 — Oud','Dark Woods',img.woods,'/shop?category=oud'],['03 — Floral','Soft Light',img.floral,'/shop?category=floral'],['04 — Gifting','Made to Give',img.gifting,'/gifting']];return <section className="bg-white py-20 sm:py-28"><div className="container-xl"><div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8 mb-12"><div><Eyebrow>Explore the house</Eyebrow><h2 className="mt-5 font-display text-5xl sm:text-7xl leading-[.9]">Find your<br/><em className="text-[#263e0e]">world.</em></h2></div><Link to="/shop" className="inline-flex w-fit items-center gap-2 border border-[#263e0e] px-6 py-3 text-[10px] uppercase tracking-[.2em] hover:bg-[#263e0e] hover:text-white transition">View all fragrances ↗</Link></div><div className="collection-grid cinematic-grid">{cards.map(([ey,t,src,to])=><Link key={t} to={to} className="group relative aspect-[.78] overflow-hidden bg-[#263e0e]"><img src={src} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-1000 group-hover:scale-110 group-hover:opacity-95"/><div className="absolute inset-0 bg-gradient-to-t from-[#182308] via-transparent to-transparent"/><div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-white"><p className="text-[8px] uppercase tracking-[.3em] text-[#b4bf41]">{ey}</p><h3 className="mt-2 font-display text-2xl sm:text-3xl">{t}</h3><span className="mt-4 inline-flex text-[9px] uppercase tracking-[.2em] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition">Discover ↗</span></div></Link>)}</div></div></section>;}
function BestSellers(){const {data,loading}=useApi(()=>productsApi.list({sort:'popular',limit:4}),[]);return <section className="bg-[#f3f1e9] py-20 sm:py-28"><div className="container-xl"><div className="flex items-end justify-between mb-12"><div><Eyebrow>The edit</Eyebrow><h2 className="mt-5 font-display text-5xl sm:text-7xl leading-[.9]">Most<br/><em className="text-[#263e0e]">wanted.</em></h2></div><Link to="/shop" className="hidden sm:flex text-[10px] uppercase tracking-[.2em]">Shop all</Link></div>{loading?<div className="grid grid-cols-2 md:grid-cols-4 gap-5">{[1,2,3,4].map(i=><div key={i} className="aspect-[4/5] bg-white animate-pulse"/>)}</div>:<div className="product-grid purchase-grid">{(data?.products||[]).map(p=><ProductCard key={p.id} product={p}/>)}</div>}</div></section>;}
function Finder(){const navigate=useNavigate();const qs=[['When do you want to wear it?',['Every day','Evening','Special occasions']],['What should it feel like?',['Fresh & luminous','Warm & sensual','Dark & mysterious']],['Choose your presence.',['Quiet confidence','Magnetic energy','Unforgettable trail']]];const [step,setStep]=useState(0),[answer,setAnswer]=useState('');return <section className="bg-[#263e0e] py-20 sm:py-28 text-white" id="finderSection"><div className="container-xl"><div className="finder-grid"><div><Eyebrow light>Afsana Scent Intelligence</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">Your scent<br/><em className="text-[#b4bf41]">has a personality.</em></h2><p className="mt-7 max-w-lg text-sm leading-7 text-white/60">Answer three intuitive questions and discover the fragrance that feels most like you.</p></div><div className="finder-box border border-[#b4bf41]/25 bg-white/[.035] p-6 sm:p-10"><div className="h-px bg-white/10"><span className="block h-full bg-[#b4bf41] transition-all" style={{width:`${((step+1)/qs.length)*100}%`}}/></div><div className="mt-7" id="finderQuestion"><p className="text-[9px] uppercase tracking-[.3em] text-[#b4bf41]">Question {step+1} / 3</p><h3 className="mt-4 font-display text-3xl sm:text-4xl">{qs[step][0]}</h3><div className="mt-7 grid gap-3">{qs[step][1].map(x=><button key={x} onClick={()=>setAnswer(x)} className={`text-left border px-5 py-4 text-sm transition ${answer===x?'border-[#b4bf41] bg-[#b4bf41]/10':'border-white/10 hover:border-white/30'}`}>{x}</button>)}</div><button disabled={!answer} onClick={()=>step<2?(setStep(step+1),setAnswer('')):navigate('/shop')} className="mt-7 w-full bg-[#b4bf41] px-6 py-4 text-xs font-semibold uppercase tracking-[.2em] text-[#263e0e] disabled:opacity-30">{step<2?'Continue':'Reveal my collection'} ↗</button></div></div></div></div></section>;}
function Story(){return <section className="bg-[#faf8f4] py-20 sm:py-32"><div className="container-xl"><div className="story-grid"><div className="story-image"><div className="absolute -inset-4 border border-[#748e40]/35 translate-x-4 translate-y-4"/><img src={img.story} alt="The House of Afsana" className="relative aspect-[.88] w-full object-cover"/></div><div><Eyebrow>The House of Afsana</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">A fragrance<br/>is a <em className="text-[#263e0e]">memory.</em></h2><p className="mt-7 text-sm leading-7 text-[#5f654f]">We believe the most powerful fragrances are not simply smelled — they are remembered.</p><p className="mt-4 text-sm leading-7 text-[#5f654f]">Our perfumers combine traditional craftsmanship with contemporary composition, creating scents that feel timeless yet distinctly personal.</p><div className="mt-9 font-display italic text-2xl text-[#263e0e]">Crafted for the unforgettable.</div></div></div></div></section>;}
function Film(){const cards=[['01 / Atmosphere','The First Impression',img.signature],['02 / Ingredient','Dark Woods',img.woods],['03 / Craft','Made by Hand',img.floral],['04 / Emotion','Leave a Trace',img.gifting]];return <section className="bg-[#182308] py-20 sm:py-28 text-white"><div className="container-xl"><div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-7 mb-12"><div><Eyebrow light>A moving story</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">Watch the<br/><em className="text-[#b4bf41]">world of Afsana.</em></h2></div><p className="max-w-md text-sm leading-7 text-white/55">Four glimpses into the atmosphere, ingredients, craftsmanship and emotion behind the house.</p></div><div className="video-wall cinematic-video-wall">{cards.map(([n,t,src])=><article key={t} className="video-card group cinematic-video-card"><video className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-1000 group-hover:scale-110 group-hover:opacity-95" autoPlay muted loop playsInline preload="metadata" poster={src} aria-label={t}><source src={video} type="video/mp4"/></video><div className="absolute inset-0 bg-gradient-to-t from-[#182308] via-[#182308]/10 to-transparent"/><div className="video-label"><span>{n}</span><h3>{t}</h3><p className="mt-2 max-w-[18rem] text-[10px] leading-5 text-white/55">A moving glimpse into the world, material and emotion of Afsana.</p></div></article>)}</div></div></section>;}
function Ritual(){const items=[['01','Prepare','Apply to clean, moisturised skin to give the fragrance a soft foundation.'],['02','Pulse','Focus on pulse points where warmth allows the fragrance to evolve naturally.'],['03','Layer','Combine complementary notes to create a scent that feels entirely yours.'],['04','Leave','The final note should arrive softly — and stay in someone’s memory.']];return <section className="bg-white py-20 sm:py-28"><div className="container-xl"><Eyebrow>The fragrance ritual</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl">Make it<br/><em className="text-[#263e0e]">yours.</em></h2><div className="ritual-grid">{items.map(([n,t,d])=><article key={n} className="bg-white p-7 sm:p-9"><span className="font-display text-4xl text-[#748e40]">{n}</span><h3 className="mt-7 font-display text-2xl">{t}</h3><p className="mt-3 text-sm leading-7 text-[#5f654f]">{d}</p></article>)}</div></div></section>;}
function PrivateCollection(){return <section className="private-banner"><img src={img.hero} alt="" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,35,8,.97),rgba(24,35,8,.62),rgba(24,35,8,.35))]"/><Container className="relative flex min-h-[650px] items-center"><div className="max-w-xl"><Eyebrow light>The Private Collection</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">Some stories<br/>deserve to be <em className="text-[#b4bf41]">private.</em></h2><p className="mt-7 text-sm leading-7 text-white/60">Discover our most concentrated compositions, created for evenings that deserve to be remembered.</p><Link to="/shop" className="mt-8 inline-flex bg-[#b4bf41] px-7 py-4 text-xs font-semibold uppercase tracking-[.18em] text-[#263e0e]">Explore Private Collection <ArrowRight className="ml-2 w-4"/></Link></div></Container></section>;}
function Trust(){const items=[['✦','Premium Oils','Carefully selected fragrance oils and sophisticated compositions.'],['◌','Long Lasting','Designed to evolve beautifully through the day rather than disappear quickly.'],['♢','Gift Ready','Every order is prepared with the experience of opening a luxury gift.'],['✓','Easy Exchange','A considered customer experience from discovery through delivery.']];return <section className="bg-[#f3f1e9] py-20 sm:py-28"><div className="container-xl"><Eyebrow>Why Afsana</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl">Designed for<br/><em className="text-[#263e0e]">trust.</em></h2><div className="trust-grid trust-grid-premium">{items.map(([i,t,d])=><article key={t} className="border border-[#263e0e]/10 bg-white p-7 hover:-translate-y-1 transition"><span className="text-2xl text-[#748e40]">{i}</span><h3 className="mt-6 font-display text-2xl">{t}</h3><p className="mt-3 text-sm leading-7 text-[#5f654f]">{d}</p></article>)}</div></div></section>;}
function Journal(){const posts=[['Guide / Fragrance','How to find your signature scent',img.floral],['Ingredient / Oud','The mysterious world of oud',img.woods],['Ritual / Lifestyle','The psychology of scent',img.gifting]];return <section className="bg-white py-20 sm:py-28"><Container><div className="flex items-end justify-between mb-12"><div><Eyebrow>From the journal</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">Stories worth<br/><em className="text-[#263e0e]">remembering.</em></h2></div><Link to="/journal" className="hidden sm:block text-[10px] uppercase tracking-[.2em]">Enter Journal</Link></div><div className="editorial-grid">{posts.map(([meta,title,src])=><article key={title} className="group"><div className="aspect-[1.05] overflow-hidden"><img src={src} alt="" className="w-full h-full object-cover transition duration-700 group-hover:scale-105"/></div><div className="pt-5"><p className="text-[8px] uppercase tracking-[.25em] text-[#263e0e]">{meta}</p><h3 className="mt-3 font-display text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-[#5f654f]">The art of choosing a fragrance that feels like an extension of yourself.</p></div></article>)}</div></Container></section>;}
function Testimonials(){const q=[['The first spray got my attention. The dry-down made me buy another bottle.','Sara M.'],['It doesn’t smell like everyone else. That is exactly why I love it.','Hamza R.'],['The packaging, presentation and scent all feel incredibly premium.','Areeba K.']];return <section className="bg-[#263e0e] py-20 sm:py-28 text-white"><div className="container-xl"><Eyebrow light>The Afsana circle</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl">Loved by<br/><em className="text-[#b4bf41]">the unforgettable.</em></h2><div className="testimonial-track testimonial-track-premium">{q.map(([quote,name])=><article key={name} className="border border-white/10 p-7 sm:p-9"><div className="text-[#b4bf41] tracking-[.3em]">★★★★★</div><blockquote className="mt-7 font-display text-2xl leading-tight">“{quote}”</blockquote><p className="mt-7 text-[9px] uppercase tracking-[.22em] text-white/40">— {name} / Verified Customer</p></article>)}</div></div></section>;}
function DefaultHome(){return <div className="bg-[#faf8f4] text-[#263e0e]"><Hero/><Philosophy/><Worlds/><BestSellers/><Finder/><Story/><Film/><Ritual/><PrivateCollection/><Trust/><Journal/><Testimonials/><CommunityPulse section={{type:'community_pulse',title:'A house people come back to.',config:{}}}/><PremiumFooterShowcase section={{type:'footer_showcase',title:'Leave the final impression.',config:{}}}/><section className="bg-[#263e0e] py-14 sm:py-20 text-white"><div className="container-xl"><div className="newsletter-grid"><div><Eyebrow light>The private list</Eyebrow><h2 className="mt-5 font-display text-4xl sm:text-6xl">Be the first<br/>to <em className="text-[#b4bf41]">know.</em></h2><p className="mt-4 max-w-xl text-sm text-white/55">Early access to new compositions, private drops, exclusive stories and fragrance events.</p></div><NewsletterSubscription/></div></div></section></div>;}


const cmsItems = (items) => Array.isArray(items) ? items : [];
function CmsTimer({ endAt }) {
  const [left, setLeft] = useState(Math.max(0, new Date(endAt || 0).getTime() - Date.now()));
  useEffect(() => { const id = window.setInterval(() => setLeft(Math.max(0, new Date(endAt || 0).getTime() - Date.now())), 1000); return () => window.clearInterval(id); }, [endAt]);
  if (!endAt || left <= 0) return null;
  const total = Math.floor(left / 1000), d = Math.floor(total / 86400), h = Math.floor((total % 86400) / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return <div className="cms-timer" aria-label="Offer countdown"><span>{String(d).padStart(2,'0')}d</span><b>:</b><span>{String(h).padStart(2,'0')}h</span><b>:</b><span>{String(m).padStart(2,'0')}m</span><b>:</b><span>{String(s).padStart(2,'0')}s</span></div>;
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
function MuseScene({ section }) {
  const c = section.config || {};
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
        {c.characterImageUrl ? <img src={c.characterImageUrl} alt="" className="absolute left-1/2 top-1/2 h-[600px] w-[360px] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_35px_90px_rgba(180,191,65,.25)] animate-[afsanaFloat_6s_ease-in-out_infinite]" /> : <div className="absolute left-1/2 top-1/2 h-[500px] w-[270px] -translate-x-1/2 -translate-y-1/2 rounded-[45%] bg-gradient-to-b from-white/20 via-[#a3c5e9]/12 to-[#7b003a]/10 blur-[1px] shadow-[0_30px_120px_rgba(0,0,0,.8)] animate-[afsanaFloat_6s_ease-in-out_infinite]"/>}
        <div className="absolute left-1/2 top-[38%] h-[150px] w-[150px] -translate-x-1/2 rounded-full border border-white/10 bg-white/[.025] backdrop-blur"/>
        <div className="absolute left-[36%] top-[34%] text-[9px] uppercase tracking-[.3em] text-[#b4bf41] animate-pulse">Presence</div>
        <div className="absolute right-[18%] top-[54%] text-[9px] uppercase tracking-[.3em] text-white/35">Memory</div>
      </div>
    </div>
  </section>;
}
function Product3DShowcase({ section, products=[] }) {
  const c=section.config||{};
  const chosen=products.find(p=>c.productSlug && (p.slug===c.productSlug || p.id===c.productSlug)) || products[0];
  const media=[...(chosen?.media||[])].filter(x=>x?.url).slice(0,8);
  const frames=media.length?media:[{url:c.imageUrl||img.signature}];
  const [frame,setFrame]=useState(0),[auto,setAuto]=useState(true);
  const drag=useRef({active:false,x:0});
  useEffect(()=>{if(!auto||frames.length<2)return;const id=window.setInterval(()=>setFrame(v=>(v+1)%frames.length),900);return()=>window.clearInterval(id)},[auto,frames.length]);
  const startTurn=(event)=>{if(frames.length<2)return;setAuto(false);drag.current={active:true,x:event.clientX};event.currentTarget.setPointerCapture?.(event.pointerId);};
  const moveTurn=(event)=>{if(!drag.current.active||frames.length<2)return;const delta=event.clientX-drag.current.x;const steps=Math.trunc(delta/22);if(!steps)return;drag.current.x+=steps*22;setFrame((current)=>(current-steps+frames.length)%frames.length);};
  const endTurn=()=>{drag.current.active=false;};
  return <section className="relative overflow-hidden bg-[#080a07] text-white py-20 sm:py-28">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,rgba(163,197,233,.18),transparent_22%),radial-gradient(circle_at_25%_70%,rgba(123,0,58,.20),transparent_28%)]"/>
    <div className="container-xl relative grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
      <div><Eyebrow light>{c.eyebrow||'THE AFSANA OBJECT'}</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">{section.title||chosen?.name||'The bottle in motion.'}</h2><p className="mt-6 max-w-xl text-sm leading-7 text-white/55">{c.body||'Explore the signature bottle through a cinematic multi-frame experience.'}</p>
      {c.buttonText&&<Link to={c.buttonLink||'/shop'} className="mt-8 inline-flex bg-[#ffe500] px-7 py-4 text-[10px] font-semibold uppercase tracking-[.2em] text-[#080a07]">{c.buttonText} ↗</Link>}</div>
      <div className="relative min-h-[500px] flex items-center justify-center">
        <div className="absolute h-[360px] w-[360px] rounded-full bg-[#a3c5e9]/10 blur-3xl"/>
        <div className="relative h-[440px] w-[330px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none" style={{perspective:'1200px',touchAction:'pan-y'}} onPointerDown={startTurn} onPointerMove={moveTurn} onPointerUp={endTurn} onPointerCancel={endTurn} onLostPointerCapture={endTurn} aria-label="Drag left or right to rotate through the product gallery">
          <div className="absolute inset-0 flex items-center justify-center" style={{transform:`rotateY(${frame* (360/Math.max(frames.length,1))}deg) rotateX(${Math.sin(frame)*3}deg)`,transformStyle:'preserve-3d',transition:'transform .7s cubic-bezier(.2,.8,.2,1)'}}>
            <img src={frames[frame]?.url} alt={chosen?.name||'AFSANA fragrance'} className="max-h-[420px] max-w-[300px] object-contain drop-shadow-[0_45px_50px_rgba(0,0,0,.65)]"/>
          </div>
        </div>
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
function InteractiveGallery({ section }) {
  const c=section.config||{}, items=cmsItems(c.items);
  return <section className="bg-[#faf8f4] py-20 sm:py-28">
    <div className="container-xl"><Eyebrow>{c.eyebrow || 'THE VISUAL JOURNEY'}</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl">{section.title || 'A scent in motion.'}</h2>
      <div className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5 [scrollbar-width:none]">{(items.length?items:[{title:'The Signature',image:img.signature},{title:'Dark Woods',image:img.woods},{title:'Soft Light',image:img.floral},{title:'Made to Give',image:img.gifting}]).map((x,i)=><Link to={x.link||'/shop'} key={i} className="group relative min-w-[78vw] sm:min-w-[48vw] lg:min-w-[31vw] aspect-[.82] snap-start overflow-hidden rounded-[2rem] bg-[#263e0e]">
        <img src={x.image||x.link} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-1000 group-hover:scale-110"/><div className="absolute inset-0 bg-gradient-to-t from-[#080a07] via-transparent to-transparent"/><div className="absolute bottom-0 p-7 text-white"><p className="text-[9px] uppercase tracking-[.3em] text-[#b4bf41]">0{i+1}</p><h3 className="mt-2 font-display text-3xl">{x.title}</h3><p className="mt-2 text-xs text-white/55">{x.description||x.text}</p></div>
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

function CmsSection({ section, products, faq }) {
  const c = section.config || {};
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
    const links = cmsItems(c.items);
    const socials = [['Instagram',c.instagramUrl],['Facebook',c.facebookUrl]].filter((x) => x[1]);
    return <footer className="relative overflow-hidden bg-[#100d24] text-white"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_20%,rgba(115,87,255,.24),transparent_28%),radial-gradient(circle_at_88%_75%,rgba(217,255,85,.08),transparent_25%)]"/><div className="container-xl relative py-16 sm:py-24"><div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1fr]"><div><p className="text-[9px] uppercase tracking-[.35em] text-[#d9ff55]">{c.tagline || 'THE ART OF SCENT'}</p><h2 className="mt-5 font-display text-6xl tracking-[-.04em]">{c.brandName || 'AFSANA'}</h2><p className="mt-6 max-w-sm text-sm leading-7 text-white/55">{c.description}</p>{socials.length > 0 && <div className="mt-6 flex gap-4">{socials.map(([label,url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="text-[9px] uppercase tracking-[.2em] text-[#d9ff55]">{label}</a>)}</div>}</div><div className="lg:col-span-2"><p className="text-[9px] uppercase tracking-[.3em] text-[#d9ff55]">EXPLORE THE HOUSE</p><div className="mt-6 grid grid-cols-2 gap-4">{links.map((item,i) => <div key={i}><p className="text-base font-display">{item.title}</p><p className="mt-1 text-xs text-white/45">{item.text}</p>{item.link && <Link className="mt-3 inline-flex text-[9px] uppercase tracking-[.2em] text-[#d9ff55]" to={item.link}>Discover ↗</Link>}</div>)}</div></div><div><p className="text-[9px] uppercase tracking-[.3em] text-[#d9ff55]">CONTACT</p>{c.email && <a href={'mailto:'+c.email} className="mt-6 block text-sm text-white/65">{c.email}</a>}{c.phone && <p className="mt-3 text-sm text-white/65">{c.phone}</p>}</div></div><div className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-6 text-[9px] uppercase tracking-[.22em] text-white/35 sm:flex-row sm:items-center sm:justify-between"><span>{c.footerNote || 'AFSANA — THE ART OF SCENT'}</span><span>Made to leave a memory.</span></div></div></footer>;
  }
  if (section.type === 'nav_menu') return null;
  if (section.type === 'whatsapp_float') {
    const phone = String(c.phone || '').replace(/[^0-9]/g, '');
    if (!phone) return null;
    const href = `https://wa.me/${phone}?text=${encodeURIComponent(c.message || 'Assalam-o-alaikum, I need help with AFSANA fragrances.')}`;
    return <a href={href} target="_blank" rel="noreferrer" aria-label="Chat with AFSANA on WhatsApp" className="fixed bottom-6 left-6 z-[84] inline-flex items-center gap-2 rounded-full bg-[#20c768] px-5 py-3 text-xs font-semibold text-white shadow-2xl hover:scale-105"><MessageCircle className="h-4 w-4"/>{c.label || 'WhatsApp us'}</a>;
  }
  if (section.type === 'ai_concierge') return <ConciergeFloat section={section}/>;
  if (section.type === 'spacer') return <div style={{ height: Number(c.height) || 80 }} />;
  if (section.type === 'offer_timer' || section.type === 'promo_timer') return <section className="bg-[#263e0e] text-white"><div className="container-xl" style={style}><div className={`flex flex-col ${align}`}><Eyebrow light>{c.label || 'LIMITED OFFER'}</Eyebrow><h2 className="mt-4 font-display text-4xl sm:text-6xl">{section.title || 'A moment worth discovering.'}</h2><p className="mt-4 max-w-xl text-sm leading-7 text-white/65">{c.offerText}</p><CmsTimer endAt={c.endAt}/>{btn}</div></div></section>;
  if (section.type === 'muse_scene') return <MuseScene section={section}/>;
    if (section.type === 'product_3d_showcase') return <Product3DShowcase section={section} products={products}/>;
    if (section.type === 'fragrance_dna') return <FragranceDNA section={section}/>;
    if (section.type === 'interactive_gallery') return <InteractiveGallery section={section}/>;
    if (section.type === 'community_pulse') return <CommunityPulse section={section}/>;
    if (section.type === 'footer_showcase') return <PremiumFooterShowcase section={section}/>;
    if (section.type === 'video_grid') return <section className="bg-[#182308] text-white"><div className="container-xl" style={style}>{heading}<div className="cms-grid" style={gridStyle}>{cmsItems(c.items).slice(0, Math.max(1, Number(c.limit)||cols)).map((x,i)=><article key={i} className="relative min-h-[280px] overflow-hidden bg-[#263e0e]">{x.image && <video className="absolute inset-0 h-full w-full object-cover" src={x.image} poster={x.link} autoPlay={c.autoplay!==false} muted={c.muted!==false} loop playsInline controls={!!c.controls}/>}<div className="absolute inset-0 bg-gradient-to-t from-[#182308] via-transparent to-transparent"/><div className="absolute inset-x-0 bottom-0 p-5"><p className="text-[9px] uppercase tracking-[.22em] text-[#b4bf41]">{String(i+1).padStart(2,'0')}</p><h3 className="mt-2 font-display text-2xl">{x.title}</h3><p className="mt-2 text-xs text-white/60">{x.text}</p></div></article>)}</div></div></section>;
  if (section.type === 'post_grid' || section.type === 'blog_grid') return <section className="bg-white"><div className="container-xl" style={style}>{heading}<div className="cms-grid" style={gridStyle}>{cmsItems(c.items).slice(0, Math.max(1, Number(c.limit)||cols)).map((x,i)=><Link to={x.link || '/journal'} key={i} className="group block"><div className="aspect-[1.05] overflow-hidden bg-[#f3f1e9]">{x.image && <img src={x.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}</div><p className="mt-4 text-[8px] uppercase tracking-[.25em] text-[#263e0e]">AFSANA JOURNAL</p><h3 className="mt-2 font-display text-2xl">{x.title}</h3><p className="mt-2 text-sm leading-6 text-[#5f654f]">{x.text}</p></Link>)}</div></div></section>;
  if (['featured_collection','best_sellers','new_arrivals','under_2000','gift_boxes'].includes(section.type)) return <section className="bg-[#f3f1e9]"><div className="container-xl" style={style}>{heading}<div className="cms-grid" style={gridStyle}>{(products||[]).slice(0, Number(c.limit)||4).map(p=><ProductCard key={p.id} product={p}/>)}</div>{btn}</div></section>;
  if (section.type === 'scent_finder') return <Finder/>;
  if (section.type === 'newsletter') return <section className="bg-[#263e0e] text-white"><div className="container-xl" style={style}><div className={`flex flex-col ${align}`}><Eyebrow light>{c.eyebrow || 'THE PRIVATE LIST'}</Eyebrow><h2 className="mt-5 font-display text-4xl sm:text-6xl">{section.title || 'Be the first to know.'}</h2><p className="mt-4 max-w-xl text-sm text-white/60">{c.body || 'Early access to new compositions, private drops and exclusive stories.'}</p><NewsletterSubscription/></div></div></section>;
  if (section.type === 'faq') return <section className="bg-[#faf8f4]"><div className="container-xl" style={style}>{heading}<div className="max-w-3xl space-y-3">{(faq||[]).map((x,i)=><details key={i} className="border-b border-[#263e0e]/10 py-4"><summary className="cursor-pointer font-display text-xl">{x.question}</summary><p className="mt-3 text-sm leading-7 text-[#5f654f]">{x.answer}</p></details>)}</div></div></section>;
  if (['benefits','trust_grid','values_grid','testimonials','category_tiles'].includes(section.type)) return <section className={section.type === 'testimonials' ? 'bg-[#263e0e] text-white' : 'bg-[#faf8f4]'}><div className="container-xl" style={style}>{heading}<div className="cms-grid" style={gridStyle}>{cmsItems(c.items).map((x,i)=><article key={i} className="rounded-2xl border border-[#263e0e]/10 bg-white p-6"><span className="text-2xl text-[#748e40]">✦</span><h3 className="mt-5 font-display text-2xl">{x.title}</h3><p className="mt-3 text-sm leading-7 text-[#5f654f]">{x.text}</p>{x.link && <Link to={x.link} className="mt-5 inline-block text-[9px] uppercase tracking-[.2em] text-[#263e0e]">Discover ↗</Link>}</article>)}</div></div></section>;
  if (section.type === 'marquee') return <section className="overflow-hidden bg-[#b4bf41] text-[#263e0e]"><div className="marquee-track flex gap-12 py-4 text-[10px] font-bold uppercase tracking-[.25em]">{cmsItems(c.items).concat(cmsItems(c.items)).map((x,i)=><span key={i}>{x.title || x.text || 'THE ART OF SCENT'} ✦</span>)}</div></section>;
  if (section.type === 'rich_text' || section.type === 'cinematic_statement') return <section className={section.type === 'cinematic_statement' ? 'bg-[#182308] text-white' : 'bg-[#faf8f4]'}><div className={`container-xl flex flex-col ${align}`} style={style}><Eyebrow light={section.type === 'cinematic_statement'}>{c.eyebrow || 'THE HOUSE OF AFSANA'}</Eyebrow><h2 className="mt-5 max-w-5xl font-display text-4xl sm:text-7xl">{section.title}</h2><p className="mt-6 max-w-3xl text-sm leading-7 opacity-70">{c.body}</p>{btn}</div></section>;
  if (section.type === 'video_banner') return <section className="relative overflow-hidden bg-[#182308] text-white"><video className="absolute inset-0 h-full w-full object-cover" src={c.videoUrl} poster={c.posterUrl || undefined} autoPlay={c.autoplay!==false} muted={c.muted!==false} loop playsInline controls={!!c.controls}/><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,35,8,.96),rgba(38,62,14,.62),rgba(24,35,8,.28))]"/><div className="container-xl relative" style={style}><div className={`flex min-h-[520px] flex-col justify-center ${align}`}><Eyebrow light>{c.eyebrow || 'A MOVING STORY'}</Eyebrow><h2 className="mt-5 max-w-5xl font-display text-5xl sm:text-8xl leading-[.9]">{section.title || 'The world of Afsana.'}</h2>{c.subtitle && <p className="mt-6 max-w-2xl text-sm leading-7 text-white/70">{c.subtitle}</p>}{btn}</div></div></section>;
  if (['hero','image_banner','split_story','lookbook'].includes(section.type)) return <section className={section.type==='hero' ? 'relative overflow-hidden bg-[#182308] text-white' : 'relative overflow-hidden bg-[#faf8f4]'}><div className="absolute inset-0">{c.imageUrl && <picture><source media="(max-width: 700px)" srcSet={c.mobileImageUrl || c.imageUrl}/><img src={c.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover"/></picture>}<div className={`absolute inset-0 ${section.type==='hero' ? 'bg-[linear-gradient(90deg,rgba(24,35,8,.98),rgba(38,62,14,.72),rgba(24,35,8,.25))]' : 'bg-black/25'}`}/></div><div className="container-xl relative" style={style}><div className={`flex min-h-[520px] flex-col justify-center ${align}`}><Eyebrow light={section.type==='hero'}>{c.eyebrow || 'THE ART OF SCENT'}</Eyebrow><h2 className="mt-5 max-w-5xl font-display text-5xl sm:text-8xl leading-[.9]">{section.title || 'SCENTS WITH A STORY.'}</h2>{c.subtitle && <p className="mt-6 max-w-2xl text-sm leading-7 opacity-75">{c.subtitle}</p>}{c.body && <p className="mt-3 max-w-2xl text-sm leading-7 opacity-70">{c.body}</p>}{btn}</div></div></section>;
  return null;
}
function CmsSectionList({ sections, faq }) {
  const { data } = useApi(() => productsApi.list({ sort: 'popular', limit: 12 }), []);
  const products = data?.products || [];
  const safe = (Array.isArray(sections) ? sections : []).filter((s) => s?.isEnabled !== false);
  const tail = []; // Render exactly what the owner enabled; deleted or hidden sections are never auto-inserted.
  return <div className="bg-[#faf8f4] text-[#263e0e]">{[...safe, ...tail].map((s) => <div key={s.id} className={s.config?.theme === 'neon' ? 'afsana-cms-section afsana-cms-theme-neon' : 'afsana-cms-section'}><CmsSection section={s} products={products} faq={faq}/></div>)}</div>;
}

function CmsDrivenHome({ sections, faq }) {
  return <CmsSectionList sections={sections} faq={faq}/>;
}

function readCmsPreview() {
  try {
    const query = new URLSearchParams(window.location.search);
    if (query.get('afsanaPreview') !== '1') return null;
    const current = JSON.parse(localStorage.getItem('afsana_cms_preview_v2') || 'null');
    if (current && Array.isArray(current.sections)) return current;
    const legacy = JSON.parse(localStorage.getItem('afsana_cms_preview_v1') || 'null');
    return legacy && Array.isArray(legacy.sections) ? { pageKey: 'home', sections: legacy.sections } : null;
  } catch { return null; }
}

export function ManagedCmsPage({ pageKey, fallback = null }) {
  const { data } = useApi(() => cmsPublicApi.content(), [pageKey]);
  const preview = readCmsPreview();
  const queryPage = new URLSearchParams(window.location.search).get('afsanaPageKey');
  const previewSections = preview && (queryPage || preview.pageKey || 'home') === pageKey ? preview.sections : null;
  const sections = previewSections || data?.pageSections?.[pageKey] || (pageKey === 'home' ? data?.homepageSections : []) || [];
  const isPreviewPage = preview && (queryPage || preview.pageKey || 'home') === pageKey;
  const hasManagedLayout = (data?.managedPageKeys || []).includes(pageKey);
  if (!sections.length && !isPreviewPage && !hasManagedLayout) return fallback;
  return <CmsSectionList sections={sections} faq={data?.faqs || []} />;
}

export default function AfsanaSignatureHome(){
  const { data } = useApi(() => cmsPublicApi.content(), []);
  const preview = readCmsPreview();
  const previewSections = preview && (new URLSearchParams(window.location.search).get('afsanaPageKey') || preview.pageKey || 'home') === 'home' ? preview.sections : null;
  const sections = previewSections || data?.pageSections?.home || data?.homepageSections || [];
  const previewHome = preview && (new URLSearchParams(window.location.search).get('afsanaPageKey') || preview.pageKey || 'home') === 'home';
  const hasManagedHome = (data?.managedPageKeys || []).includes('home');
  if (sections.length || previewHome || hasManagedHome) return <CmsDrivenHome sections={sections} faq={data?.faqs || []}/>;
  return <DefaultHome/>;
}
