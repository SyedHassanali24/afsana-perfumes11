import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useCart } from './CartContext';
import { useCustomer } from '../customer/CustomerAuthContext';
import CartDrawer from './CartDrawer';
import { Container } from './ui';
import useApi from '../hooks/useApi';
import { cmsPublicApi } from '../services';

const ManagedCmsPage = lazy(() => import('./AfsanaSignatureHome').then((m) => ({ default: m.ManagedCmsPage })));
const defaultNav=[['/','Home'],['/shop','Collection'],['/discover','Scent finder'],['/journal','Journal'],['/about','The house'],['/gifting','Gifting']];

export default function ShopLayout(){
 const [showIntro,setShowIntro]=useState(false);
 const {count,openDrawer}=useCart(),{status}=useCustomer(),location=useLocation(),navigate=useNavigate(),isHome=location.pathname==='/',[menu,setMenu]=useState(false),[search,setSearch]=useState(false),[q,setQ]=useState('');
 const {data:cmsData}=useApi(()=>cmsPublicApi.content(),[]);
 const footerCms=(cmsData?.homepageSections||[]).find((s)=>s?.type==='footer_showcase')?.config||{};
 let previewLayout = null;
 try { if (new URLSearchParams(location.search).get('afsanaPreview') === '1') previewLayout = JSON.parse(localStorage.getItem('afsana_cms_preview_v2') || 'null'); } catch {}
 const footerPreview = Array.isArray(previewLayout?.layouts?.site_footer) || (new URLSearchParams(location.search).get('afsanaPreview') === '1' && new URLSearchParams(location.search).get('afsanaPageKey') === 'site_footer');
 const hasManagedFooter = footerPreview || (cmsData?.managedPageKeys || []).includes('site_footer');
 let navigationSections = cmsData?.pageSections?.site_navigation || [];
 try {
   const query = new URLSearchParams(location.search);
   if (query.get('afsanaPreview') === '1') {
     const preview = previewLayout || JSON.parse(localStorage.getItem('afsana_cms_preview_v2') || 'null');
     if (Array.isArray(preview?.layouts?.site_navigation)) navigationSections = preview.layouts.site_navigation;
     else if (query.get('afsanaPageKey') === 'site_navigation' && Array.isArray(preview?.sections)) navigationSections = preview.sections;
   }
 } catch {}
 const navConfig = navigationSections.find((s) => s.type === 'nav_menu')?.config || {};
 const navigation = navConfig.items;
 const nav = Array.isArray(navigation) && navigation.length
   ? navigation.map((item) => [item.text || '/', item.title || '']).filter(([to,label]) => to.startsWith('/') && label)
   : defaultNav;
 const logoUrl = String(navConfig.logoUrl || '').trim();
 const brandName = navConfig.brandName || 'AFSANA';
 const brandTagline = navConfig.tagline || 'THE ART OF SCENT';

 useEffect(()=>{setMenu(false)},[location.pathname,location.search]);
 useEffect(()=>{let timer;try{if(!sessionStorage.getItem('afsana-reference-intro-v1')){sessionStorage.setItem('afsana-reference-intro-v1','seen');setShowIntro(true);timer=window.setTimeout(()=>setShowIntro(false),1650);}}catch{}return()=>{if(timer)window.clearTimeout(timer)};},[]);
 useEffect(()=>{if(!search)return;const onKey=e=>{if(e.key==='Escape')setSearch(false)};document.addEventListener('keydown',onKey);const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=prev}},[search]);

 const submit=e=>{e.preventDefault();navigate(q.trim()?'/shop?q='+encodeURIComponent(q.trim()):'/shop');setSearch(false)};
 const icon='icon-btn grid h-10 w-10 place-items-center text-[#100d24]/85 hover:text-[#7357ff] transition focus:outline-none';

 return <div className="storefront-theme min-h-screen bg-[#f7f4ed] text-[#100d24]">
  {showIntro && <div className="afsana-ref-intro" aria-label="AFSANA — Scent, Reimagined"><div><div className="afsana-ref-intro-mark">AFSANA<span>.</span></div><div className="afsana-ref-intro-line"/><div className="afsana-ref-intro-copy">SCENT, REIMAGINED</div></div></div>}

  <div className="overflow-hidden border-b border-[#100d24]/10 bg-[#d9ff55] text-[#100d24]">
    <div className="marquee-track flex min-w-max items-center gap-8 py-2.5">{Array.from({length:2}).flatMap(() => [cmsData?.announcement?.text || 'COMPLIMENTARY DELIVERY ON ORDERS ABOVE PKR 7,500','DISCOVER YOUR SIGNATURE','CRAFTED FOR MEMORIES','THE AFSANA PRIVATE COLLECTION']).map((x,i)=><span key={i} className="flex items-center gap-8 text-[8px] uppercase tracking-[.3em]">AFSANA <b className="text-[#7357ff]">•</b>{x}<b className="text-[#7357ff]">•</b></span>)}</div>
  </div>

  <header className="sticky top-0 z-40 text-[#100d24]">
   <div className="absolute inset-0 border-b border-[#100d24]/10 bg-[#f7f4ed]/92 backdrop-blur-xl shadow-[0_10px_40px_rgba(16,13,36,.07)]"/>
   <Container className="container-xl relative flex h-[84px] items-center">
    <button className={'md:hidden '+icon} onClick={()=>setMenu(!menu)} aria-label="Menu" aria-expanded={menu} aria-controls="mobile-navigation">{menu?<X/>:<Menu/>}</button>
    <Link to="/" className="logo group flex shrink-0 items-center gap-3" aria-label={brandName}>
      <span className="grid h-[31px] w-[31px] place-items-center overflow-hidden rounded-full bg-[#100d24]">{logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-contain" onError={(e)=>{e.currentTarget.style.display='none';}}/> : <span className="font-display text-[19px] italic text-[#d9ff55]">A</span>}</span>
      <span className="block font-display text-[20px] tracking-[.17em] text-[#100d24]">{brandName}<small className="mt-[1px] block font-mono text-[8px] tracking-[.32em] text-[#80798f]">{brandTagline}</small></span>
    </Link>
    <nav className="main-nav hidden md:flex items-center gap-8 ml-14">{nav.map(([to,label])=><NavLink key={to} to={to} end={to==='/' } className={({isActive})=>'py-7 text-[10px] uppercase tracking-[.13em] transition '+(isActive?'text-[#7357ff]':'text-[#514b62] hover:text-[#100d24]')}>{label}</NavLink>)}</nav>
    <div className="header-actions ml-auto flex items-center">
      <button className={icon} onClick={()=>setSearch(true)} aria-label="Search" aria-expanded={search}><Search className="w-[18px]"/></button>
      <Link className={icon} to={status==='authed'?'/account':'/login'} aria-label={status==='authed'?'My account':'Login / register'} title={status==='authed'?'My account':'Login / register'}><User className="w-[18px]"/></Link>
      <button className={icon+' relative'} onClick={openDrawer} aria-label="Cart"><ShoppingBag className="w-[18px]"/>{count>0&&<span className="absolute right-0 top-1 min-w-4 h-4 rounded-full bg-[#d9ff55] text-[#100d24] text-[9px] leading-4 text-center">{count}</span>}</button>
    </div>
   </Container>
   {menu&&<div id="mobile-navigation" className="relative md:hidden border-t border-[#100d24]/10 bg-[#f7f4ed]"><nav className="grid grid-cols-2 p-5">{nav.map(([to,label])=><Link key={to} onClick={()=>setMenu(false)} to={to} className="border-b border-[#100d24]/10 py-4 text-[10px] uppercase tracking-[.2em] text-[#514b62] hover:text-[#7357ff]">{label}</Link>)}</nav></div>}
  </header>

  <Suspense fallback={null}><ManagedCmsPage pageKey="site_header_after" /></Suspense>
  <main className={isHome?'':'py-0'}><Outlet/></main>
  <Suspense fallback={null}><ManagedCmsPage pageKey="site_footer_before" /></Suspense>

  {hasManagedFooter ? <Suspense fallback={null}><ManagedCmsPage pageKey="site_footer" /></Suspense> :
  <footer className="relative overflow-hidden bg-[#100d24] text-white border-t border-[#d9ff55]/20">
   <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_18%,rgba(115,87,255,.24),transparent_26%),radial-gradient(circle_at_88%_72%,rgba(217,255,85,.08),transparent_28%)]"/>
   <div className="relative">
    <div className="border-b border-white/10 overflow-hidden"><div className="marquee-track flex min-w-max gap-12 py-3 text-[9px] uppercase tracking-[.32em] text-white/35">{['THE ART OF SCENT','CRAFTED FOR MEMORIES','AFSANA PERFUMES','LEAVE A TRACE','THE PRIVATE COLLECTION','THE ART OF SCENT'].map((x,i)=><span key={i}>{x}<b className="mx-12 text-[#d9ff55]">✦</b></span>)}</div></div>
    <Container className="container-xl py-16 sm:py-24">
      <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-12 pb-14 border-b border-white/10">
        <div>
          <p className="text-[9px] uppercase tracking-[.4em] text-[#d9ff55]">{footerCms.eyebrow||'THE HOUSE OF AFSANA'}</p>
          <div className="mt-5 font-display text-[clamp(5rem,14vw,11rem)] leading-[.68] tracking-[-.07em]">AFSANA</div>
          <p className="mt-10 max-w-xl font-display text-2xl sm:text-4xl leading-tight text-white/90">{footerCms.body||'Fragrance as memory. Designed in chapters. Created to leave a trace.'}</p>
        </div>
        <div className="self-end rounded-3xl border border-[#d9ff55]/20 bg-white/[.035] p-6 sm:p-8 backdrop-blur-xl">
          <p className="text-[9px] uppercase tracking-[.28em] text-[#d9ff55]">{footerCms.offerLabel||'THE FINAL NOTE'}</p>
          <h3 className="mt-4 font-display text-3xl">{footerCms.offerText||'Discover the scent that feels like you.'}</h3>
          <Link to={footerCms.buttonLink||'/shop'} className="mt-7 inline-flex items-center gap-2 bg-[#d9ff55] px-6 py-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#100d24] hover:bg-white transition">{footerCms.buttonText||'Explore Collection'}<span>↗</span></Link>
        </div>
      </div>
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] py-14">
        <div><div className="text-[9px] uppercase tracking-[.3em] text-white/35">Afsana / Contact</div><p className="mt-5 text-sm leading-7 text-white/55">For fragrance questions, gifting help and order support, visit your account or explore the collection.</p><Link to="/account" className="inline-flex mt-6 text-[10px] uppercase tracking-[.2em] text-[#d9ff55]">Customer care ↗</Link></div>
        <div><h4 className="text-[9px] uppercase tracking-[.28em] text-[#d9ff55]">Explore</h4><div className="mt-5 space-y-3 text-sm text-white/55"><Link className="block hover:text-white transition" to="/shop">Collection</Link><Link className="block hover:text-white transition" to="/about">The House</Link><Link className="block hover:text-white transition" to="/journal">Journal</Link><Link className="block hover:text-white transition" to="/gifting">Gifting</Link></div></div>
        <div><h4 className="text-[9px] uppercase tracking-[.28em] text-[#d9ff55]">Customer</h4><div className="mt-5 space-y-3 text-sm text-white/55"><Link className="block hover:text-white transition" to="/track">Track order</Link><Link className="block hover:text-white transition" to="/account">Account</Link><Link className="block hover:text-white transition" to="/shop">Fragrance care</Link><Link className="block hover:text-white transition" to="/gifting">Gift guide</Link></div></div>
        <div><h4 className="text-[9px] uppercase tracking-[.28em] text-[#d9ff55]">Follow the house</h4><div className="mt-5 flex flex-wrap gap-2"><a className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase tracking-[.18em] text-white/55 hover:border-[#d9ff55] hover:text-[#d9ff55] transition" href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a><a className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase tracking-[.18em] text-white/55 hover:border-[#d9ff55] hover:text-[#d9ff55] transition" href="https://www.tiktok.com/" target="_blank" rel="noreferrer">TikTok</a><a className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase tracking-[.18em] text-white/55 hover:border-[#d9ff55] hover:text-[#d9ff55] transition" href="https://www.pinterest.com/" target="_blank" rel="noreferrer">Pinterest</a><a className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase tracking-[.18em] text-white/55 hover:border-[#d9ff55] hover:text-[#d9ff55] transition" href="https://www.facebook.com/" target="_blank" rel="noreferrer">Facebook</a></div></div>
      </div>
      <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-[8px] uppercase tracking-[.22em] text-white/25"><span>© 2026 AFSANA PERFUMES</span><span>PRIVACY · TERMS · COOKIES</span><span>THE ART OF SCENT</span></div>
    </Container>
   </div>
  </footer>}

  {search&&<div className="fixed inset-0 z-[65] bg-[#100d24]/98 backdrop-blur-xl text-white overflow-y-auto">
    <Container className="container-xl min-h-full py-8 md:py-12">
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <div><div className="text-[9px] uppercase tracking-[.35em] text-[#d9ff55]">The Afsana search</div><h2 className="font-display text-4xl md:text-6xl mt-3">Search Afsana</h2></div>
        <button className="icon-btn" onClick={()=>setSearch(false)} aria-label="Close search" autoFocus><X/></button>
      </div>
      <form onSubmit={submit} className="mt-14 border-b border-white/25 flex items-center">
        <Search className="w-5 h-5 text-[#d9ff55]"/>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search fragrances..." className="w-full bg-transparent px-5 py-6 font-display text-4xl md:text-6xl outline-none placeholder:text-white/20"/>
        <button className="text-[9px] uppercase tracking-[.25em] text-[#d9ff55]" type="submit">Search</button>
      </form>
      <div className="mt-14 grid gap-10 md:grid-cols-3">
        <div><div className="text-[9px] uppercase tracking-[.35em] text-[#d9ff55]">Popular paths</div><div className="mt-5 space-y-3">
          {['Signature','Oud','Floral','Fresh'].map(x=><button key={x} type="button" onClick={()=>{setQ(x);navigate('/shop?category='+x.toLowerCase());setSearch(false)}} className="block text-left font-display text-3xl hover:text-[#d9ff55]">{x}</button>)}
        </div></div>
        <div className="md:col-span-2 border-l border-white/10 md:pl-10">
          <div className="text-[9px] uppercase tracking-[.35em] text-[#d9ff55]">Find your ritual</div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {['Discover your signature','Choose a gift','Explore the collection'].map((x,i)=><button key={x} type="button" onClick={()=>{setSearch(false);navigate(i===0?'/discover':i===1?'/gifting':'/shop')}} className="border border-white/10 p-5 text-left hover:border-[#d9ff55] transition"><span className="text-[9px] uppercase tracking-[.18em] text-[#d9ff55]">0{i+1}</span><span className="block mt-8 font-display text-2xl">{x}</span></button>)}
          </div>
        </div>
      </div>
    </Container>
  </div>}

  <CartDrawer/>
 </div>;
}
