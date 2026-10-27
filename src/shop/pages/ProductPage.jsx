import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import useApi from '../../hooks/useApi';
import { productsApi } from '../../services';
import { Container, StateBox, QtyStepper, Placeholder } from '../ui';
import ProductCard from '../ProductCard';
import ReviewsSection from '../ReviewsSection';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { money } from '../format';
import useTitle from '../useTitle';

const notes=(p)=>({top:p?.notes?.top||['Citrus','Saffron'],heart:p?.notes?.heart||['Rose','Jasmine','Spice'],base:p?.notes?.base||['Oud','Amber','Musk','Woods']});
export default function ProductPage(){
 const {slug}=useParams(); const {data,loading,error,reload}=useApi(()=>productsApi.bySlug(slug),[slug]); const {add}=useCart(); const {has,toggle}=useWishlist();
 const [vid,setVid]=useState(null),[qty,setQty]=useState(1),[img,setImg]=useState(0),[tab,setTab]=useState('story');
 const p=data?.product, variants=data?.variants||[];
 useTitle(p?.seo?.title||p?.name);
 useEffect(()=>{if(variants.length){setVid((variants.find(v=>v.available>0)||variants[0]).id);setQty(1);setImg(0)}},[data]);
 const media=useMemo(()=>[...(p?.media||[])].sort((a,b)=>(a.kind==='main'?-1:b.kind==='main'?1:(a.sortOrder||0)-(b.sortOrder||0))),[p]);
 const v=variants.find(x=>x.id===vid), price=v&&(v.salePrice>0&&v.salePrice<v.price?v.salePrice:v.price), soldOut=!v||v.available<=0, ns=notes(p);
 const addToCart=()=>{if(v&&!soldOut)add(v.id,qty)};
 const banners=[media[0]?.url||'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1200&q=85',media[1]?.url||media[0]?.url||'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=85',media[2]?.url||media[0]?.url||'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=1200&q=85',media[3]?.url||media[0]?.url||'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=85'];
 return <div className="container-xl product-detail-top pt-10 sm:pt-16 pb-24">
  <StateBox loading={loading} error={error?.status===404?{message:'This perfume could not be found.'}:error} onRetry={reload}>{p&&<>
   <div className="text-[9px] uppercase tracking-[.28em] text-[#5f654f]"><Link to="/" className="hover:text-[#263e0e]">Home</Link> <span>/</span> <Link to="/shop" className="hover:text-[#263e0e]">Collection</Link> <span>/</span> {p.name}</div>
   <div className="product-detail-grid mt-8">
    <div className="product-gallery">
      <div className="gallery-thumbs space-y-3">{(media.length?media:[{url:''}]).map((m,i)=><button key={i} onClick={()=>setImg(i)} className={'w-[72px] aspect-square overflow-hidden border '+(i===img?'border-[#748e40]':'border-[#263e0e]/10')}>{m.url?<img src={m.url} alt="" className="w-full h-full object-cover"/>:<Placeholder className="w-full h-full"/>}</button>)}</div>
      <div className="main-product-stage relative min-h-[560px] bg-[#f3f1e9] overflow-hidden flex items-center justify-center">
       <div className="absolute w-72 h-72 rounded-full bg-[#748e40]/20 blur-3xl"/>
       <div className="absolute bottom-10 w-[55%] h-8 rounded-full bg-black/15 blur-xl"/>
       <div className="product-3d relative w-[68%] h-[82%] transition-transform duration-700 hover:scale-[1.03] hover:-rotate-1"><div className="absolute inset-0 border border-[#748e40]/20 rounded-[40%] blur-sm"/>{media[img]?.url?<img src={media[img].url} alt={p.name} className="relative w-full h-full object-cover shadow-[0_35px_55px_rgba(36,21,43,.28)]"/>:<Placeholder className="w-full h-full"/>}</div>
      </div>
    </div>
    <div className="lg:pt-5">
      <div className="text-[9px] uppercase tracking-[.35em] text-[#263e0e]">{p.fragrance?.gender||'Signature'} {p.fragrance?.concentration&&' · '+p.fragrance.concentration}</div>
      <h1 className="mt-4 font-display text-5xl sm:text-7xl leading-[.88]">{p.name}</h1>
      <div className="mt-6 flex items-center gap-4"><span className="text-[#748e40] tracking-[.2em]">★★★★★</span><span className="text-[10px] text-[#5f654f]">4.9 / 5 · 186 reviews</span></div>
      <p className="mt-7 text-sm leading-8 text-[#5f654f]">{p.content?.shortDescription||'A fragrance composed to become part of your identity — luminous, sophisticated and designed to leave a trace.'}</p>
      <div className="mt-7 font-display text-4xl">{v?money(price):'Currently unavailable'}</div>
      <div className="mt-8 text-[10px] uppercase tracking-[.25em]">Choose your size</div>
      <div className="mt-3 flex flex-wrap gap-2">{variants.map(x=><button key={x.id} onClick={()=>{setVid(x.id);setQty(1)}} className={'px-5 py-3 border text-[10px] uppercase tracking-[.15em] '+(x.id===vid?'border-[#263e0e] bg-[#e7ead9] text-[#263e0e]':'border-[#263e0e]/15')}>{x.label||x.sizeMl+' ML'}</button>)}</div>
      <div className="mt-7 flex gap-3"><QtyStepper value={qty} onChange={setQty} max={v?.available||1}/><button disabled={soldOut} onClick={addToCart} className="flex-1 bg-[#263e0e] text-white px-7 py-4 text-[10px] uppercase tracking-[.2em] disabled:opacity-40">Add to bag <span className="ml-3">↗</span></button><button onClick={()=>toggle(p.id||p._id)} className="w-14 border border-[#263e0e]/15 grid place-items-center"><Heart fill={has(p.id||p._id)?'currentColor':'none'} className="w-4"/></button></div>
      <div className="mt-8 grid grid-cols-3 border-y border-[#263e0e]/10">{[['Premium','Fragrance Oils'],['Gift Ready','Luxury Packaging'],['Fast','Nationwide Delivery']].map(([a,b])=><div key={a} className="py-5"><strong className="block font-display text-lg">{a}</strong><small className="text-[9px] uppercase tracking-[.12em] text-[#5f654f]">{b}</small></div>)}</div>
    </div>
   </div>
   <section className="notes-section mt-24 py-20 bg-[#263e0e] text-white"><div className="grid lg:grid-cols-2 gap-14 items-center"><div><div className="text-[9px] uppercase tracking-[.35em] text-[#b4bf41]">The architecture of the scent</div><h2 className="mt-5 font-display text-5xl sm:text-7xl">Three chapters.<br/>One <em className="text-[#b4bf41]">memory.</em></h2><p className="mt-6 max-w-lg text-sm leading-8 text-white/55">Every Afsana fragrance is built like a story. The top notes create the first impression. The heart reveals personality. The base becomes the memory that remains.</p></div><div className="space-y-2 text-center">{[['TOP',ns.top],['HEART',ns.heart],['BASE',ns.base]].map(([t,l],i)=><div key={t} className={'mx-auto border border-[#b4bf41]/30 p-7 font-display text-xl '+(i===0?'w-[55%]':i===1?'w-[75%]':'w-full')}><span className="text-[9px] uppercase tracking-[.3em] text-[#b4bf41]">{t}</span><div className="mt-2">{l.join(' · ')}</div></div>)}</div></div></section>
   <section className="product-banners py-20"><div className="mb-12"><div className="text-[9px] uppercase tracking-[.35em] text-[#263e0e]">Inside the bottle</div><h2 className="mt-5 font-display text-5xl sm:text-7xl">More than<br/><em className="text-[#263e0e]">a fragrance.</em></h2></div><div className="product-banner-grid">{banners.map((src,i)=><article key={i} className="relative aspect-[1.35] overflow-hidden"><img src={src} className="w-full h-full object-cover" alt=""/><div className="absolute inset-0 bg-gradient-to-t from-[#182308]/85 to-transparent"/><div className="absolute bottom-0 p-7 text-white"><div className="text-[9px] uppercase tracking-[.3em] text-[#b4bf41]">0{i+1} — {['The Opening','The Heart','The Memory','Your Ritual'][i]}</div><h3 className="mt-2 font-display text-3xl">{['First impressions matter.','Where the story unfolds.','What remains after you leave.','Make it unmistakably yours.'][i]}</h3><p className="mt-2 text-xs text-white/60">Spray. Layer. Wear. Remember.</p></div></article>)}</div></section>
   <section className="product-tabs py-14 border-y border-[#263e0e]/10"><div className="flex flex-wrap gap-8 text-[10px] uppercase tracking-[.22em]">{[['story','The Story'],['details','Details'],['reviews','Reviews']].map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'text-[#263e0e] border-b border-[#263e0e] pb-3':'text-[#5f654f] pb-3'}>{label}</button>)}</div><div className="mt-8 max-w-3xl text-sm leading-8 text-[#5f654f]">{tab==='story'&&'A fragrance composed to become part of your identity. Spray it close to the skin, let it warm naturally, and allow each layer to reveal itself in its own time.'}{tab==='details'&&(p.content?.fullDescription||'Premium fragrance oils, carefully composed and designed for an evolving trail.')}{tab==='reviews'&&<ReviewsSection slug={slug}/>}</div></section>
   {data.related?.length>0&&<section className="py-20"><div className="text-[9px] uppercase tracking-[.35em] text-[#263e0e]">You may also love</div><h2 className="mt-5 font-display text-5xl sm:text-7xl">Complete<br/><em className="text-[#263e0e]">the story.</em></h2><div className="product-grid mt-12">{data.related.map(r=><ProductCard key={r.id||r._id} product={r}/>)}</div></section>}
  </>}</StateBox>
 </div>;
}