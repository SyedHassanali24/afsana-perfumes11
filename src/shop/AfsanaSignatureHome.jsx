import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Heart, Sparkles } from 'lucide-react';
import useApi from '../hooks/useApi';
import { productsApi, publicTaxonomyApi } from '../services';
import ProductCard from './ProductCard';
import NewsletterSubscription from './components/NewsletterSubscription';
import { Container } from './ui';

const img = {
  hero: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=2200&q=88',
  signature: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=88',
  woods: 'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=1200&q=88',
  floral: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=88',
  gifting: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1200&q=88',
  story: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1400&q=88',
};

const video='https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4';

function Eyebrow({children, light=false}) {
  return <div className={`flex items-center gap-3 text-[9px] sm:text-[10px] uppercase tracking-[.38em] font-semibold ${light?'text-[#d9b477]':'text-[#743d78]'}`}><span className="w-9 h-px bg-current opacity-70"/>{children}</div>;
}
function Reveal({children,className=''}) { return <div className={`luxury-reveal ${className}`}>{children}</div>; }

function Marquee({items}) {
  const list=[...items,...items];
  return <div className="overflow-hidden border-y border-[#c8a15f]/20 bg-[#160c19] text-[#e5d1ad]">
    <div className="marquee-track flex min-w-max items-center gap-8 py-4">{list.map((x,i)=><span key={i} className="flex items-center gap-8 text-[9px] uppercase tracking-[.32em]"><b className="font-display text-lg">AFSANA</b><i className="not-italic text-[#c8a15f]">•</i>{x}</span>)}</div>
  </div>;
}

function Hero() {
  return <section className="relative isolate min-h-[760px] sm:min-h-[900px] overflow-hidden bg-[#120813] text-white">
    <video className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45" autoPlay muted loop playsInline poster={img.hero}><source src={video} type="video/mp4"/></video>
    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_40%,rgba(200,161,95,.28),transparent_24%),linear-gradient(90deg,rgba(18,8,19,.98),rgba(36,18,42,.83),rgba(18,8,19,.45))]"/>
    <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(18,8,19,.25),rgba(18,8,19,.2)_55%,#120813_100%)]"/>
    <Container className="relative flex min-h-[760px] sm:min-h-[900px] items-center py-28">
      <div className="grid w-full items-center lg:grid-cols-[1.08fr_.92fr] gap-12">
        <Reveal>
          <Eyebrow light>A new chapter in fragrance</Eyebrow>
          <h1 className="mt-7 max-w-4xl font-display text-[4.4rem] leading-[.82] sm:text-[7rem] lg:text-[8.2rem]">SCENTS<br/>WITH A<br/><em className="text-[#d9b477]">STORY.</em></h1>
          <p className="mt-8 max-w-xl text-sm sm:text-base leading-8 text-white/70">Fragrance is more than a scent. It is a memory, a presence, a quiet signature that remains long after you have left the room.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/shop" className="group inline-flex items-center gap-3 bg-[#d9b477] px-7 py-4 text-xs font-semibold uppercase tracking-[.16em] text-[#160c19] hover:bg-white transition">Explore Collection <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition"/></Link>
            <Link to="/shop" className="inline-flex items-center gap-3 border border-white/25 px-7 py-4 text-xs uppercase tracking-[.16em] text-white hover:border-[#d9b477] hover:text-[#d9b477] transition">Find Your Scent <Sparkles className="w-4 h-4"/></Link>
          </div>
        </Reveal>
        <Reveal className="hidden lg:block">
          <div className="relative mx-auto w-[350px] h-[510px]">
            <div className="absolute inset-8 rounded-full bg-[#c8a15f]/20 blur-3xl"/>
            <div className="absolute inset-0 rounded-[12rem] border border-[#d9b477]/35 bg-white/[.035] backdrop-blur-sm"/>
            <img src={img.signature} alt="Afsana fragrance" className="absolute inset-12 h-[380px] w-[250px] object-cover object-center mix-blend-normal drop-shadow-[0_35px_35px_rgba(0,0,0,.55)]"/>
            <div className="absolute bottom-0 inset-x-0 text-center"><Eyebrow light>01 — The Signature</Eyebrow><p className="mt-4 font-display text-2xl">A luminous memory</p></div>
          </div>
        </Reveal>
      </div>
    </Container>
    <div className="absolute bottom-7 left-1/2 -translate-x-1/2 text-center text-[8px] uppercase tracking-[.35em] text-white/45"><span>Scroll to discover</span><div className="mx-auto mt-3 h-12 w-px bg-gradient-to-b from-[#d9b477] to-transparent"/></div>
  </section>;
}

