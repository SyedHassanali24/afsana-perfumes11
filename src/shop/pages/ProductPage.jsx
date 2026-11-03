import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, ArrowRight, Rotate3D } from 'lucide-react';
import useApi from '../../hooks/useApi';
import { productsApi, cmsPublicApi } from '../../services';
import { Container, StateBox, QtyStepper, Placeholder } from '../ui';
import ProductCard from '../ProductCard';
import ReviewsSection, { Stars } from '../ReviewsSection';
import { useCart } from '../CartContext';
import { useWishlist } from '../WishlistContext';
import { money } from '../format';
import useTitle from '../useTitle';

const notes=(p)=>({top:p?.notes?.top||['Citrus','Saffron'],heart:p?.notes?.heart||['Rose','Jasmine','Spice'],base:p?.notes?.base||['Oud','Amber','Musk','Woods']});
const mediaUrl = (value) => {
 if (typeof value === 'string') return value.trim();
 if (!value || typeof value !== 'object') return '';
 return String(value.url || value.src || value.imageUrl || value.secure_url || value.path || value.image?.url || '').trim();
};
const normaliseProductMedia = (product) => {
 const raw = Array.isArray(product?.media) ? product.media
  : product?.media && typeof product.media === 'object' ? Object.values(product.media)
  : Array.isArray(product?.images) ? product.images
  : Array.isArray(product?.gallery) ? product.gallery : [];
 const legacy = [product?.mainImage, product?.image, product?.featuredImage, product?.imageUrl, product?.thumbnail].filter(Boolean);
 const mapped = [...raw, ...legacy].map((entry, index) => {
  const url = mediaUrl(entry);
  const item = typeof entry === 'string' ? {} : (entry || {});
  const kind = item.kind || item.type || item.role || (index === 0 ? 'main' : 'gallery');
  return { ...item, url, kind, sortOrder: item.sortOrder ?? index, alt: item.alt || product?.name || 'AFSANA fragrance' };
 }).filter((item) => item.url);
 const seen = new Set();
 return mapped.filter((item) => { if (seen.has(item.url)) return false; seen.add(item.url); return true; });
};


function Media({item,alt,className='',onError}) {
 const url = mediaUrl(item);
 if (!url) return <Placeholder className={className||'w-full h-full'}/>;
 if (item?.kind==='video' || /\.(mp4|webm|mov)(\?|$)/i.test(url)) {
   return <video className={className||'w-full h-full object-cover'} src={url} autoPlay muted loop playsInline controls={false} aria-label={alt} onError={onError}/>;
 }
 return <img src={url} alt={alt} className={className||'w-full h-full object-cover'} onError={onError}/>;
}

function BottlePreview({name,style}) {
 return <div className="afsana-bottle-preview" style={style} aria-label={name+' bottle preview'}>
  <div className="afsana-bottle-shadow"/>
  <div className="afsana-bottle-cap"><span/></div>
  <div className="afsana-bottle-neck"/>
  <div className="afsana-bottle-body">
   <div className="afsana-bottle-liquid"/>
   <div className="afsana-bottle-glass"/>
   <div className="afsana-bottle-highlight"/>
   <div className="afsana-bottle-label"><small>THE HOUSE OF</small><strong>AFSANA</strong><span>{name}</span><i>EAU DE PARFUM</i></div>
  </div>
 </div>;
}

