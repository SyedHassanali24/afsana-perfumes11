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
 return <Container className="pt-10 sm:pt-16 pb-24">
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
   <div className="text-[9px] uppercase tracking-[.28em] text-[#5f654f]"><Link to="/" className="hover:text-[#263e0e]">Home</Link> <span>/</span> <Link to="/shop" className="hover:text-[#263e0e]">Collection</Link> <span>/</span> {p.name}</div>
   <div className="product-detail-grid mt-8">
    <div className={"product-gallery "+(media.length>1?"has-thumbs":"no-thumbs")}>
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
   <section className="notes-section afsana-note-story mt-24">
    <div className="afsana-note-story-inner">
     <header className="afsana-note-story-head">
      <div>
       <p className="afsana-note-kicker">THE ARCHITECTURE OF A SCENT</p>
       <h2>Three chapters.<br/><em>One memory.</em></h2>
      </div>
      <p className="afsana-note-intro">A fragrance reveals itself in its own time. An unforgettable opening, a character at its heart, and a final trace that stays with you.</p>
      <span className="afsana-note-edition">AFSANA / SCENT PROFILE</span>
     </header>
     <div className="afsana-note-story-grid">
      {[
       ['TOP','THE FIRST IMPRESSION','The opening that draws you in.',ns.top],
       ['HEART','THE SOUL OF THE SCENT','The character that makes it yours.',ns.heart],
       ['BASE','THE LASTING MEMORY','The warm trail that lingers.',ns.base]
      ].map(([label,title,copy,values],i)=><article key={label} className={'afsana-note-card afsana-note-card-'+label.toLowerCase()}>
       <div className="afsana-note-card-top"><span>0{i+1} / 03</span><span>{label} NOTES</span></div>
       <div className="afsana-note-card-rule"/>
       <p className="afsana-note-card-overline">{title}</p>
       <h3>{label==='TOP'?'The opening.':label==='HEART'?'The character.':'The memory.'}</h3>
       <p className="afsana-note-card-copy">{copy}</p>
       <div className="afsana-note-pills">{(values||[]).length?(values||[]).map((note,j)=><span key={note+'-'+j}>{note}</span>):<span>Signature accord</span>}</div>
       <span className="afsana-note-card-index">{label==='TOP'?'01':label==='HEART'?'02':'03'}</span>
      </article>)}
     </div>
    </div>
   </section>
   <section className="py-20"><div className="mb-12"><div className="text-[9px] uppercase tracking-[.35em] text-[#263e0e]">Inside the bottle</div><h2 className="mt-5 font-display text-5xl sm:text-7xl">More than<br/><em className="text-[#263e0e]">a fragrance.</em></h2></div><div className="product-banner-grid">{banners.map((src,i)=><article key={i} className="product-banner relative"><img src={src} className="w-full h-full object-cover" alt=""/><div className="absolute inset-0 bg-gradient-to-t from-[#182308]/85 to-transparent"/><div className="product-banner-copy absolute bottom-0 p-7 text-white"><div className="text-[9px] uppercase tracking-[.3em] text-[#b4bf41]">0{i+1} — {['The Opening','The Heart','The Memory','Your Ritual'][i]}</div><h3 className="mt-2 font-display text-3xl">{['First impressions matter.','Where the story unfolds.','What remains after you leave.','Make it unmistakably yours.'][i]}</h3><p className="mt-2 text-xs text-white/60">Spray. Layer. Wear. Remember.</p></div></article>)}</div></section>
   <section className="py-14 border-y border-[#263e0e]/10"><div className="tabs flex flex-wrap gap-8 text-[10px] uppercase tracking-[.22em]">{[['story','The Story'],['details','Details'],['reviews','Reviews']].map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'tab active text-[#263e0e] border-b border-[#263e0e] pb-3':'tab text-[#5f654f] pb-3'}>{label}</button>)}</div><div className="mt-8 max-w-3xl text-sm leading-8 text-[#5f654f]">{tab==='story'&&'A fragrance composed to become part of your identity. Spray it close to the skin, let it warm naturally, and allow each layer to reveal itself in its own time.'}{tab==='details'&&(p.content?.fullDescription||'Premium fragrance oils, carefully composed and designed for an evolving trail.')}{tab==='reviews'&&<ReviewsSection slug={slug}/>}</div></section>
   {data.related?.length>0&&<section className="afsana-complete-story">
     <div className="afsana-complete-story-head">
      <div>
       <p className="afsana-complete-kicker">CURATED FOR YOU / 0{Math.min(data.related.length,9)}</p>
       <h2>Complete<br/><em>the story.</em></h2>
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