function Philosophy() {
  return <section className="bg-[#fbf8fc] py-20 sm:py-28"><Container>
    <div className="grid lg:grid-cols-[.7fr_1.3fr] gap-10"><Eyebrow>The Philosophy</Eyebrow><div><p className="font-display text-4xl sm:text-6xl leading-tight">We create fragrances for people who <em className="text-[#743d78]">leave a trace.</em></p><p className="mt-7 max-w-xl text-sm leading-7 text-[#76677b]">Every Afsana composition is designed as a story: an opening chapter, a mysterious heart and a final impression that refuses to disappear.</p></div></div>
    <div className="mt-14 h-px bg-[#24152b]/10"/>
  </Container></section>;
}

function Worlds() {
  const cards=[['01 — Signature','House Icons',img.signature,'/shop'],['02 — Oud','Dark Woods',img.woods,'/shop?query=oud'],['03 — Floral','Soft Light',img.floral,'/shop?query=floral'],['04 — Gifting','Made to Give',img.gifting,'/shop']];
  return <section className="bg-white py-20 sm:py-28"><Container>
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8 mb-12"><div><Eyebrow>Explore the house</Eyebrow><h2 className="mt-5 font-display text-5xl sm:text-7xl leading-[.9]">Find your<br/><em className="text-[#743d78]">world.</em></h2></div><Link to="/shop" className="inline-flex w-fit items-center gap-2 border border-[#24152b] px-6 py-3 text-[10px] uppercase tracking-[.2em] hover:bg-[#24152b] hover:text-white transition">View all fragrances <ArrowRight className="w-4"/></Link></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">{cards.map(([ey,t,imgUrl,to])=><Link key={t} to={to} className="group relative aspect-[.78] overflow-hidden bg-[#160c19]">
      <img src={imgUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-1000 group-hover:scale-110 group-hover:opacity-95"/>
      <div className="absolute inset-0 bg-gradient-to-t from-[#120813] via-transparent to-transparent"/>
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-white"><p className="text-[8px] uppercase tracking-[.3em] text-[#d9b477]">{ey}</p><h3 className="mt-2 font-display text-2xl sm:text-3xl">{t}</h3><span className="mt-4 inline-flex text-[9px] uppercase tracking-[.2em] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition">Discover ↗</span></div>
    </Link>)}</div>
  </Container></section>;
}

function BestSellers() {
  const {data,loading}=useApi(()=>productsApi.list({sort:'popular',limit:4}),[]);
  return <section className="bg-[#f7f3f7] py-20 sm:py-28"><Container>
    <div className="flex items-end justify-between mb-12"><div><Eyebrow>The edit</Eyebrow><h2 className="mt-5 font-display text-5xl sm:text-7xl leading-[.9]">Most<br/><em className="text-[#743d78]">wanted.</em></h2></div><Link to="/shop" className="hidden sm:flex text-[10px] uppercase tracking-[.2em] hover:text-[#743d78]">Shop all ↗</Link></div>
    {loading?<div className="grid grid-cols-2 md:grid-cols-4 gap-5">{[1,2,3,4].map(i=><div key={i} className="aspect-[4/5] bg-white animate-pulse"/>)}</div>:<div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">{(data?.products||[]).map(p=><ProductCard key={p.id} product={p}/>)}</div>}
  </Container></section>;
}

function Finder() {
  const questions=[['When do you want to wear it?',['Every day','Evening','Special occasions']],['What should it feel like?',['Fresh & luminous','Warm & sensual','Dark & mysterious']],['Choose your presence.',['Quiet confidence','Magnetic energy','Unforgettable trail']]];
  const [step,setStep]=useState(0); const [answer,setAnswer]=useState('');
  return <section className="bg-[#160c19] py-20 sm:py-28 text-white" id="finderSection"><Container><div className="grid lg:grid-cols-2 gap-12 items-center">
    <div><Eyebrow light>Afsana Scent Intelligence</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">Your scent<br/><em className="text-[#d9b477]">has a personality.</em></h2><p className="mt-7 max-w-lg text-sm leading-7 text-white/60">Answer three intuitive questions and discover the fragrance direction that feels most like you.</p></div>
    <div className="border border-[#d9b477]/25 bg-white/[.035] p-6 sm:p-10"><div className="h-px bg-white/10"><span className="block h-full bg-[#d9b477] transition-all" style={{width:`${((step+1)/questions.length)*100}%`}}/></div><p className="mt-7 text-[9px] uppercase tracking-[.3em] text-[#d9b477]">Question {step+1} / {questions.length}</p><h3 className="mt-4 font-display text-3xl sm:text-4xl">{questions[step][0]}</h3><div className="mt-7 grid gap-3">{questions[step][1].map(x=><button key={x} onClick={()=>setAnswer(x)} className={`text-left border px-5 py-4 text-sm transition ${answer===x?'border-[#d9b477] bg-[#d9b477]/10':'border-white/10 hover:border-white/30'}`}>{x}</button>)}</div><button disabled={!answer} onClick={()=>{if(step<questions.length-1){setStep(step+1);setAnswer('')}else window.location.href='/shop'}} className="mt-7 w-full bg-[#d9b477] px-6 py-4 text-xs font-semibold uppercase tracking-[.2em] text-[#160c19] disabled:opacity-30">{step<questions.length-1?'Continue':'Reveal my collection'} ↗</button></div>
  </div></Container></section>;
}

function Story() {
  return <section className="bg-[#fbf8fc] py-20 sm:py-32"><Container><div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"><div className="relative"><div className="absolute -inset-4 border border-[#c8a15f]/35 translate-x-4 translate-y-4"/><img src={img.story} alt="The House of Afsana" className="relative aspect-[.88] w-full object-cover"/></div><div><Eyebrow>The House of Afsana</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">A fragrance<br/>is a <em className="text-[#743d78]">memory.</em></h2><p className="mt-7 text-sm leading-7 text-[#76677b]">We believe the most powerful fragrances are not simply smelled — they are remembered.</p><p className="mt-4 text-sm leading-7 text-[#76677b]">Our perfumers combine traditional craftsmanship with contemporary composition, creating scents that feel timeless yet distinctly personal.</p><div className="mt-9 font-display italic text-2xl text-[#743d78]">Crafted for the unforgettable.</div></div></div></Container></section>;
}

function Film() {
  const cards=[['01 / Atmosphere','The First Impression',img.signature],['02 / Ingredient','Dark Woods',img.woods],['03 / Craft','Made by Hand',img.floral],['04 / Emotion','Leave a Trace',img.gifting]];
  return <section className="bg-[#120813] py-20 sm:py-28 text-white"><Container><div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-7 mb-12"><div><Eyebrow light>A moving story</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">Watch the<br/><em className="text-[#d9b477]">world of Afsana.</em></h2></div><p className="max-w-md text-sm leading-7 text-white/55">Four glimpses into atmosphere, ingredients, craftsmanship and emotion behind the house.</p></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">{cards.map(([n,t,src])=><div key={t} className="group relative aspect-[.75] overflow-hidden"><img src={src} alt="" className="absolute inset-0 w-full h-full object-cover opacity-65 transition duration-1000 group-hover:scale-110 group-hover:opacity-90"/><div className="absolute inset-0 bg-gradient-to-t from-[#120813] to-transparent"/><div className="absolute bottom-0 p-5"><p className="text-[8px] uppercase tracking-[.25em] text-[#d9b477]">{n}</p><h3 className="mt-2 font-display text-2xl">{t}</h3></div></div>)}</div></Container></section>;
}

function Ritual() {
  const items=[['01','Prepare','Apply to clean, moisturised skin to give the fragrance a soft foundation.'],['02','Pulse','Focus on pulse points where warmth allows the fragrance to evolve naturally.'],['03','Layer','Combine complementary notes to create a scent that feels entirely yours.'],['04','Leave','The final note should arrive softly — and stay in someone’s memory.']];
  return <section className="bg-white py-20 sm:py-28"><Container><Eyebrow>The fragrance ritual</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl">Make it<br/><em className="text-[#743d78]">yours.</em></h2><div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#24152b]/10">{items.map(([n,t,d])=><article key={n} className="bg-white p-7 sm:p-9"><span className="font-display text-4xl text-[#c8a15f]">{n}</span><h3 className="mt-7 font-display text-2xl">{t}</h3><p className="mt-3 text-sm leading-7 text-[#76677b]">{d}</p></article>)}</div></Container></section>;
}

function PrivateCollection() {
  return <section className="relative min-h-[650px] overflow-hidden text-white"><img src={img.hero} alt="" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,8,19,.97),rgba(18,8,19,.62),rgba(18,8,19,.35))]"/><Container className="relative flex min-h-[650px] items-center"><div className="max-w-xl"><Eyebrow light>The Private Collection</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">Some stories<br/>deserve to be <em className="text-[#d9b477]">private.</em></h2><p className="mt-7 text-sm leading-7 text-white/60">Discover our most concentrated compositions, created for evenings that deserve to be remembered.</p><Link to="/shop" className="mt-8 inline-flex bg-[#d9b477] px-7 py-4 text-xs font-semibold uppercase tracking-[.18em] text-[#160c19]">Explore Private Collection <ArrowRight className="ml-2 w-4"/></Link></div></Container></section>;
}

function Trust() {
  const items=[['✦','Premium Oils','Carefully selected fragrance oils and sophisticated compositions.'],['◌','Long Lasting','Designed to evolve beautifully through the day.'],['♢','Gift Ready','Every order is prepared with the experience of opening a luxury gift.'],['✓','Easy Exchange','A considered customer experience from discovery through delivery.']];
  return <section className="bg-[#f7f3f7] py-20 sm:py-28"><Container><Eyebrow>Why Afsana</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl">Designed for<br/><em className="text-[#743d78]">trust.</em></h2><div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{items.map(([i,t,d])=><article key={t} className="border border-[#24152b]/10 bg-white p-7 hover:-translate-y-1 transition"><span className="text-2xl text-[#c8a15f]">{i}</span><h3 className="mt-6 font-display text-2xl">{t}</h3><p className="mt-3 text-sm leading-7 text-[#76677b]">{d}</p></article>)}</div></Container></section>;
}

function Journal() {
  const posts=[['Guide / Fragrance','How to find your signature scent',img.floral],['Ingredient / Oud','The mysterious world of oud',img.woods],['Ritual / Lifestyle','The psychology of scent',img.gifting]];
  return <section className="bg-white py-20 sm:py-28"><Container><div className="flex items-end justify-between mb-12"><div><Eyebrow>From the journal</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl leading-[.9]">Stories worth<br/><em className="text-[#743d78]">remembering.</em></h2></div><Link to="/shop" className="hidden sm:block text-[10px] uppercase tracking-[.2em]">Enter Journal ↗</Link></div><div className="grid md:grid-cols-3 gap-5">{posts.map(([meta,title,src])=><article key={title} className="group"><div className="aspect-[1.05] overflow-hidden"><img src={src} alt="" className="w-full h-full object-cover transition duration-700 group-hover:scale-105"/></div><div className="pt-5"><p className="text-[8px] uppercase tracking-[.25em] text-[#743d78]">{meta}</p><h3 className="mt-3 font-display text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-[#76677b]">The art of choosing, wearing and remembering a fragrance that feels personal.</p></div></article>)}</div></Container></section>;
}

function Testimonials() {
  const quotes=['The first spray got my attention. The dry-down made me buy another bottle.','It doesn’t smell like everyone else. That is exactly why I love it.','The packaging, presentation and scent all feel incredibly premium.'];
  return <section className="bg-[#160c19] py-20 sm:py-28 text-white"><Container><Eyebrow light>The Afsana circle</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-7xl">Loved by<br/><em className="text-[#d9b477]">the unforgettable.</em></h2><div className="mt-12 grid md:grid-cols-3 gap-4">{quotes.map((q,i)=><article key={q} className="border border-white/10 p-7 sm:p-9"><div className="text-[#d9b477] tracking-[.3em]">★★★★★</div><blockquote className="mt-7 font-display text-2xl leading-tight">“{q}”</blockquote><p className="mt-7 text-[9px] uppercase tracking-[.22em] text-white/40">— Verified Customer {i+1}</p></article>)}</div></Container></section>;
}

function FAQ() {
  const qs=['How long does Afsana fragrance last?','Do you offer nationwide delivery?','Can I exchange a fragrance?','Is Afsana gift packaging available?'];
  const [open,setOpen]=useState(0);
  return <section className="bg-[#fbf8fc] py-20"><Container className="max-w-4xl"><Eyebrow>Frequently asked</Eyebrow><h2 className="mt-6 font-display text-5xl sm:text-6xl">Before you<br/><em className="text-[#743d78]">choose.</em></h2><div className="mt-10 divide-y divide-[#24152b]/10 border-y border-[#24152b]/10">{qs.map((q,i)=><div key={q}><button onClick={()=>setOpen(open===i?-1:i)} className="flex w-full items-center justify-between py-6 text-left font-display text-xl">{q}<ChevronDown className={`w-5 transition ${open===i?'rotate-180':''}`}/></button>{open===i&&<p className="pb-6 text-sm leading-7 text-[#76677b]">We design every detail around a considered luxury experience. Exact delivery, exchange and product information is always shown at checkout and on the relevant product page.</p>}</div>)}</div></Container></section>;
}

export default function AfsanaSignatureHome() {
  const [showNews,setShowNews]=useState(false);
  useMemo(()=>{ if (typeof document!=='undefined') document.title='AFSANA — The Art of Scent'; return null; },[]);
  return <div className="bg-[#fbf8fc] text-[#24152b]">
    <Hero/><Marquee items={['MEMORY IN A BOTTLE','DISCOVER YOUR SIGNATURE','CRAFTED FOR MEMORIES','THE AFSANA PRIVATE COLLECTION']}/>
    <Philosophy/><Worlds/><BestSellers/><Finder/><Story/><Film/><Ritual/><PrivateCollection/><Trust/><Journal/><Testimonials/><FAQ/>
    <section className="bg-[#24152b] py-14 sm:py-20 text-white"><Container><div className="grid lg:grid-cols-2 gap-10 items-center"><div><Eyebrow light>The private list</Eyebrow><h2 className="mt-5 font-display text-4xl sm:text-6xl">Be the first to <em className="text-[#d9b477]">know.</em></h2><p className="mt-4 max-w-xl text-sm text-white/55">Early access to new compositions, private drops, exclusive stories and fragrance events.</p></div><div><NewsletterSubscription/></div></div></Container></section>
    <div className="fixed bottom-6 right-6 z-30"><button onClick={()=>setShowNews(!showNews)} className="grid h-14 w-14 place-items-center rounded-full bg-[#d9b477] text-[#160c19] shadow-2xl hover:scale-105 transition" aria-label="Open Afsana concierge"><Sparkles className="w-5"/></button>{showNews&&<div className="absolute bottom-16 right-0 w-72 border border-[#d9b477]/30 bg-[#160c19] p-5 text-white shadow-2xl"><Eyebrow light>Afsana AI Concierge</Eyebrow><p className="mt-3 font-display text-2xl">Can we help?</p><p className="mt-2 text-xs leading-5 text-white/55">Tell us what kind of presence you want to create.</p><Link to="/shop" className="mt-4 block border border-white/10 p-3 text-xs hover:border-[#d9b477]">✦ Find my signature scent</Link><Link to="/shop" className="mt-2 block border border-white/10 p-3 text-xs hover:border-[#d9b477]">♢ Help me choose a gift</Link></div>}</div>
  </div>;
}
