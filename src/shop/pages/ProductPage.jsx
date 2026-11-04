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
import { useCmsPageCopy } from '../cmsCopy';

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
 const copy=useCmsPageCopy('product_before');
 const t=(key)=>copy[key];
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
  } else if(!isViewerDefined && script) {
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
 return <Container className="afsana-product-page pt-8 sm:pt-10 pb-24">
  <style>{`
   .product-detail-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(360px,.88fr);gap:clamp(28px,4.8vw,76px);align-items:start}
   .product-gallery{display:grid;grid-template-columns:72px minmax(0,1fr);gap:14px;align-items:start;min-width:0}.product-gallery.no-thumbs{grid-template-columns:minmax(0,1fr)}
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

   /* Premium purchase panel — scoped only to the product detail information column */
   .afsana-product-info{position:relative;isolation:isolate;overflow:hidden;margin-top:4px;padding:clamp(24px,3.2vw,42px);border:1px solid rgba(115,87,255,.16);border-radius:22px;background:linear-gradient(150deg,rgba(255,255,255,.96),rgba(247,243,252,.97));box-shadow:0 24px 70px rgba(35,20,58,.075),inset 0 1px 0 #fff}
   .afsana-product-info:before{content:"";position:absolute;z-index:-1;top:-170px;right:-120px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(163,128,213,.13),transparent 68%);pointer-events:none}
   .afsana-product-info-topline{display:flex;align-items:center;gap:10px;min-height:25px}
   .afsana-product-eyebrow{display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid rgba(115,87,255,.2);border-radius:30px;background:rgba(115,87,255,.055);color:#65469a;font-size:8px;font-weight:800;letter-spacing:.2em;text-transform:uppercase}
   .afsana-product-eyebrow:before{content:"";width:5px;height:5px;border-radius:50%;background:#9471ca;box-shadow:0 0 0 4px rgba(148,113,202,.1)}
   .afsana-product-concentration{color:#847a91;font-size:8px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
   .afsana-product-ref{margin-left:auto;color:#a49aaa;font-size:8px;letter-spacing:.2em}
   .afsana-product-title{margin:23px 0 0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;color:#1c1428!important;font-family:var(--font-display,Georgia,serif)!important;font-size:clamp(48px,5.6vw,76px)!important;font-weight:500!important;line-height:.88!important;letter-spacing:-.045em!important;overflow-wrap:anywhere}
   .afsana-product-rating{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin-top:19px;color:#82798b;font-size:9px;line-height:1.6}
   .afsana-product-rating i{width:3px;height:3px;border-radius:50%;background:#c6b6d8}
   .afsana-rating-empty{padding:5px 8px;border-radius:20px;background:#f0eaf8;color:#775aa0;font-size:7px;font-weight:800;letter-spacing:.14em}
   .afsana-product-description{max-width:560px;margin:22px 0 0!important;color:#746b7d!important;font-size:13px!important;line-height:1.95!important;letter-spacing:.01em}
   .afsana-product-purchase{margin-top:26px;padding:22px;border:1px solid rgba(115,87,255,.12);border-radius:16px;background:linear-gradient(145deg,#fff,#f6f2fa);box-shadow:0 12px 32px rgba(46,26,72,.045)}
   .afsana-product-price-row{display:flex;align-items:flex-end;justify-content:space-between;gap:15px}
   .afsana-product-price-label{display:block;margin-bottom:7px;color:#978ca1;font-size:8px;font-weight:800;letter-spacing:.2em}
   .afsana-product-price{display:block;color:#241633;font-family:var(--font-display,Georgia,serif);font-size:clamp(33px,3.4vw,46px);font-weight:600;line-height:1}
   .afsana-stock-status{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end;padding:8px 11px;border:1px solid rgba(99,137,82,.18);border-radius:30px;background:#f2f7ef;color:#537748;font-size:8px;font-weight:800;letter-spacing:.07em}
   .afsana-stock-status i{width:6px;height:6px;border-radius:50%;background:#6b9b57;box-shadow:0 0 0 4px rgba(107,155,87,.12)}
   .afsana-stock-status small{width:100%;margin-left:13px;color:#8a9d82;font-size:7px;font-weight:500;letter-spacing:.04em}
   .afsana-product-divider{height:1px;margin:20px 0;background:linear-gradient(90deg,rgba(115,87,255,.2),rgba(115,87,255,.035))}
   .afsana-size-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#322440;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
   .afsana-size-heading small{color:#9589a2;font-size:7px;letter-spacing:.14em}
   .afsana-size-options{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
   .afsana-size-option{display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-width:92px;padding:11px 14px;border:1px solid rgba(58,40,79,.13);border-radius:9px;background:#fff;color:#584b66;font-size:10px;font-weight:800;letter-spacing:.08em;transition:background .25s,border-color .25s,transform .25s,box-shadow .25s}
   .afsana-size-option span{color:#a69aac;font-size:6px;font-weight:700;letter-spacing:.17em}
   .afsana-size-option:hover{transform:translateY(-2px);border-color:rgba(115,87,255,.5)}
   .afsana-size-option.is-selected{border-color:#7357ff;background:linear-gradient(135deg,#f0eafb,#fff);color:#4c2c7c;box-shadow:0 5px 18px rgba(115,87,255,.12)}
   .afsana-size-option.is-selected span{color:#8061b2}
   .afsana-product-actions{display:grid;grid-template-columns:auto minmax(0,1fr) 48px;align-items:stretch;gap:9px;margin-top:19px}
   .afsana-quantity-wrap{display:flex;flex-direction:column;justify-content:center;gap:7px;min-width:78px}
   .afsana-quantity-wrap>span{color:#a096aa;font-size:7px;font-weight:800;letter-spacing:.18em}
   .afsana-quantity-wrap>div{min-height:46px}
   .afsana-add-to-bag{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:0 19px;border:1px solid #5b3a88;border-radius:9px;background:linear-gradient(110deg,#2a193d,#543477 65%,#7253a0);box-shadow:0 10px 23px rgba(56,34,84,.19);color:#fff;font-size:8px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;transition:transform .25s,box-shadow .25s,filter .25s}
   .afsana-add-to-bag span{color:#ead4ad;font-size:17px;transition:transform .25s}
   .afsana-add-to-bag:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 15px 30px rgba(56,34,84,.25);filter:brightness(1.08)}
   .afsana-add-to-bag:hover:not(:disabled) span{transform:translate(3px,-2px)}
   .afsana-add-to-bag:disabled{cursor:not-allowed;opacity:.45}
   .afsana-wishlist-button{display:grid;place-items:center;min-height:48px;border:1px solid rgba(115,87,255,.19);border-radius:9px;background:#fff;color:#7357ff;transition:background .25s,transform .25s}
   .afsana-wishlist-button:hover{transform:translateY(-2px);background:#f1eafb}
   .afsana-product-perks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:18px}
   .afsana-product-perk{display:flex;align-items:flex-start;gap:8px;padding:12px 10px;border:1px solid rgba(115,87,255,.1);border-radius:10px;background:rgba(255,255,255,.65)}
   .afsana-product-perk>span{color:#a58bc8;font-family:Georgia,serif;font-size:12px}
   .afsana-product-perk p{min-width:0;margin:0}
   .afsana-product-perk strong{display:block;color:#443451;font-family:var(--font-display,Georgia,serif);font-size:14px;font-weight:700;line-height:1.1}
   .afsana-product-perk small{display:block;margin-top:4px;color:#92889b;font-size:7px;line-height:1.4}
   .afsana-product-specs{margin-top:23px}
   .afsana-specs-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px;color:#3b2b4d;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
   .afsana-specs-heading small{color:#aa9fb2;font-size:7px;letter-spacing:.17em}
   .afsana-specs-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
   .afsana-spec-card{min-width:0;padding:11px 12px;border:1px solid rgba(61,43,81,.09);border-radius:9px;background:rgba(255,255,255,.54)}
   .afsana-spec-card span{display:block;color:#a398ad;font-size:7px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
   .afsana-spec-card strong{display:block;margin-top:5px;overflow-wrap:anywhere;color:#4a3a58;font-size:10px;font-weight:700;line-height:1.45}
   @media(max-width:600px){.afsana-product-info{padding:20px 15px;border-radius:16px}.afsana-product-title{font-size:clamp(44px,12vw,62px)!important}.afsana-product-description{font-size:12px!important}.afsana-product-purchase{padding:16px 13px}.afsana-stock-status{font-size:7px;padding:7px 8px}.afsana-product-actions{grid-template-columns:72px minmax(0,1fr) 42px;gap:6px}.afsana-add-to-bag{padding:0 12px;font-size:7px;letter-spacing:.13em}.afsana-wishlist-button{min-height:45px}.afsana-product-perks{gap:5px}.afsana-product-perk{gap:5px;padding:10px 7px}.afsana-product-perk>span{font-size:10px}.afsana-product-perk strong{font-size:12px}.afsana-product-perk small{font-size:6px}.afsana-specs-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
   @keyframes afsanaBottleIn{from{opacity:0;transform:translateY(28px) rotateY(-13deg) scale(.94)}to{opacity:1;transform:translateY(0) rotateY(0) scale(1)}}
   /* Two editorial product-detail sections: note pyramid + related collection */
   .afsana-note-story{position:relative;isolation:isolate;overflow:hidden;width:100vw;margin-left:calc(50% - 50vw);padding:clamp(76px,8vw,118px) clamp(18px,5vw,76px);color:#f8f4fb;background:radial-gradient(ellipse at 8% 10%,rgba(133,89,196,.3),transparent 32%),radial-gradient(ellipse at 92% 82%,rgba(188,145,91,.16),transparent 32%),linear-gradient(130deg,#100b1b 0%,#1b1230 50%,#0b0912 100%)}
   .afsana-note-story:before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.24;background:repeating-linear-gradient(115deg,transparent 0 74px,rgba(255,255,255,.08) 75px,transparent 76px 150px)}
   .afsana-note-story:after{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,#d3ad7b 35%,#b69add 65%,transparent)}
   .afsana-note-story-inner{max-width:1500px;margin:0 auto}
   .afsana-note-story-head{position:relative;display:grid;grid-template-columns:1.05fr .65fr;align-items:end;gap:34px;margin-bottom:clamp(42px,5vw,68px)}
   .afsana-note-kicker,.afsana-complete-kicker{display:flex;align-items:center;gap:12px;color:#d9bc96;font-size:9px;font-weight:700;letter-spacing:.34em}
   .afsana-note-kicker:before,.afsana-complete-kicker:before{content:"";width:34px;height:1px;background:#d9bc96}
   .afsana-note-story-head h2,.afsana-complete-story-head h2{margin:22px 0 0;font-family:var(--font-display,Georgia,serif);font-size:clamp(54px,7.2vw,108px);font-weight:400;line-height:.86;letter-spacing:-.06em;color:#fff}
   .afsana-note-story-head,.afsana-note-story-head>div,.afsana-note-story-head h2,.afsana-note-story-head p{background:transparent!important;box-shadow:none!important;border:0!important}
   .storefront-theme .afsana-note-story{background:radial-gradient(ellipse at 8% 10%,rgba(133,89,196,.3),transparent 32%),radial-gradient(ellipse at 92% 82%,rgba(188,145,91,.16),transparent 32%),linear-gradient(130deg,#100b1b 0%,#1b1230 50%,#0b0912 100%)!important}
   .storefront-theme .afsana-note-story-head,.storefront-theme .afsana-note-story-head>div,.storefront-theme .afsana-note-story-head h2,.storefront-theme .afsana-note-story-head p{background-color:transparent!important;background-image:none!important;box-shadow:none!important}

   .afsana-note-story-head{padding:0!important}
   .afsana-note-story-head h2{display:block!important;max-width:920px;margin:21px 0 0!important;padding:0!important;color:#fff!important;font-size:clamp(64px,8.4vw,126px)!important;line-height:.83!important;letter-spacing:-.075em!important;text-shadow:0 12px 40px rgba(0,0,0,.28)}
   .afsana-note-story-head h2 em{display:inline-block;margin-top:8px;background:linear-gradient(100deg,#efd7ad 0%,#fff0d5 38%,#c2a4e9 78%,#e1c5a1 100%);-webkit-background-clip:text;background-clip:text;color:transparent!important;font-size:1.06em!important;text-shadow:none}
   .afsana-note-kicker{color:#e7c99d!important;letter-spacing:.38em!important;font-size:9px!important}
   .afsana-note-kicker:before{width:44px!important;background:linear-gradient(90deg,#c9a476,#d1b5ee)!important}
   @media(max-width:600px){.afsana-note-story-head h2{font-size:clamp(57px,14vw,82px)!important;line-height:.86!important}}
   .afsana-note-story-head h2 em,.afsana-complete-story-head h2 em{color:#d6b88f;font-weight:400;font-style:italic}
   .afsana-note-intro{max-width:410px;margin:0 0 5px;color:rgba(248,244,251,.66);font-size:13px;line-height:2.1;letter-spacing:.02em}
   .afsana-note-edition{position:absolute;right:0;top:0;color:rgba(246,228,203,.48);font-size:8px;letter-spacing:.25em}
   .afsana-note-story-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
   .afsana-note-card{position:relative;isolation:isolate;overflow:hidden;display:flex;flex-direction:column;min-height:340px;padding:clamp(24px,3vw,40px);border:1px solid rgba(224,197,164,.23);border-radius:8px;background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.018));box-shadow:0 20px 55px rgba(0,0,0,.2);transition:transform .55s cubic-bezier(.2,.8,.2,1),border-color .45s,background .45s}
   .afsana-note-card:after{content:"";position:absolute;right:-22%;bottom:-35%;z-index:-1;width:75%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(192,157,224,.19),transparent 67%);transition:transform .8s}
   .afsana-note-card:hover{transform:translateY(-9px);border-color:rgba(226,194,151,.7);background:linear-gradient(145deg,rgba(255,255,255,.11),rgba(255,255,255,.025))}
   .afsana-note-card:hover:after{transform:scale(1.25)}
   .afsana-note-card-top{display:flex;justify-content:space-between;gap:10px;color:#cfb28f;font-size:8px;font-weight:700;letter-spacing:.22em}
   .afsana-note-card-rule{width:100%;height:1px;margin:24px 0 28px;background:linear-gradient(90deg,rgba(218,187,145,.72),rgba(218,187,145,.05))}
   .afsana-note-card-overline{color:rgba(246,228,203,.68);font-size:8px;font-weight:700;letter-spacing:.2em}
   .afsana-note-card h3{margin:11px 0 0;font-family:var(--font-display,Georgia,serif);font-size:clamp(30px,3.2vw,48px);font-weight:400;line-height:1;color:#fff;letter-spacing:-.035em}
   .afsana-note-card-copy{margin:13px 0 0;color:rgba(248,244,251,.55);font-size:11px;line-height:1.8}
   .afsana-note-pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:auto;padding-top:28px}
   .afsana-note-pills span{padding:8px 11px;border:1px solid rgba(234,211,180,.2);border-radius:30px;background:rgba(255,255,255,.045);color:#f2e3d0;font-size:9px;letter-spacing:.04em}
   .afsana-note-card-index{position:absolute;right:22px;top:45%;font-family:Georgia,serif;font-size:92px;line-height:1;color:rgba(255,255,255,.035);pointer-events:none}
   .afsana-complete-story{position:relative;margin:clamp(76px,9vw,128px) 0 clamp(30px,4vw,64px);padding:0 0 10px}
   .afsana-complete-story-head{display:flex;align-items:end;justify-content:space-between;gap:35px;margin-bottom:clamp(32px,4vw,55px);padding-bottom:30px;border-bottom:1px solid rgba(115,87,255,.2)}
   .afsana-complete-kicker{color:#8060bd}
   .afsana-complete-kicker:before{background:#8060bd}
   .afsana-complete-story-head h2{color:#171023;font-size:clamp(54px,7vw,100px)}
   .afsana-complete-story-head h2 em{color:#7357ff}
   .afsana-complete-story-aside{max-width:360px;padding-bottom:6px}
   .afsana-complete-story-aside p{color:#70677b;font-size:12px;line-height:2}
   .afsana-complete-story-link{display:inline-flex;align-items:center;gap:16px;margin-top:20px;padding-bottom:9px;border-bottom:1px solid #9f83cb;color:#4e3676;font-size:8px;font-weight:700;letter-spacing:.19em;transition:gap .3s,color .3s}
   .afsana-complete-story-link:hover{gap:23px;color:#7357ff}
   .afsana-complete-story-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px!important;margin-top:0!important}
   .afsana-related-item{position:relative;min-width:0;padding:10px;border:1px solid rgba(115,87,255,.12);border-radius:17px;background:linear-gradient(155deg,#fff,#f6f2fb);box-shadow:0 12px 38px rgba(37,21,62,.055);transition:transform .45s,box-shadow .45s,border-color .45s}
   .afsana-related-item:hover{transform:translateY(-7px);border-color:rgba(115,87,255,.33);box-shadow:0 22px 52px rgba(37,21,62,.12)}
   .afsana-related-number{position:absolute;top:17px;left:17px;z-index:4;display:grid;place-items:center;width:29px;height:29px;border:1px solid rgba(115,87,255,.2);border-radius:50%;background:rgba(255,255,255,.84);color:#7357ff;font-size:8px;letter-spacing:.08em;backdrop-filter:blur(10px)}
   .afsana-complete-story-grid .product-card-stage{border-radius:12px!important;background:radial-gradient(circle at 50% 24%,rgba(151,119,204,.17),transparent 34%),linear-gradient(145deg,#f8f5fb,#eee8f5)!important}
   .afsana-complete-story-grid .product-card-stage img{border-radius:12px}
   .afsana-complete-story-grid .group h3{font-family:var(--font-display,Georgia,serif);font-size:21px;color:#211730}
   .afsana-complete-story-grid .group p{color:#8060bd}
   .afsana-complete-story-grid .group>a>div:last-child{padding:0 5px 6px}
   .afsana-complete-story-grid .group>a{display:block}
   @media(max-width:900px){.afsana-note-story-head{grid-template-columns:1fr}.afsana-note-edition{top:4px}.afsana-note-intro{max-width:580px}.afsana-note-story-grid{gap:9px}.afsana-note-card{min-height:315px;padding:24px}.afsana-complete-story-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
   @media(max-width:600px){.afsana-note-story{padding:64px 16px}.afsana-note-story-head{gap:20px;margin-bottom:30px}.afsana-note-story-head h2,.afsana-complete-story-head h2{font-size:clamp(48px,13vw,72px)}.afsana-note-edition{position:static;margin-top:0;font-size:7px}.afsana-note-story-grid{grid-template-columns:1fr;gap:10px}.afsana-note-card{min-height:265px;padding:25px}.afsana-note-card-rule{margin:17px 0 21px}.afsana-note-pills{padding-top:20px}.afsana-note-card-index{font-size:78px}.afsana-complete-story{margin:70px 0 25px}.afsana-complete-story-head{display:block;margin-bottom:24px;padding-bottom:23px}.afsana-complete-story-aside{margin-top:20px}.afsana-complete-story-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px!important}.afsana-related-item{padding:7px;border-radius:12px}.afsana-related-number{top:12px;left:12px;width:25px;height:25px}.afsana-complete-story-grid .group h3{font-size:16px}.afsana-complete-story-grid .product-card-stage{border-radius:8px!important}}
   @media(prefers-reduced-motion:reduce){.afsana-note-card,.afsana-related-item,.afsana-complete-story-link{transition:none}}

   model-viewer{--poster-color:transparent;--progress-bar-color:#7357ff;--progress-mask:#f2eef8}
   @media(max-width:980px){.product-detail-grid{grid-template-columns:minmax(0,1fr);gap:42px}.product-gallery{grid-template-columns:64px minmax(0,1fr)}.main-product-stage{height:clamp(560px,78vw,720px)}}
   @media(max-width:600px){.product-detail-grid{margin-top:22px}.product-gallery{display:flex;flex-direction:column;gap:12px}.main-product-stage{order:1;width:100%;height:clamp(480px,130vw,620px);min-height:480px;border-radius:16px}.gallery-thumbs{order:2;flex-direction:row;width:100%;max-height:none;overflow-x:auto;overflow-y:hidden;padding:2px 0 7px}.gallery-thumbs button{width:60px;min-width:60px}.afsana-bottle-preview{min-height:350px;height:76%;width:74%}.afsana-bottle-label{gap:5px}.afsana-bottle-label strong{font-size:18px}}
   @media(prefers-reduced-motion:reduce){.afsana-bottle-preview{animation:none}}
  `}</style>
  <StateBox loading={loading} error={error?.status===404?{message:'This perfume could not be found.'}:error} onRetry={reload}>{p&&<>
   <div className="text-[9px] uppercase tracking-[.28em] text-[#5f654f]"><Link to="/" className="hover:text-[#263e0e]">{t("homeCrumb")}</Link> <span>/</span> <Link to="/shop" className="hover:text-[#263e0e]">{t("collectionCrumb")}</Link> <span>/</span> {p.name}</div>
   <div className="product-detail-grid mt-8">
    <div className={"product-gallery "+(media.length>1?"has-thumbs":"no-thumbs")}>
      {media.length>1&&<div className="gallery-thumbs">{media.map((m,i)=><button type="button" key={m.url+'-'+i} onClick={()=>selectMedia(i)} aria-label={t('mediaAlt')+' '+(i+1)} className={'group relative w-[72px] aspect-square overflow-hidden border '+(i===img?'border-[#7357ff] shadow-[0_8px_25px_rgba(50,26,90,.18)]':'border-[#7357ff]/15')}><Media item={m} alt="" className="w-full h-full object-cover transition duration-500 group-hover:scale-105"/>{i===img&&<span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#7357ff]"/>}</button>)}</div>}
      <div ref={stageRef} onPointerMove={(e)=>{onMove(e);moveDrag(e)}} onPointerDown={beginDrag} onPointerUp={endDrag} onPointerLeave={()=>{resetTilt();endDrag()}} onTouchStart={beginDrag} onTouchMove={moveDrag} onTouchEnd={endDrag} className="main-product-stage relative overflow-hidden flex items-center justify-center">
       <div className="afsana-product-stage-glow"/>
       <div className="absolute top-5 left-5 z-10 text-[8px] uppercase tracking-[.25em] text-[#665d79]">{t("galleryLabel")} {String(img+1).padStart(2,"0")}</div>
       <div className="absolute top-5 right-5 z-10 flex items-center gap-2 border border-[#7357ff]/15 bg-white/70 px-3 py-2 backdrop-blur-sm text-[8px] uppercase tracking-[.18em] text-[#46375f]"><Rotate3D className="w-3.5 h-3.5"/> {showRealModel?t('modelReady'):product3dUrl?t('modelLoading'):media.length?t('interactiveView'):t('bottlePreview')}</div>
       {media.length>1&&<button type="button" onClick={()=>setAutoRotate(v=>!v)} className="absolute top-16 right-5 z-10 border border-[#7357ff]/15 bg-white/75 px-3 py-2 backdrop-blur text-[8px] uppercase tracking-[.18em] text-[#392650]">{autoRotate?t('stopGallery'):t('autoGallery')}</button>}
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
    <div className="afsana-product-info">
      <div className="afsana-product-info-topline">
       <span className="afsana-product-eyebrow">{p.fragrance?.gender||'Signature'}</span>
       {p.fragrance?.concentration&&<span className="afsana-product-concentration">{p.fragrance.concentration}</span>}
       <span className="afsana-product-ref">{t("productReference")}</span>
      </div>
      <h1 className="afsana-product-title">{p.name}</h1>
      <div className="afsana-product-rating">
       {ratingCount>0
        ? <><Stars value={ratingAvg} size="text-lg"/><span>{ratingAvg.toFixed(1)} / 5</span><i/> <span>{ratingCount} approved {ratingCount===1?t('reviewSingular'):t('reviewPlural')}</span></>
        : <><span className="afsana-rating-empty">{t("ratingEmpty")}</span><i/><span>{t("noReviews")}</span></>}
      </div>
      <p className="afsana-product-description">{p.content?.shortDescription||(copy.productDescription || 'A fragrance composed to become part of your identity — luminous, sophisticated and designed to leave a trace.')}</p>
      <div className="afsana-product-purchase">
       <div className="afsana-product-price-row">
        <div><span className="afsana-product-price-label">{t("priceLabel")}</span><strong className="afsana-product-price">{v?money(price):t('unavailable')}</strong></div>
        {v?.available>0&&<span className="afsana-stock-status"><i/>{v.available<5?t("limitedStock"):t("inStock")}<small>{t("readyToShip")}</small></span>}
       </div>
       <div className="afsana-product-divider"/>
       <div className="afsana-size-heading"><span>{t("sizeHeading")}</span><small>{v?.label|| (v?.sizeMl ? v.sizeMl+' ML' : t('selectSize'))}</small></div>
       <div className="afsana-size-options">{variants.map(x=><button type="button" key={x.id} onClick={()=>{setVid(x.id);setQty(1)}} aria-pressed={x.id===vid} className={'afsana-size-option '+(x.id===vid?'is-selected':'')}>{x.label||x.sizeMl+' ML'}<span>{x.id===vid?t('selectedSize'):t('chooseSize')}</span></button>)}</div>
       <div className="afsana-product-actions">
        <div className="afsana-quantity-wrap"><span>{t("quantityLabel")}</span><QtyStepper value={qty} onChange={setQty} max={v?.available||1}/></div>
        <button disabled={soldOut} onClick={addToCart} className={"afsana-add-to-bag "+(adding?"add-bag-success":"")}>{adding ? t("addedToBag") : <>{t("addToBag")} <span>↗</span></>}</button>
        <button type="button" onClick={()=>toggle(p.id||p._id)} aria-label={has(p.id||p._id)?t('removeWishlist'):t('addWishlist')} aria-pressed={has(p.id||p._id)} className="afsana-wishlist-button"><Heart fill={has(p.id||p._id)?'currentColor':'none'} className="w-4 h-4"/></button>
       </div>
      </div>
      <div className="afsana-product-perks">{[['01',t('perk1Title'),t('perk1Text')],['02',t('perk2Title'),t('perk2Text')],['03',t('perk3Title'),t('perk3Text')]].map(([n,a,b])=><div className="afsana-product-perk" key={n}><span>{n}</span><p><strong>{a}</strong><small>{b}</small></p></div>)}</div>
      <div className="afsana-product-specs">
       <div className="afsana-specs-heading"><span>{t("profileHeading")}</span><small>{t("profileDetails")}</small></div>
       <div className="afsana-specs-grid">{[['Longevity',p.fragrance?.longevity],['Projection',p.fragrance?.projection],['Concentration',p.fragrance?.concentration],['Gender',p.fragrance?.gender],['Season',p.fragrance?.seasons?.join(', ')],['Occasion',p.fragrance?.occasions?.join(', ')]].filter(([,value])=>value).map(([label,value])=><div key={label} className="afsana-spec-card"><span>{label}</span><strong>{value}</strong></div>)}</div>
      </div>
    </div>
   </div>
   <section className="notes-section afsana-note-story mt-24">
    <div className="afsana-note-story-inner">
     <header className="afsana-note-story-head">
      <div>
       <p className="afsana-note-kicker">{t("storyKicker")}</p>
       <h2>{t("storyHeading")}<br/><em>{t("storyHeadingAccent")}</em></h2>
      </div>
      <p className="afsana-note-intro">{t("storyIntro")}</p>
      <span className="afsana-note-edition">AFSANA / SCENT PROFILE</span>
     </header>
     <div className="afsana-note-story-grid">
      {[
       ['TOP',t('openingOverline'),t('openingDescription'),ns.top],
       ['HEART',t('heartOverline'),t('heartDescription'),ns.heart],
       ['BASE',t('memoryOverline'),t('memoryDescription'),ns.base]
      ].map(([label,title,copy,values],i)=><article key={label} className={'afsana-note-card afsana-note-card-'+label.toLowerCase()}>
       <div className="afsana-note-card-top"><span>0{i+1} / 03</span><span>{label} NOTES</span></div>
       <div className="afsana-note-card-rule"/>
       <p className="afsana-note-card-overline">{title}</p>
       <h3>{label==='TOP'?t('openingTitle'):label==='HEART'?t('heartTitle'):t('memoryTitle')}</h3>
       <p className="afsana-note-card-copy">{copy}</p>
       <div className="afsana-note-pills">{(values||[]).length?(values||[]).map((note,j)=><span key={note+'-'+j}>{note}</span>):<span>{t("fallbackNote")}</span>}</div>
       <span className="afsana-note-card-index">{label==='TOP'?'01':label==='HEART'?'02':'03'}</span>
      </article>)}
     </div>
    </div>
   </section>
   <section className="afsana-product-rituals py-16 sm:py-20"><div className="afsana-product-rituals-head mb-10 sm:mb-12"><div className="text-[9px] uppercase tracking-[.35em] text-[#263e0e]">{t("insideBottle")}</div><h2 className="mt-5 font-display text-5xl sm:text-7xl">{t("moreThan")}<br/><em className="text-[#263e0e]">{t("moreThanAccent")}</em></h2></div><div className="product-banner-grid">{banners.map((src,i)=><article key={i} className="product-banner relative"><img src={src} className="w-full h-full object-cover" alt=""/><div className="absolute inset-0 bg-gradient-to-t from-[#182308]/85 to-transparent"/><div className="product-banner-copy absolute bottom-0 p-7 text-white"><div className="text-[9px] uppercase tracking-[.3em] text-[#b4bf41]">0{i+1} — {[t('chapterOpening'),t('chapterHeart'),t('chapterMemory'),t('chapterRitual')][i]}</div><h3 className="mt-2 font-display text-3xl">{[t('chapterOpeningTitle'),t('chapterHeartTitle'),t('chapterMemoryTitle'),t('chapterRitualTitle')][i]}</h3><p className="mt-2 text-xs text-white/60">{t("chapterCaption")}</p></div></article>)}</div></section>
   <section className="afsana-product-tabs py-12 sm:py-14 border-y"><div className="tabs flex flex-wrap gap-6 text-[10px] uppercase tracking-[.22em]">{[['story',t('storyTab')],['details',t('detailsTab')]].map(([id,label])=><button key={id} onClick={()=>setTab(id)} aria-pressed={tab===id} className={tab===id?'tab active text-[#263e0e] border-b border-[#263e0e] pb-3':'tab text-[#5f654f] pb-3'}>{label}</button>)}</div><div className="afsana-product-tab-content mt-8 max-w-3xl text-sm leading-8 text-[#5f654f]">{tab==='story'&&t('defaultStory')}{tab==='details'&&(p.content?.fullDescription||t('defaultDetails'))}</div></section>
   <ReviewsSection slug={slug}/>
   {data.related?.length>0&&<section className="afsana-complete-story">
     <div className="afsana-complete-story-head">
      <div>
       <p className="afsana-complete-kicker">{t("relatedKicker")} / 0{Math.min(data.related.length,9)}</p>
       <h2>{t("relatedHeading")}<br/><em>{t("relatedHeadingAccent")}</em></h2>
      </div>
      <div className="afsana-complete-story-aside">
       <p>Another scent. Another chapter. Discover a fragrance that feels unmistakably yours.</p>
       <Link to="/shop" className="afsana-complete-story-link">EXPLORE THE COLLECTION <span>↗</span></Link>
      </div>
     </div>
     <div className="product-grid afsana-complete-story-grid">{data.related.map((r,i)=><div className="afsana-related-item" key={r.id||r._id}><span className="afsana-related-number">0{i+1}</span><ProductCard product={r}/></div>)}</div>
    </section>}
  </>}</StateBox>
 </Container>;
}