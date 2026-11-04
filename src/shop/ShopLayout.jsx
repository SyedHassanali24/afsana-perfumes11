import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X, Instagram, Facebook, Youtube, Music2, Pin } from 'lucide-react';
import { useCart } from './CartContext';
import { useCustomer } from '../customer/CustomerAuthContext';
import CartDrawer from './CartDrawer';
import { Container } from './ui';
import useApi from '../hooks/useApi';
import { cmsPublicApi } from '../services';
import useShopSettings from './useShopSettings';
import { resolvePageCopy } from './cmsCopy';

const ManagedCmsPage = lazy(() => import('./AfsanaSignatureHome').then((m) => ({ default: m.ManagedCmsPage })));
const defaultNav=[['/','Home'],['/shop','Collection'],['/discover','Scent finder'],['/journal','Journal'],['/about','The house'],['/gifting','Gifting']];

function CmsBannerCarousel({ banners = [] }) {
 const items = Array.isArray(banners) ? banners.filter((banner) =>
   banner && (banner.heading || banner.subtitle || banner.desktopImage?.url || banner.mobileImage?.url)
 ) : [];
 if (!items.length) return null;
 return (
  <section aria-label="AFSANA featured banners" className="relative overflow-hidden bg-[#100d24]">
   <div className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {items.map((banner,index) => {
     const desktopUrl = banner.desktopImage?.url || banner.mobileImage?.url || '';
     const mobileUrl = banner.mobileImage?.url || desktopUrl;
     const link = banner.buttonLink || '/shop';
     const external = /^https?:\/\//i.test(link);
     const action = banner.buttonText ? (external
       ? <a href={link} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-3 bg-[#d9ff55] px-7 py-4 text-[10px] font-semibold uppercase tracking-[.2em] text-[#100d24] transition hover:bg-white">{banner.buttonText}<span>↗</span></a>
       : <Link to={link} className="mt-7 inline-flex items-center gap-3 bg-[#d9ff55] px-7 py-4 text-[10px] font-semibold uppercase tracking-[.2em] text-[#100d24] transition hover:bg-white">{banner.buttonText}<span>↗</span></Link>
     ) : null;
     return (
      <article key={banner.id || index} className="relative isolate flex min-h-[360px] min-w-full snap-center items-center overflow-hidden sm:min-h-[500px]">
       {desktopUrl ? <picture className="absolute inset-0 -z-20">
        {mobileUrl && <source media="(max-width: 700px)" srcSet={mobileUrl}/>}
        <img src={desktopUrl} alt={banner.desktopImage?.alt || banner.heading || 'AFSANA fragrance campaign'} loading={index === 0 ? 'eager' : 'lazy'} className="h-full w-full object-cover"/>
       </picture> : <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_70%_35%,rgba(115,87,255,.45),transparent_35%),linear-gradient(120deg,#100d24,#263e0e)]"/>}
       <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#100d24]/90 via-[#100d24]/55 to-[#100d24]/10"/>
       <div className="container-xl w-full py-16 sm:py-24">
        <div className="max-w-2xl text-white">
         {banner.heading && <h2 className="font-display text-4xl leading-[.95] tracking-tight sm:text-7xl">{banner.heading}</h2>}
         {banner.subtitle && <p className="mt-5 max-w-xl text-sm leading-7 text-white/75 sm:text-base">{banner.subtitle}</p>}
         {action}
        </div>
       </div>
      </article>
     );
    })}
   </div>
   {items.length > 1 && <p className="pointer-events-none absolute bottom-4 right-6 text-[9px] uppercase tracking-[.25em] text-white/65">Swipe to explore · {items.length} stories</p>}
  </section>
 );
}

export default function ShopLayout(){
 const [showIntro,setShowIntro]=useState(false);
 const {count,openDrawer}=useCart(),{status}=useCustomer(),location=useLocation(),navigate=useNavigate(),isHome=location.pathname==='/',[menu,setMenu]=useState(false),[search,setSearch]=useState(false),[q,setQ]=useState('');
 const {data:cmsData}=useApi(()=>cmsPublicApi.content(),[]);
 const shopSettings=useShopSettings();
 const footerConfig=(cmsData?.pageSections?.site_footer||[]).find((s)=>s.type==='custom_footer')?.config||{};
 const navCopy=resolvePageCopy(cmsData,'site_navigation');
 const footerCopy=resolvePageCopy(cmsData,'site_footer');
 const socialLinks=[['Instagram',footerConfig.instagramUrl||shopSettings?.store?.instagram,Instagram],['Facebook',footerConfig.facebookUrl||shopSettings?.store?.facebook,Facebook],['TikTok',footerConfig.tiktokUrl,Music2],['YouTube',footerConfig.youtubeUrl,Youtube],['Pinterest',footerConfig.pinterestUrl,Pin],['X',footerConfig.xUrl,null]];
 const footerCms=(cmsData?.homepageSections||[]).find((s)=>s?.type==='footer_showcase')?.config||{};
 const cmsWhatsapp = (cmsData?.pageSections?.site_footer_before || []).some((section) => section?.type === 'whatsapp_float' && section?.isEnabled !== false);
 const directWhatsappHref = 'https://wa.me/923132956206?text=' + encodeURIComponent('Assalam-o-Alaikum! I would like to know more about AFSANA perfumes.');
 const isPreviewRequested = new URLSearchParams(location.search).get('afsanaPreview') === '1';
 let previewLayout = null;
 try { if (isPreviewRequested) previewLayout = JSON.parse(localStorage.getItem('afsana_cms_preview_v3') || 'null'); } catch {}
 const isCmsPreview = isPreviewRequested && !!previewLayout;
 const footerPreview = Array.isArray(previewLayout?.layouts?.site_footer);
 const hasManagedFooter = footerPreview || (cmsData?.pageSections?.site_footer || []).some((section) => section?.type !== 'page_copy');
 let navigationSections = cmsData?.pageSections?.site_navigation || [];
 if (isCmsPreview) {
   if (Array.isArray(previewLayout?.layouts?.site_navigation)) navigationSections = previewLayout.layouts.site_navigation;
   else if (new URLSearchParams(location.search).get('afsanaPageKey') === 'site_navigation' && Array.isArray(previewLayout?.sections)) navigationSections = previewLayout.sections;
 }
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
   {isCmsPreview && <div className="relative z-[60] bg-[#7357ff] px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[.18em] text-white">Preview only — this design is not live. Return to Admin CMS and click Confirm &amp; Publish after checking.</div>}
  {showIntro && <div className="afsana-ref-intro" aria-label="AFSANA — Scent, Reimagined"><div><div className="afsana-ref-intro-mark">AFSANA<span>.</span></div><div className="afsana-ref-intro-line"/><div className="afsana-ref-intro-copy">SCENT, REIMAGINED</div></div></div>}

  <div className="overflow-hidden border-b border-[#100d24]/10 bg-[#d9ff55] text-[#100d24]">
    <div className="marquee-track flex min-w-max items-center gap-8 py-2.5">{Array.from({length:2}).flatMap(() => [cmsData?.announcement?.text || navCopy.announcementDefault,navCopy.marqueeDiscover,navCopy.marqueeCrafted,navCopy.marqueeCollection]).map((x,i)=><span key={i} className="flex items-center gap-8 text-[8px] uppercase tracking-[.3em]">AFSANA <b className="text-[#7357ff]">•</b>{x}<b className="text-[#7357ff]">•</b></span>)}</div>
  </div>

  <header className="sticky top-0 z-40 text-[#100d24]">
   <div className="absolute inset-0 border-b border-[#100d24]/10 bg-[#f7f4ed]/92 backdrop-blur-xl shadow-[0_10px_40px_rgba(16,13,36,.07)]"/>
   <Container className="container-xl relative flex h-[84px] items-center">
    <button className={'md:hidden '+icon} onClick={()=>setMenu(!menu)} aria-label={navCopy.menuLabel} aria-expanded={menu} aria-controls="mobile-navigation">{menu?<X/>:<Menu/>}</button>
    <Link to="/" className="logo group flex shrink-0 items-center gap-3" aria-label={brandName}>
      <span className="grid h-[31px] w-[31px] place-items-center overflow-hidden rounded-full bg-[#100d24]">{logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-contain" onError={(e)=>{e.currentTarget.style.display='none';}}/> : <span className="font-display text-[19px] italic text-[#d9ff55]">A</span>}</span>
      <span className="block font-display text-[20px] tracking-[.17em] text-[#100d24]">{brandName}<small className="mt-[1px] block font-mono text-[8px] tracking-[.32em] text-[#80798f]">{brandTagline}</small></span>
    </Link>
    <nav className="main-nav hidden md:flex items-center gap-8 ml-14">{nav.map(([to,label])=><NavLink key={to} to={to} end={to==='/' } className={({isActive})=>'py-7 text-[10px] uppercase tracking-[.13em] transition '+(isActive?'text-[#7357ff]':'text-[#514b62] hover:text-[#100d24]')}>{label}</NavLink>)}</nav>
    <div className="header-actions ml-auto flex items-center">
      <button className={icon} onClick={()=>setSearch(true)} aria-label={navCopy.searchLabel} aria-expanded={search}><Search className="w-[18px]"/></button>
      <Link className={icon} to={status==='authed'?'/account':'/login'} aria-label={status==='authed'?navCopy.accountLabel:navCopy.loginLabel} title={status==='authed'?navCopy.accountLabel:navCopy.loginLabel}><User className="w-[18px]"/></Link>
      <button className={icon+' relative'} onClick={openDrawer} aria-label={navCopy.cartLabel}><ShoppingBag className="w-[18px]"/>{count>0&&<span className="absolute right-0 top-1 min-w-4 h-4 rounded-full bg-[#d9ff55] text-[#100d24] text-[9px] leading-4 text-center">{count}</span>}</button>
    </div>
   </Container>
   {menu&&<div id="mobile-navigation" className="relative md:hidden border-t border-[#100d24]/10 bg-[#f7f4ed]"><nav className="grid grid-cols-2 p-5">{nav.map(([to,label])=><Link key={to} onClick={()=>setMenu(false)} to={to} className="border-b border-[#100d24]/10 py-4 text-[10px] uppercase tracking-[.2em] text-[#514b62] hover:text-[#7357ff]">{label}</Link>)}</nav></div>}
  </header>

  <Suspense fallback={null}><ManagedCmsPage pageKey="site_header_after" /></Suspense>
  {isHome && <CmsBannerCarousel banners={cmsData?.banners || []}/>}
  <main className={isHome?'':'py-0'}><Outlet/></main>
  <Suspense fallback={null}><ManagedCmsPage pageKey="site_footer_before" /></Suspense>
  {!cmsWhatsapp && <a href={directWhatsappHref} target="_blank" rel="noreferrer" aria-label="Chat with AFSANA on WhatsApp" title="Chat with AFSANA on WhatsApp" className="fixed bottom-24 right-6 z-[86] isolate inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-[#20c768] p-0 text-white shadow-2xl shadow-black/25 transition hover:-translate-y-1 hover:bg-[#16b85b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9ff55]">
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[#20c768]/55 animate-ping" style={{ animationDuration: '5s' }} />
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0">
      <path fill="currentColor" d="M20.52 3.48A11.77 11.77 0 0 0 12.15 0C5.64 0 .34 5.3.34 11.81c0 2.08.54 4.12 1.57 5.91L.25 24l6.45-1.69a11.8 11.8 0 0 0 5.45 1.31h.01c6.51 0 11.81-5.3 11.81-11.81 0-3.15-1.23-6.11-3.45-8.33ZM12.16 21.6h-.01a9.8 9.8 0 0 1-4.99-1.37l-.36-.21-3.83 1 1.02-3.73-.23-.38a9.77 9.77 0 0 1-1.5-5.1c0-5.42 4.41-9.83 9.84-9.83 2.63 0 5.1 1.03 6.96 2.89a9.78 9.78 0 0 1 2.88 6.97c0 5.42-4.41 9.83-9.78 9.83Zm5.39-7.36c-.29-.15-1.7-.84-1.97-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.91 1.13-.17.2-.34.22-.63.08-.29-.15-1.22-.45-2.32-1.43-.86-.76-1.44-1.7-1.61-1.99-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.3-.49.1-.19.05-.36-.02-.51-.08-.15-.64-1.54-.88-2.11-.23-.55-.47-.48-.64-.49l-.55-.01c-.2 0-.51.08-.78.37-.27.29-1.03 1.01-1.03 2.47 0 1.46 1.05 2.87 1.2 3.07.15.2 2.07 3.16 5.01 4.43.7.3 1.25.49 1.68.63.71.23 1.36.2 1.87.12.57-.09 1.7-.7 1.94-1.38.24-.68.24-1.26.17-1.38-.08-.12-.27-.2-.56-.34Z"/>
    </svg>
  </a>}

  {hasManagedFooter ? <Suspense fallback={null}><ManagedCmsPage pageKey="site_footer" /></Suspense> :
  <footer className="relative overflow-hidden bg-[#100d24] text-white border-t border-[#d9ff55]/20">
   <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_18%,rgba(115,87,255,.24),transparent_26%),radial-gradient(circle_at_88%_72%,rgba(217,255,85,.08),transparent_28%)]"/>
   <div className="relative">
    <div className="border-b border-white/10 overflow-hidden"><div className="marquee-track flex min-w-max gap-12 py-3 text-[9px] uppercase tracking-[.32em] text-white/35">{[footerCopy.marquee1,footerCopy.marquee2,footerCopy.marquee3,footerCopy.marquee4,footerCopy.marquee5,footerCopy.marquee1].map((x,i)=><span key={i}>{x}<b className="mx-12 text-[#d9ff55]">✦</b></span>)}</div></div>
    <Container className="container-xl py-16 sm:py-24">
      <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-12 pb-14 border-b border-white/10">
        <div>
          <p className="text-[9px] uppercase tracking-[.4em] text-[#d9ff55]">{footerCms.eyebrow||footerCopy.footerEyebrow}</p>
          <div className="mt-5 font-display text-[clamp(5rem,14vw,11rem)] leading-[.68] tracking-[-.07em]">{footerConfig.brandName||footerCopy.footerDisplayBrand}</div>
          <p className="mt-10 max-w-xl font-display text-2xl sm:text-4xl leading-tight text-white/90">{footerCms.body||'Fragrance as memory. Designed in chapters. Created to leave a trace.'}</p>
        </div>
        <div className="self-end rounded-3xl border border-[#d9ff55]/20 bg-white/[.035] p-6 sm:p-8 backdrop-blur-xl">
          <p className="text-[9px] uppercase tracking-[.28em] text-[#d9ff55]">{footerCms.offerLabel||'THE FINAL NOTE'}</p>
          <h3 className="mt-4 font-display text-3xl">{footerCms.offerText||'Discover the scent that feels like you.'}</h3>
          <Link to={footerCms.buttonLink||'/shop'} className="mt-7 inline-flex items-center gap-2 bg-[#d9ff55] px-6 py-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#100d24] hover:bg-white transition">{footerCms.buttonText||'Explore Collection'}<span>↗</span></Link>
        </div>
      </div>
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] py-14">
        <div><div className="text-[9px] uppercase tracking-[.3em] text-white/35">{footerCopy.contactLabel}</div><p className="mt-5 text-sm leading-7 text-white/55">{footerCopy.contactDescription}</p><Link to="/account" className="inline-flex mt-6 text-[10px] uppercase tracking-[.2em] text-[#d9ff55]">{footerCopy.customerCare} ↗</Link></div>
        <div><h4 className="text-[9px] uppercase tracking-[.28em] text-[#d9ff55]">{footerCopy.exploreHeading}</h4><div className="mt-5 space-y-3 text-sm text-white/55"><Link className="block hover:text-white transition" to="/shop">{footerCopy.collectionLink}</Link><Link className="block hover:text-white transition" to="/about">{footerCopy.houseLink}</Link><Link className="block hover:text-white transition" to="/journal">{footerCopy.journalLink}</Link><Link className="block hover:text-white transition" to="/gifting">{footerCopy.giftingLink}</Link></div></div>
        <div><h4 className="text-[9px] uppercase tracking-[.28em] text-[#d9ff55]">{footerCopy.customerHeading}</h4><div className="mt-5 space-y-3 text-sm text-white/55"><Link className="block hover:text-white transition" to="/track">{footerCopy.trackLink}</Link><Link className="block hover:text-white transition" to="/account">{footerCopy.accountLink}</Link><Link className="block hover:text-white transition" to="/shop">{footerCopy.fragranceCareLink}</Link><Link className="block hover:text-white transition" to="/gifting">{footerCopy.giftGuideLink}</Link></div></div>
        <div><h4 className="text-[9px] uppercase tracking-[.28em] text-[#d9ff55]">{footerCopy.socialHeading}</h4><div className="mt-5 flex flex-wrap gap-2">{socialLinks.map(([label,url,Icon])=>url?<a key={label} href={url} target="_blank" rel="noreferrer" aria-label={label} title={label} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-[#d9ff55] hover:border-[#d9ff55] hover:bg-white/10 transition">{Icon?<Icon className="h-4 w-4"/>:<span className="text-sm font-bold">𝕏</span>}</a>:<span key={label} aria-label={label+' not connected'} title={label+' — connect in CMS'} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-white/35">{Icon?<Icon className="h-4 w-4"/>:<span className="text-sm font-bold">𝕏</span>}</span>)}</div><p className="mt-2 text-[9px] text-white/35">{footerCopy.socialHelp}</p></div>
      </div>
      <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-[8px] uppercase tracking-[.22em] text-white/25"><span>{footerCopy.copyright}</span><span>{footerCopy.legalLine}</span><span>{footerCopy.footerTagline}</span></div>
    </Container>
   </div>
  </footer>}

  {search&&<div className="fixed inset-0 z-[65] bg-[#100d24]/98 backdrop-blur-xl text-white overflow-y-auto">
    <Container className="container-xl min-h-full py-8 md:py-12">
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <div><div className="text-[9px] uppercase tracking-[.35em] text-[#d9ff55]">{navCopy.searchEyebrow}</div><h2 className="font-display text-4xl md:text-6xl mt-3">{navCopy.searchTitle}</h2></div>
        <button className="icon-btn" onClick={()=>setSearch(false)} aria-label={navCopy.searchButton} autoFocus><X/></button>
      </div>
      <form onSubmit={submit} className="mt-14 border-b border-white/25 flex items-center">
        <Search className="w-5 h-5 text-[#d9ff55]"/>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder={navCopy.searchPlaceholder} className="w-full bg-transparent px-5 py-6 font-display text-4xl md:text-6xl outline-none placeholder:text-white/20"/>
        <button className="text-[9px] uppercase tracking-[.25em] text-[#d9ff55]" type="submit">{navCopy.searchButton}</button>
      </form>
      <div className="mt-14 grid gap-10 md:grid-cols-3">
        <div><div className="text-[9px] uppercase tracking-[.35em] text-[#d9ff55]">{navCopy.popularPathsTitle}</div><div className="mt-5 space-y-3">
          {[navCopy.popularSignature,navCopy.popularOud,navCopy.popularFloral,navCopy.popularFresh].map(x=><button key={x} type="button" onClick={()=>{setQ(x);navigate('/shop?category='+x.toLowerCase());setSearch(false)}} className="block text-left font-display text-3xl hover:text-[#d9ff55]">{x}</button>)}
        </div></div>
        <div className="md:col-span-2 border-l border-white/10 md:pl-10">
          <div className="text-[9px] uppercase tracking-[.35em] text-[#d9ff55]">{navCopy.ritualTitle}</div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[navCopy.discoverCard,navCopy.giftingCard,navCopy.collectionCard].map((x,i)=><button key={x} type="button" onClick={()=>{setSearch(false);navigate(i===0?'/discover':i===1?'/gifting':'/shop')}} className="border border-white/10 p-5 text-left hover:border-[#d9ff55] transition"><span className="text-[9px] uppercase tracking-[.18em] text-[#d9ff55]">0{i+1}</span><span className="block mt-8 font-display text-2xl">{x}</span></button>)}
          </div>
        </div>
      </div>
    </Container>
  </div>}

  <CartDrawer/>
 </div>;
}