export default function ProductPage(){
 const {slug}=useParams();
 const {data,loading,error,reload}=useApi(()=>productsApi.bySlug(slug),[slug]);
 const {data:cmsContent}=useApi(()=>cmsPublicApi.content(),[]);
 const referenceAssets=(cmsContent?.homepageSections||[]).find((item)=>item.type==='reference_assets')?.config||{};
 const {add}=useCart(); const {has,toggle}=useWishlist();
 const [vid,setVid]=useState(null),[qty,setQty]=useState(1),[img,setImg]=useState(0),[tab,setTab]=useState('story');
 const [tilt,setTilt]=useState({x:0,y:0});
 const [stagePulse,setStagePulse]=useState(false),[adding,setAdding]=useState(false),[autoRotate,setAutoRotate]=useState(false),[dragX,setDragX]=useState(null);
 const [mediaBroken,setMediaBroken]=useState(false),[modelViewerReady,setModelViewerReady]=useState(false),[modelViewerFailed,setModelViewerFailed]=useState(false);
 const stageRef=useRef(null),modelViewerRef=useRef(null);
 const p=data?.product, variants=data?.variants||[];
 useTitle(p?.seo?.title||p?.name);
 useEffect(()=>{if(variants.length){setVid((variants.find(v=>v.available>0)||variants[0]).id);setQty(1);setImg(0)}},[data]);
 const productMedia=useMemo(()=>normaliseProductMedia(p),[p]);
 const media=useMemo(()=>productMedia.filter((item)=>item.kind!=='model3d'&&!/\.(glb|gltf)(\?|$)/i.test(item.url)).sort((a,b)=>(a.kind==='main'?-1:b.kind==='main'?1:(a.sortOrder||0)-(b.sortOrder||0))),[productMedia]);
 const product3dUrl=productMedia.find((item)=>item.kind==='model3d'||/\.(glb|gltf)(\?|$)/i.test(item.url))?.url || p?.model3dUrl || p?.modelUrl || referenceAssets.product3dModelUrl || '';
 useEffect(()=>{setMediaBroken(false);setModelViewerFailed(false);setImg(0)},[slug]);
 useEffect(()=>{if(!autoRotate || media.length<2)return;const id=window.setInterval(()=>{setImg(i=>(i+1)%media.length);setMediaBroken(false)},1400);return()=>window.clearInterval(id)},[autoRotate,media.length]);
 useEffect(()=>{
  if(!product3dUrl || typeof window==='undefined' || !window.customElements) { setModelViewerReady(false); return; }
  let active=true;
  const ready=()=>window.customElements.whenDefined('model-viewer').then(()=>{if(active)setModelViewerReady(true)}).catch(()=>{if(active)setModelViewerFailed(true)});
  if(window.customElements.get('model-viewer')) ready();
  let script=document.querySelector('script[data-afsana-model-viewer]');
  if(!script){
   script=document.createElement('script');script.type='module';script.src='https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';script.dataset.afsanaModelViewer='true';
   script.addEventListener('load',ready,{once:true});script.addEventListener('error',()=>{if(active)setModelViewerFailed(true)},{once:true});document.head.appendChild(script);
  } else if(!window.customElements.get('model-viewer')) {
   script.addEventListener('load',ready,{once:true});
   script.addEventListener('error',()=>{if(active)setModelViewerFailed(true)},{once:true});
   ready();
  }
  return ()=>{active=false;};
 },[product3dUrl]);
 useEffect(()=>{
  const viewer=modelViewerRef.current;
  if(!viewer)return;
  const onError=()=>setModelViewerFailed(true),onLoad=()=>setModelViewerFailed(false);
  viewer.addEventListener('error',onError);viewer.addEventListener('load',onLoad);
  return ()=>{viewer.removeEventListener('error',onError);viewer.removeEventListener('load',onLoad)};
 },[product3dUrl,modelViewerReady]);
 const ratingAvg=Number(p?.ratingAvg||0),ratingCount=Number(p?.ratingCount||0);
 const v=variants.find(x=>x.id===vid), price=v&&(v.salePrice>0&&v.salePrice<v.price?v.salePrice:v.price), soldOut=!v||v.available<=0, ns=notes(p);
 const addToCart=()=>{if(v&&!soldOut){add(v.id,qty);setAdding(true);window.setTimeout(()=>setAdding(false),650)}};
 const imageMedia=media.filter(m=>m?.url&&m.kind!=='video'&&!/\.(mp4|webm|mov)(\?|$)/i.test(m.url));
 const activeMedia=media[img]||media[0]||null;
 const hasProductVisual=!!(activeMedia?.url&&!mediaBroken);
 const showRealModel=!!(product3dUrl&&modelViewerReady&&!modelViewerFailed);
 const banners=[imageMedia[0]?.url||'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1200&q=85',imageMedia[1]?.url||imageMedia[0]?.url||'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=85',imageMedia[2]?.url||imageMedia[0]?.url||'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=1200&q=85',imageMedia[3]?.url||imageMedia[0]?.url||'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=85'];
 const onMove=(e)=>{const r=stageRef.current?.getBoundingClientRect();if(!r)return;const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;setTilt({x:y*-7,y:x*10})};
 const resetTilt=()=>setTilt({x:0,y:0});
 const selectMedia=(i)=>{if(!media.length)return;setImg((i+media.length)%media.length);setMediaBroken(false);setStagePulse(true);window.setTimeout(()=>setStagePulse(false),650)};
 const beginDrag=(e)=>setDragX(e.clientX ?? e.touches?.[0]?.clientX ?? null);
 const moveDrag=(e)=>{if(dragX==null)return;const x=e.clientX ?? e.touches?.[0]?.clientX ?? dragX;if(Math.abs(x-dragX)>28){selectMedia(img+(x<dragX?1:-1));setDragX(x)}};
 const endDrag=()=>setDragX(null);
 return <Container className="pt-10 sm:pt-16 pb-24">
  <style>{`
   .product-detail-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(360px,.88fr);gap:clamp(28px,4.8vw,76px);align-items:start}
   .product-gallery{display:grid;grid-template-columns:72px minmax(0,1fr);gap:14px;align-items:start;min-width:0}
   .gallery-thumbs{display:flex;flex-direction:column;gap:10px;max-height:720px;overflow:auto;scrollbar-width:thin}
   .gallery-thumbs button{flex:none;border-radius:7px;background:#f7f4fb}
   .main-product-stage{height:clamp(590px,62vw,790px);min-height:590px;border-radius:24px;background:radial-gradient(ellipse at 50% 32%,rgba(157,119,218,.2),transparent 33%),radial-gradient(ellipse at 50% 92%,rgba(211,177,133,.18),transparent 35%),linear-gradient(145deg,#faf8fd,#ede7f5);border:1px solid rgba(115,87,255,.13);box-shadow:0 25px 80px rgba(32,17,54,.09)}
   .afsana-product-stage-glow{position:absolute;inset:8%;border:1px solid rgba(115,87,255,.09);border-radius:20px;pointer-events:none}
   .afsana-product-stage-glow:before{content:"";position:absolute;inset:10%;border-radius:50%;background:radial-gradient(ellipse,rgba(179,153,218,.16),transparent 65%);filter:blur(20px)}
   .afsana-product-shadow{position:absolute;bottom:13%;width:48%;height:34px;border-radius:50%;background:rgba(35,19,55,.19);filter:blur(22px);transition:transform .4s}
   .afsana-bottle-preview{position:relative;z-index:1;width:min(68%,350px);height:78%;min-height:390px;transform-style:preserve-3d;filter:drop-shadow(0 38px 34px rgba(32,17,54,.22));animation:afsanaBottleIn .8s cubic-bezier(.2,.8,.2,1) both}
   .afsana-bottle-shadow{position:absolute;left:17%;right:17%;bottom:1%;height:5%;border-radius:50%;background:rgba(29,14,47,.24);filter:blur(15px);transform:translateZ(-35px)}
   .afsana-bottle-cap{position:absolute;z-index:3;top:3%;left:35%;width:30%;height:15%;border:1px solid rgba(255,255,255,.5);border-radius:8px 8px 4px 4px;background:linear-gradient(90deg,#241637 0%,#745c91 18%,#d0b6df 34%,#4a345f 63%,#241637 100%);box-shadow:inset 5px 0 8px rgba(255,255,255,.22),inset -7px 0 10px rgba(0,0,0,.28),0 9px 15px rgba(27,15,41,.2);transform:translateZ(24px)}
   .afsana-bottle-cap span{position:absolute;left:15%;right:15%;top:12%;height:1px;background:rgba(255,255,255,.48);box-shadow:0 5px rgba(255,255,255,.15),0 10px rgba(0,0,0,.12)}
   .afsana-bottle-neck{position:absolute;z-index:2;top:17%;left:40%;width:20%;height:9%;border:1px solid rgba(255,255,255,.75);background:linear-gradient(90deg,#4c3b60,#e5d5ef 30%,#827095 65%,#2d1e42);box-shadow:0 5px 9px rgba(27,15,41,.18);transform:translateZ(15px)}
   .afsana-bottle-body{position:absolute;left:12%;right:12%;top:23%;bottom:4%;overflow:hidden;border:2px solid rgba(255,255,255,.78);border-radius:22px 22px 30px 30px;background:linear-gradient(90deg,rgba(55,34,79,.96),rgba(161,130,185,.8) 15%,rgba(236,221,245,.8) 31%,rgba(97,66,126,.94) 57%,rgba(37,22,55,.98) 100%);box-shadow:inset 9px 0 14px rgba(255,255,255,.24),inset -12px 0 17px rgba(0,0,0,.35),inset 0 9px 12px rgba(255,255,255,.28),0 18px 25px rgba(23,12,36,.17);transform:translateZ(22px);transform-style:preserve-3d}
   .afsana-bottle-liquid{position:absolute;left:2%;right:2%;bottom:2%;height:62%;border-radius:8px 8px 23px 23px;background:linear-gradient(90deg,rgba(66,33,86,.9),rgba(196,154,97,.82) 22%,rgba(246,215,158,.75) 43%,rgba(102,59,113,.86) 76%,rgba(38,21,54,.96));box-shadow:inset 0 5px 10px rgba(255,255,255,.25)}
   .afsana-bottle-glass{position:absolute;inset:0;background:linear-gradient(105deg,rgba(255,255,255,.52),transparent 11%,transparent 72%,rgba(255,255,255,.18) 82%,transparent 95%);pointer-events:none}
   .afsana-bottle-highlight{position:absolute;z-index:2;top:7%;left:10%;width:9%;height:73%;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,.68),rgba(255,255,255,.04));filter:blur(3px)}
   .afsana-bottle-label{position:absolute;z-index:3;top:37%;left:11%;right:11%;min-height:30%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:12px 5px;border:1px solid rgba(237,215,177,.62);background:linear-gradient(145deg,rgba(18,10,29,.88),rgba(44,27,62,.82));color:#f6e8cf;text-align:center;box-shadow:0 8px 18px rgba(14,8,24,.3);transform:translateZ(12px)}
   .afsana-bottle-label small{font-size:7px;letter-spacing:.27em;opacity:.76}
   .afsana-bottle-label strong{font-family:Georgia,serif;font-size:clamp(18px,2vw,27px);font-weight:400;letter-spacing:.14em}
   .afsana-bottle-label span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:Georgia,serif;font-size:clamp(9px,1vw,13px);letter-spacing:.08em}
   .afsana-bottle-label i{font-size:6px;font-style:normal;letter-spacing:.22em;opacity:.8}
   @keyframes afsanaBottleIn{from{opacity:0;transform:translateY(28px) rotateY(-13deg) scale(.94)}to{opacity:1;transform:translateY(0) rotateY(0) scale(1)}}
   model-viewer{--poster-color:transparent;--progress-bar-color:#7357ff;--progress-mask:#f2eef8}
   @media(max-width:980px){.product-detail-grid{grid-template-columns:minmax(0,1fr);gap:42px}.product-gallery{grid-template-columns:64px minmax(0,1fr)}.main-product-stage{height:clamp(560px,78vw,720px)}}
   @media(max-width:600px){.product-detail-grid{margin-top:22px}.product-gallery{display:flex;flex-direction:column;gap:12px}.main-product-stage{order:1;width:100%;height:clamp(480px,130vw,620px);min-height:480px;border-radius:16px}.gallery-thumbs{order:2;flex-direction:row;width:100%;max-height:none;overflow-x:auto;overflow-y:hidden;padding:2px 0 7px}.gallery-thumbs button{width:60px;min-width:60px}.afsana-bottle-preview{min-height:350px;height:76%;width:74%}.afsana-bottle-label{gap:5px}.afsana-bottle-label strong{font-size:18px}}
   @media(prefers-reduced-motion:reduce){.afsana-bottle-preview{animation:none}}
  `}</style>
  <StateBox loading={loading} error={error?.status===404?{message:'This perfume could not be found.'}:error} onRetry={reload}>{p&&<>
   <div className="text-[9px] uppercase tracking-[.28em] text-[#5f654f]"><Link to="/" className="hover:text-[#263e0e]">Home</Link> <span>/</span> <Link to="/shop" className="hover:text-[#263e0e]">Collection</Link> <span>/</span> {p.name}</div>
   <div className="product-detail-grid mt-8">
    <div className="product-gallery">
      {media.length>1&&<div className="gallery-thumbs">{media.map((m,i)=><button type="button" key={m.url+'-'+i} onClick={()=>selectMedia(i)} aria-label={'View product media '+(i+1)} className={'group relative w-[72px] aspect-square overflow-hidden border '+(i===img?'border-[#7357ff] shadow-[0_8px_25px_rgba(50,26,90,.18)]':'border-[#7357ff]/15')}><Media item={m} alt="" className="w-full h-full object-cover transition duration-500 group-hover:scale-105"/>{i===img&&<span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#7357ff]"/>}</button>)}</div>}
      <div ref={stageRef} onPointerMove={(e)=>{onMove(e);moveDrag(e)}} onPointerDown={beginDrag} onPointerUp={endDrag} onPointerLeave={()=>{resetTilt();endDrag()}} onTouchStart={beginDrag} onTouchMove={moveDrag} onTouchEnd={endDrag} className="main-product-stage relative overflow-hidden flex items-center justify-center">
       <div className="afsana-product-stage-glow"/>
       <div className="absolute top-5 left-5 z-10 text-[8px] uppercase tracking-[.25em] text-[#665d79]">AFSANA / {String(img+1).padStart(2,"0")}</div>
       <div className="absolute top-5 right-5 z-10 flex items-center gap-2 border border-[#7357ff]/15 bg-white/70 px-3 py-2 backdrop-blur-sm text-[8px] uppercase tracking-[.18em] text-[#46375f]"><Rotate3D className="w-3.5 h-3.5"/> {showRealModel?'Interactive 3D bottle':product3dUrl?'Loading 3D preview':media.length?'Interactive product view':'Bottle preview'}</div>
       {media.length>1&&<button type="button" onClick={()=>setAutoRotate(v=>!v)} className="absolute top-16 right-5 z-10 border border-[#7357ff]/15 bg-white/75 px-3 py-2 backdrop-blur text-[8px] uppercase tracking-[.18em] text-[#392650]">{autoRotate?'Stop gallery':'Auto gallery'}</button>}
       <div className="afsana-product-shadow" style={{transform:`translateX(${tilt.y*1.4}px) scaleX(${1+Math.abs(tilt.y)/180})`}}/>
       {showRealModel
        ? <model-viewer ref={modelViewerRef} src={product3dUrl} poster={referenceAssets.product3dPosterUrl || imageMedia[0]?.url || undefined} alt={p.name+' 3D perfume bottle'} camera-controls auto-rotate shadow-intensity="1.2" exposure="1.05" environment-image="neutral" interaction-prompt="auto" style={{width:'88%',height:'88%',background:'transparent','--poster-color':'transparent','--progress-bar-color':'#7357ff','--progress-mask':'#f2eef8'}}/>
        : hasProductVisual
         ? <div className={"product-3d relative z-[1] w-[84%] h-[88%] "+(stagePulse?"stage-pulse":"")} style={{transform:`perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,transition:'transform .18s ease-out',transformStyle:'preserve-3d'}}>
            <div className="absolute inset-[5%] rounded-[38%] bg-[#7357ff]/10 blur-3xl" style={{transform:'translateZ(-65px) scale(.92)'}}/>
            <div className="absolute inset-[4%] rounded-[32%] border border-[#7357ff]/15 opacity-60" style={{transform:'translateZ(-28px) rotateY(5deg)'}}/>
            <div className="absolute inset-0 flex items-center justify-center" style={{transform:'translateZ(42px)'}}>
             <div className="absolute inset-[12%] rounded-full bg-[#b7a0da]/20 blur-3xl"/>
             <div key={img} className="media-transition h-full w-full"><Media item={activeMedia} alt={p.name} onError={()=>setMediaBroken(true)} className="max-h-full max-w-full w-full h-full object-contain drop-shadow-[0_38px_48px_rgba(25,13,44,.28)]"/></div>
            </div>
           </div>
         : <BottlePreview name={p.name} style={{transform:`perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,transition:'transform .18s ease-out'}}/>}
       <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-center text-[8px] uppercase tracking-[.2em] text-[#665d79]/80">{showRealModel?'Drag to rotate · True 3D model':hasProductVisual?'Move or drag to explore the bottle image':product3dUrl&&!modelViewerFailed?'Preparing interactive model':'3D-style bottle preview · Add product photos or GLB in CMS'}</div>
      </div>
    </div>
    <div className="lg:pt-5">
      <div className="text-[9px] uppercase tracking-[.35em] text-[#263e0e]">{p.fragrance?.gender||'Signature'} {p.fragrance?.concentration&&' · '+p.fragrance.concentration}</div>
      <h1 className="mt-4 font-display text-5xl sm:text-7xl leading-[.88]">{p.name}</h1>
      <div className="mt-6 flex flex-wrap items-center gap-3">{ratingCount>0?<><Stars value={ratingAvg} size="text-lg"/><span className="text-[10px] text-[#5f654f]">{ratingAvg.toFixed(1)} / 5 · {ratingCount} approved {ratingCount===1?'review':'reviews'}</span></>:<span className="text-xs text-[#5f654f]">No approved reviews yet — be the first to share your experience.</span>}</div>
      <p className="mt-7 text-sm leading-8 text-[#5f654f]">{p.content?.shortDescription||'A fragrance composed to become part of your identity — luminous, sophisticated and designed to leave a trace.'}</p>
      <div className="mt-7 flex items-end justify-between gap-5"><div className="font-display text-4xl">{v?money(price):'Currently unavailable'}</div>{v?.available>0&&<span className="text-[8px] uppercase tracking-[.22em] text-[#748e40]">{v.available<5?"Limited availability":"In stock"} · Ready to ship</span>}</div>
      <div className="mt-9 border-t border-[#263e0e]/10 pt-6 text-[10px] uppercase tracking-[.25em]">Choose your size</div>
      <div className="mt-3 flex flex-wrap gap-2">{variants.map(x=><button key={x.id} onClick={()=>{setVid(x.id);setQty(1)}} className={'px-5 py-3 border text-[10px] uppercase tracking-[.15em] '+(x.id===vid?'border-[#263e0e] bg-[#e7ead9] text-[#263e0e]':'border-[#263e0e]/15')}>{x.label||x.sizeMl+' ML'}</button>)}</div>
      <div className="mt-7 flex gap-3"><QtyStepper value={qty} onChange={setQty} max={v?.available||1}/><button disabled={soldOut} onClick={addToCart} className={"flex-1 bg-[#263e0e] text-white px-7 py-4 text-[10px] uppercase tracking-[.2em] disabled:opacity-40 "+(adding?"add-bag-success":"")}>{adding ? "Added to bag" : <>Add to bag <span className="ml-3">↗</span></>}</button><button onClick={()=>toggle(p.id||p._id)} className="w-14 border border-[#263e0e]/15 grid place-items-center"><Heart fill={has(p.id||p._id)?'currentColor':'none'} className="w-4"/></button></div>
      <div className="mt-8 grid grid-cols-3 border-y border-[#263e0e]/10 divide-x divide-[#263e0e]/10">{[['Premium','Fragrance Oils'],['Gift Ready','Luxury Packaging'],['Fast','Nationwide Delivery']].map(([a,b])=><div key={a} className="py-5"><strong className="block font-display text-lg">{a}</strong><small className="text-[9px] uppercase tracking-[.12em] text-[#5f654f]">{b}</small></div>)}</div><div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">{[['Longevity',p.fragrance?.longevity],['Projection',p.fragrance?.projection],['Concentration',p.fragrance?.concentration],['Gender',p.fragrance?.gender],['Season',p.fragrance?.seasons?.join(', ')],['Occasion',p.fragrance?.occasions?.join(', ')]].filter(([,value])=>value).map(([label,value])=><div key={label} className="rounded-xl border border-[#263e0e]/10 bg-white/70 p-4"><p className="text-[8px] uppercase tracking-[.2em] text-[#748e40]">{label}</p><p className="mt-2 text-xs text-[#263e0e]">{value}</p></div>)}</div>
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