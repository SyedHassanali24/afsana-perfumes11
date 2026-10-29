import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, ArrowRight, Rotate3D } from 'lucide-react';
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

function Media({item,alt,className=''}) {
 if (!item?.url) return <Placeholder className={className||'w-full h-full'}/>;
 if (item.kind==='video' || /\.(mp4|webm|mov)(\?|$)/i.test(item.url)) {
   return <video className={className||'w-full h-full object-cover'} src={item.url} autoPlay muted loop playsInline controls={false} aria-label={alt}/>;
 }
 return <img src={item.url} alt={alt} className={className||'w-full h-full object-cover'}/>;
}

export default function ProductPage(){
 const {slug}=useParams();
 const {data,loading,error,reload}=useApi(()=>productsApi.bySlug(slug),[slug]);
 const {add}=useCart(); const {has,toggle}=useWishlist();
 const [vid,setVid]=useState(null),[qty,setQty]=useState(1),[img,setImg]=useState(0),[tab,setTab]=useState('story');
 const [tilt,setTilt]=useState({x:0,y:0});
 const [stagePulse,setStagePulse]=useState(false),[adding,setAdding]=useState(false),[autoRotate,setAutoRotate]=useState(false),[dragX,setDragX]=useState(null);
 const stageRef=useRef(null);
 const p=data?.product, variants=data?.variants||[];
 useTitle(p?.seo?.title||p?.name);
 useEffect(()=>{if(variants.length){setVid((variants.find(v=>v.available>0)||variants[0]).id);setQty(1);setImg(0)}},[data]);
 useEffect(()=>{if(!autoRotate || media.length<2)return;const id=window.setInterval(()=>setImg(i=>(i+1)%media.length),1400);return()=>window.clearInterval(id)},[autoRotate,media.length]);
 const media=useMemo(()=>[...(p?.media||[])].sort((a,b)=>(a.kind==='main'?-1:b.kind==='main'?1:(a.sortOrder||0)-(b.sortOrder||0))),[p]);
 const v=variants.find(x=>x.id===vid), price=v&&(v.salePrice>0&&v.salePrice<v.price?v.salePrice:v.price), soldOut=!v||v.available<=0, ns=notes(p);
 const addToCart=()=>{if(v&&!soldOut){add(v.id,qty);setAdding(true);window.setTimeout(()=>setAdding(false),650)}};
 const imageMedia=media.filter(m=>m?.url&&m.kind!=='video'&&!/\.(mp4|webm|mov)(\?|$)/i.test(m.url));
 const banners=[imageMedia[0]?.url||'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1200&q=85',imageMedia[1]?.url||imageMedia[0]?.url||'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=85',imageMedia[2]?.url||imageMedia[0]?.url||'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=1200&q=85',imageMedia[3]?.url||imageMedia[0]?.url||'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=85'];
 const onMove=(e)=>{const r=stageRef.current?.getBoundingClientRect();if(!r)return;const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;setTilt({x:y*-7,y:x*10})};
 const resetTilt=()=>setTilt({x:0,y:0});
 const selectMedia=(i)=>{setImg((i+media.length)%media.length);setStagePulse(true);window.setTimeout(()=>setStagePulse(false),650)};
 const beginDrag=(e)=>setDragX(e.clientX ?? e.touches?.[0]?.clientX ?? null);
 const moveDrag=(e)=>{if(dragX==null)return;const x=e.clientX ?? e.touches?.[0]?.clientX ?? dragX;if(Math.abs(x-dragX)>28){selectMedia(img+(x<dragX?1:-1));setDragX(x)}};
 const endDrag=()=>setDragX(null);
 return <Container className="pt-10 sm:pt-16 pb-24">
  <StateBox loading={loading} error={error?.status===404?{message:'This perfume could not be found.'}:error} onRetry={reload}>{p&&<>
   <div className="text-[9px] uppercase tracking-[.28em] text-[#5f654f]"><Link to="/" className="hover:text-[#263e0e]">Home</Link> <span>/</span> <Link to="/shop" className="hover:text-[#263e0e]">Collection</Link> <span>/</span> {p.name}</div>
   <div className="product-detail-grid mt-8">
    <div className="product-gallery">
      <div className="gallery-thumbs space-y-3">{(media.length?media:[{url:''}]).map((m,i)=><button key={i} onClick={()=>selectMedia(i)} className={'group relative w-[72px] aspect-square overflow-hidden border '+(i===img?'border-[#b4bf41] shadow-[0_8px_25px_rgba(38,62,14,.12)]':'border-[#263e0e]/10')}><Media item={m} alt="" className="w-full h-full object-cover transition duration-500 group-hover:scale-105"/>{i===img&&<span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#b4bf41]"/>}</button>)}</div>
      <div ref={stageRef} onPointerMove={(e)=>{onMove(e);moveDrag(e)}} onPointerDown={beginDrag} onPointerUp={endDrag} onPointerLeave={(e)=>{resetTilt();endDrag()}} onTouchStart={beginDrag} onTouchMove={moveDrag} onTouchEnd={endDrag} className="main-product-stage relative min-h-[560px] sm:min-h-[650px] bg-[#f3f1e9] overflow-hidden flex items-center justify-center">
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(180,191,65,.22),transparent_26%),radial-gradient(circle_at_50%_85%,rgba(116,142,64,.12),transparent_34%)]"/>
       <div className="absolute top-5 left-5 z-10 text-[8px] uppercase tracking-[.25em] text-[#5f654f]">AFSANA / {String(img+1).padStart(2,"0")}</div><div className="absolute top-6 right-6 z-10 flex items-center gap-2 border border-[#263e0e]/10 bg-white/55 px-3 py-2 backdrop-blur-sm text-[8px] uppercase tracking-[.2em] text-[#5f654f]"><Rotate3D className="w-3.5 h-3.5"/> 3D / 360° View</div>
       {media.length>1&&<button type="button" onClick={()=>setAutoRotate(v=>!v)} className="absolute top-16 right-6 z-10 border border-[#263e0e]/10 bg-white/65 px-3 py-2 backdrop-blur text-[8px] uppercase tracking-[.2em] text-[#263e0e]">{autoRotate?'Stop 360°':'Auto 360°'}</button>}
       <div className="absolute bottom-10 w-[52%] h-10 rounded-[50%] bg-black/18 blur-2xl transition-transform duration-500" style={{transform:`translateX(${tilt.y*1.4}px) scaleX(${1+Math.abs(tilt.y)/180})`}}/>
       <div className={"product-3d relative w-[70%] h-[84%] "+(stagePulse?"stage-pulse":"")} style={{transform:`perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,transition:'transform .18s ease-out',transformStyle:'preserve-3d'}}>
         <div className="absolute inset-[5%] rounded-[38%] bg-[#748e40]/12 blur-3xl" style={{transform:'translateZ(-70px) scale(.92)'}}/>
         <div className="absolute inset-[4%] rounded-[32%] border border-[#748e40]/20 opacity-60" style={{transform:'translateZ(-28px) rotateY(5deg)'}}/>
         <div className="absolute inset-[8%] overflow-hidden rounded-[18%] opacity-20 blur-[2px]" style={{transform:'translateZ(-18px) scale(.96)'}}><Media item={media[img]} alt="" className="w-full h-full object-cover"/></div>
         <div className="absolute inset-0 flex items-center justify-center" style={{transform:'translateZ(45px)'}}><div className="absolute inset-[12%] rounded-full bg-[#b4bf41]/10 blur-3xl"/>
           <div key={img} className="media-transition h-full w-full"><Media item={media[img]} alt={p.name} className="max-h-full max-w-full w-full h-full object-contain drop-shadow-[0_38px_48px_rgba(20,30,10,.30)]"/></div>
         </div>
         <div className="absolute left-[10%] right-[10%] bottom-[7%] h-[14%] rounded-[50%] bg-white/20 blur-xl" style={{transform:'translateZ(15px)'}}/>
       </div>
       <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-center text-[8px] uppercase tracking-[.25em] text-[#5f654f]/65">Drag / swipe to rotate · {media[img]?.kind==="video"?"Live film":"Cinematic view"}</div>
      </div>
    </div>
    <div className="lg:pt-5">
      <div className="text-[9px] uppercase tracking-[.35em] text-[#263e0e]">{p.fragrance?.gender||'Signature'} {p.fragrance?.concentration&&' · '+p.fragrance.concentration}</div>
      <h1 className="mt-4 font-display text-5xl sm:text-7xl leading-[.88]">{p.name}</h1>
      <div className="mt-6 flex items-center gap-4"><span className="text-[#748e40] tracking-[.2em]">★★★★★</span><span className="text-[10px] text-[#5f654f]">4.9 / 5 · 186 reviews</span></div>
      <p className="mt-7 text-sm leading-8 text-[#5f654f]">{p.content?.shortDescription||'A fragrance composed to become part of your identity — luminous, sophisticated and designed to leave a trace.'}</p>
      <div className="mt-7 flex items-end justify-between gap-5"><div className="font-display text-4xl">{v?money(price):'Currently unavailable'}</div>{v?.available>0&&<span className="text-[8px] uppercase tracking-[.22em] text-[#748e40]">{v.available<5?"Limited availability":"In stock"} · Ready to ship</span>}</div>
      <div className="mt-9 border-t border-[#263e0e]/10 pt-6 text-[10px] uppercase tracking-[.25em]">Choose your size</div>
      <div className="mt-3 flex flex-wrap gap-2">{variants.map(x=><button key={x.id} onClick={()=>{setVid(x.id);setQty(1)}} className={'px-5 py-3 border text-[10px] uppercase tracking-[.15em] '+(x.id===vid?'border-[#263e0e] bg-[#e7ead9] text-[#263e0e]':'border-[#263e0e]/15')}>{x.label||x.sizeMl+' ML'}</button>)}</div>
      <div className="mt-7 flex gap-3"><QtyStepper value={qty} onChange={setQty} max={v?.available||1}/><button disabled={soldOut} onClick={addToCart} className={"flex-1 bg-[#263e0e] text-white px-7 py-4 text-[10px] uppercase tracking-[.2em] disabled:opacity-40 "+(adding?"add-bag-success":"")}>{adding ? "Added to bag" : <>Add to bag <span className="ml-3">↗</span></>}</button><button onClick={()=>toggle(p.id||p._id)} className="w-14 border border-[#263e0e]/15 grid place-items-center"><Heart fill={has(p.id||p._id)?'currentColor':'none'} className="w-4"/></button></div>
      <div className="mt-8 grid grid-cols-3 border-y border-[#263e0e]/10 divide-x divide-[#263e0e]/10">{[['Premium','Fragrance Oils'],['Gift Ready','Luxury Packaging'],['Fast','Nationwide Delivery']].map(([a,b])=><div key={a} className="py-5"><strong className="block font-display text-lg">{a}</strong><small className="text-[9px] uppercase tracking-[.12em] text-[#5f654f]">{b}</small></div>)}</div>
      <div className="mt-7 flex flex-wrap gap-2 text-[8px] uppercase tracking-[.16em] text-[#5f654f]"><span className="border border-[#263e0e]/10 px-3 py-2">Premium Oils</span><span className="border border-[#263e0e]/10 px-3 py-2">Gift Ready</span><span className="border border-[#263e0e]/10 px-3 py-2">Nationwide Delivery</span></div>
    </div>
   </div>
   <section className="notes-section mt-24 py-20 bg-[#263e0e] text-white"><div className="notes-grid"><div><div className="text-[9px] uppercase tracking-[.35em] text-[#b4bf41]">The architecture of the scent</div><h2 className="mt-5 font-display text-5xl sm:text-7xl">Three chapters.<br/>One <em className="text-[#b4bf41]">memory.</em></h2><p className="mt-6 max-w-lg text-sm leading-8 text-white/55">Every Afsana fragrance is built like a story. The top notes create the first impression. The heart reveals personality. The base becomes the memory that remains.</p></div><div className="note-pyramid space-y-2">{[['TOP',ns.top],['HEART',ns.heart],['BASE',ns.base]].map(([t,l],i)=><div key={t} className={'note-layer mx-auto '+(i===0?'note-top':i===1?'note-heart':'note-base')}><span className="text-[9px] uppercase tracking-[.3em] text-[#b4bf41]">{t}</span><div className="mt-2">{l.join(' · ')}</div></div>)}</div></div></section>
   <section className="py-20"><div className="mb-12"><div className="text-[9px] uppercase tracking-[.35em] text-[#263e0e]">Inside the bottle</div><h2 className="mt-5 font-display text-5xl sm:text-7xl">More than<br/><em className="text-[#263e0e]">a fragrance.</em></h2></div><div className="product-banner-grid">{banners.map((src,i)=><article key={i} className="product-banner relative"><img src={src} className="w-full h-full object-cover" alt=""/><div className="absolute inset-0 bg-gradient-to-t from-[#182308]/85 to-transparent"/><div className="product-banner-copy absolute bottom-0 p-7 text-white"><div className="text-[9px] uppercase tracking-[.3em] text-[#b4bf41]">0{i+1} — {['The Opening','The Heart','The Memory','Your Ritual'][i]}</div><h3 className="mt-2 font-display text-3xl">{['First impressions matter.','Where the story unfolds.','What remains after you leave.','Make it unmistakably yours.'][i]}</h3><p className="mt-2 text-xs text-white/60">Spray. Layer. Wear. Remember.</p></div></article>)}</div></section>
   <section className="py-14 border-y border-[#263e0e]/10"><div className="tabs flex flex-wrap gap-8 text-[10px] uppercase tracking-[.22em]">{[['story','The Story'],['details','Details'],['reviews','Reviews']].map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'tab active text-[#263e0e] border-b border-[#263e0e] pb-3':'tab text-[#5f654f] pb-3'}>{label}</button>)}</div><div className="mt-8 max-w-3xl text-sm leading-8 text-[#5f654f]">{tab==='story'&&'A fragrance composed to become part of your identity. Spray it close to the skin, let it warm naturally, and allow each layer to reveal itself in its own time.'}{tab==='details'&&(p.content?.fullDescription||'Premium fragrance oils, carefully composed and designed for an evolving trail.')}{tab==='reviews'&&<ReviewsSection slug={slug}/>}</div></section>
   {data.related?.length>0&&<section className="py-20"><div className="text-[9px] uppercase tracking-[.35em] text-[#263e0e]">You may also love</div><h2 className="mt-5 font-display text-5xl sm:text-7xl">Complete<br/><em className="text-[#263e0e]">the story.</em></h2><div className="product-grid mt-12">{data.related.map(r=><ProductCard key={r.id||r._id} product={r}/>)}</div></section>}
  </>}</StateBox>
 </Container>;
}