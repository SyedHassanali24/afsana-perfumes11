import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X, Heart, Truck, CreditCard, Headphones, Instagram, Facebook, Youtube, Music2, Pin } from 'lucide-react';
import { useCart } from './CartContext';
import { useCustomer } from '../customer/CustomerAuthContext';
import CartDrawer from './CartDrawer';
import WelcomeOfferPopup from './WelcomeOfferPopup';
import { useWishlist } from './WishlistContext';
import { Container } from './ui';
import useApi from '../hooks/useApi';
import { cmsPublicApi, productsApi } from '../services';
import useShopSettings from './useShopSettings';

const ManagedCmsPage = lazy(() => import('./AfsanaSignatureHome').then((m) => ({ default: m.ManagedCmsPage })));
const defaultNav=[['/','Home'],['/shop','Collection'],['/discover','Scent finder'],['/journal','Journal'],['/about','The house'],['/gifting','Gifting'],['/contact','Contact']];

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
        <img src={desktopUrl} alt={banner.desktopImage?.alt || banner.heading || 'AFSANA fragrance campaign'} loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} decoding="async" className="h-full w-full object-cover"/>
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
 const {count}=useCart(),{count:wishlistCount}=useWishlist(),{status}=useCustomer(),location=useLocation(),navigate=useNavigate(),isHome=location.pathname==='/',[menu,setMenu]=useState(false),[search,setSearch]=useState(false),[q,setQ]=useState(''),[suggestions,setSuggestions]=useState([]),[suggesting,setSuggesting]=useState(false);
 const {data:cmsData}=useApi(()=>cmsPublicApi.content(),[]);
 const shopSettings=useShopSettings();
 const footerConfig=(cmsData?.pageSections?.site_footer||[]).find((s)=>s.type==='custom_footer')?.config||{};
 const socialLinks=[['Instagram',footerConfig.instagramUrl||shopSettings?.store?.instagram,Instagram],['Facebook',footerConfig.facebookUrl||shopSettings?.store?.facebook,Facebook],['TikTok',footerConfig.tiktokUrl,Music2],['YouTube',footerConfig.youtubeUrl,Youtube],['Pinterest',footerConfig.pinterestUrl,Pin],['X',footerConfig.xUrl,null]];
 const siteFooterSections=cmsData?.pageSections?.site_footer||[];
 const footerCms=siteFooterSections.find((s)=>s?.type==='footer_showcase')?.config||{};
 const hasFooterShowcase=siteFooterSections.some((s)=>s?.type==='footer_showcase'&&s?.isEnabled!==false);
 const cmsWhatsapp = (cmsData?.pageSections?.site_footer_before || []).some((section) => section?.type === 'whatsapp_float' && section?.isEnabled !== false);
 const directWhatsappHref = 'https://wa.me/923252032321?text=' + encodeURIComponent('Assalam-o-Alaikum! I would like to know more about AFSANA perfumes.');
 const isPreviewRequested = new URLSearchParams(location.search).get('afsanaPreview') === '1';
 let previewLayout = null;
 try { if (isPreviewRequested) previewLayout = JSON.parse(localStorage.getItem('afsana_cms_preview_v3') || 'null'); } catch {}
 const isCmsPreview = isPreviewRequested && !!previewLayout;
 const footerPreview = Array.isArray(previewLayout?.layouts?.site_footer) && previewLayout.layouts.site_footer.some((s) => s?.type === 'custom_footer');
 const hasManagedFooter = footerPreview || siteFooterSections.some((s) => s?.type === 'custom_footer' && s?.isEnabled !== false);
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
 const contactNav = nav.some(([to]) => to === '/contact') ? nav : [...nav, ['/contact', 'Contact']];
 const logoUrl = String(navConfig.logoUrl || '').trim();
 const brandName = navConfig.brandName || 'AFSANA';
 const brandTagline = navConfig.tagline || 'THE ART OF SCENT';

 useEffect(()=>{setMenu(false)},[location.pathname,location.search]);
 useEffect(()=>{let timer;try{if(!sessionStorage.getItem('afsana-reference-intro-v1')){sessionStorage.setItem('afsana-reference-intro-v1','seen');setShowIntro(true);timer=window.setTimeout(()=>setShowIntro(false),1650);}}catch{}return()=>{if(timer)window.clearTimeout(timer)};},[]);
 useEffect(()=>{if(!search)return;const onKey=e=>{if(e.key==='Escape')setSearch(false)};document.addEventListener('keydown',onKey);const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=prev}},[search]);
 useEffect(()=>{
  const term=q.trim();
  if(!search||term.length<2){setSuggestions([]);setSuggesting(false);return;}
  let active=true;
  const timer=window.setTimeout(async()=>{
   setSuggesting(true);
   try{const result=await productsApi.list({q:term,limit:5});if(active)setSuggestions(result?.products||[]);}
   catch{if(active)setSuggestions([]);}
   finally{if(active)setSuggesting(false);}
  },250);
  return()=>{active=false;window.clearTimeout(timer);};
 },[q,search]);

 const submit=e=>{e.preventDefault();navigate(q.trim()?'/shop?q='+encodeURIComponent(q.trim()):'/shop');setSearch(false)};
 const icon='icon-btn grid h-10 w-10 place-items-center text-[#100d24]/85 hover:text-[#7357ff] transition focus:outline-none';

 return <div className="storefront-theme afsana-reference-storefront min-h-screen bg-white text-[#242424]" data-storefront-design="green-yellow" data-storefront-route={location.pathname}>
   {isCmsPreview && <div className="relative z-[60] bg-[#7357ff] px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[.18em] text-white">Preview only — this design is not live. Return to Admin CMS and click Confirm &amp; Publish after checking.</div>}
  {showIntro && <div className="afsana-ref-intro" aria-label="AFSANA — Scent, Reimagined"><div><div className="afsana-ref-intro-mark">AFSANA<span>.</span></div><div className="afsana-ref-intro-line"/><div className="afsana-ref-intro-copy">SCENT, REIMAGINED</div></div></div>}

  {cmsData?.announcement?.text && <div className="border-b border-[#100d24]/10 bg-[#d9ff55] px-4 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[.22em] text-[#100d24]">AFSANA <span className="mx-2 text-[#7357ff]">•</span>{cmsData.announcement.text}</div>}

  <div className="afsana-reference-topbar" aria-label="AFSANA return policy and account links">
    <Container className="afsana-reference-topbar-inner">
      <div className="afsana-return-policy-marquee" aria-label="15 days return policy">
        <div className="afsana-return-policy-track"><span>15 DAYS RETURN POLICY <i>✦</i> SHOP WITH CONFIDENCE <i>✦</i> 15 DAYS RETURN POLICY <i>✦</i> SHOP WITH CONFIDENCE <i>✦</i></span><span aria-hidden="true">15 DAYS RETURN POLICY <i>✦</i> SHOP WITH CONFIDENCE <i>✦</i> 15 DAYS RETURN POLICY <i>✦</i> SHOP WITH CONFIDENCE <i>✦</i></span></div>
      </div>
      <span className="afsana-reference-topbar-links">
        <Link to="/track" className="afsana-topbar-action"><Truck aria-hidden="true"/>Track order</Link>
        <Link to={status==='authed'?'/account':'/login'} className="afsana-topbar-action afsana-topbar-account"><User aria-hidden="true"/>{status==='authed'?'My account':'Sign in'}</Link>
      </span>
    </Container>
  </div>
  <header className="storefront-header sticky top-0 z-40 text-[#100d24]">
   <div className="storefront-header-surface absolute inset-0 border-b border-[#100d24]/10 bg-[#f7f4ed]/95 backdrop-blur-xl shadow-[0_10px_36px_rgba(16,13,36,.08)]"/>
   <Container className="container-xl storefront-header-inner relative flex h-[82px] items-center justify-between gap-4">
    <button className="storefront-mobile-toggle lg:hidden" onClick={()=>setMenu(!menu)} aria-label="Menu" aria-expanded={menu} aria-controls="mobile-navigation">{menu?<X/>:<Menu/>}</button>
    <Link to="/" className="logo storefront-brand group flex shrink-0 items-center gap-3" aria-label={brandName}>
      <span className="storefront-brand-mark grid h-10 w-10 place-items-center overflow-hidden rounded-[13px] bg-[#17112f] shadow-[0_5px_16px_rgba(23,17,47,.2)]">{logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-contain" onError={(e)=>{e.currentTarget.style.display='none';}}/> : <span className="font-display text-[23px] italic text-[#d9ff55]">A</span>}</span>
      <span className="block font-display text-[20px] leading-none tracking-[.17em] text-[#100d24]">{brandName}<small className="mt-[5px] block font-mono text-[7px] font-semibold tracking-[.34em] text-[#80798f]">{brandTagline}</small></span>
    </Link>
    <nav className="storefront-main-nav hidden lg:flex items-center gap-1 rounded-full border border-[#e8e2ef] bg-white/80 p-1 shadow-[0_5px_20px_rgba(23,17,47,.055)]" aria-label="Main navigation">
      {contactNav.map(([to,label])=><NavLink key={to} to={to} end={to==='/'} className={({isActive})=>'storefront-nav-link '+(isActive?'is-active':'')}>{label}</NavLink>)}
    </nav>
    <div className="header-actions storefront-header-actions ml-auto flex shrink-0 items-center gap-2">
      <button className="storefront-header-action storefront-search-trigger" onClick={()=>setSearch(true)} aria-label="Search fragrances" aria-expanded={search}><Search className="h-[17px] w-[17px]"/></button>
      <Link className="storefront-header-action relative" to="/wishlist" aria-label="Wishlist" title="Wishlist"><Heart className="h-[17px] w-[17px]"/>{wishlistCount>0&&<span className="storefront-header-count">{wishlistCount}</span>}</Link>
      <Link className="storefront-header-action" to={status==='authed'?'/account':'/login'} aria-label={status==='authed'?'My account':'Sign in'} title={status==='authed'?'My account':'Sign in'}><User className="h-[17px] w-[17px]"/></Link>
      <Link className="storefront-header-action storefront-cart-action relative" to="/cart" aria-label="Open shopping cart" title="Shopping cart"><ShoppingBag className="h-[17px] w-[17px]"/>{count>0&&<span className="storefront-cart-count absolute -right-1 -top-1 min-w-[18px] h-[18px] rounded-full bg-[#ffbd37] px-1 text-[#194629] text-[9px] leading-[18px] text-center">{count}</span>}</Link>
    </div>
   </Container>
   {menu&&<div id="mobile-navigation" className="storefront-mobile-menu relative lg:hidden">
     <nav className="container-xl grid grid-cols-2 gap-2 px-5 py-5" aria-label="Mobile navigation">
       {nav.map(([to,label])=><NavLink key={to} onClick={()=>setMenu(false)} to={to} end={to==='/'} className={({isActive})=>'storefront-mobile-nav-link '+(isActive?'is-active':'')}>{label}<span aria-hidden="true">↗</span></NavLink>)}
     </nav>
   </div>}
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

  <section className="afsana-reference-benefits" aria-label="AFSANA customer benefits">
    <Container className="afsana-reference-benefits-inner">
      <div><span><Truck aria-hidden="true"/></span><p><strong>Complimentary Delivery</strong><small>On qualifying orders above PKR 7,500</small></p></div>
      <div><span><CreditCard aria-hidden="true"/></span><p><strong>Flexible Payment</strong><small>Cash on Delivery and Bank Transfer</small></p></div>
      <div><span><Headphones aria-hidden="true"/></span><p><strong>Customer Support</strong><small>Help with your fragrance and order</small></p></div>
    </Container>
  </section>

  {hasManagedFooter ? <Suspense fallback={null}><ManagedCmsPage pageKey="site_footer" /></Suspense> :
  <footer className="relative overflow-hidden bg-[#100d24] text-white border-t border-[#d9ff55]/20">
   <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_18%,rgba(115,87,255,.24),transparent_26%),radial-gradient(circle_at_88%_72%,rgba(217,255,85,.08),transparent_28%)]"/>
   <div className="relative">
    <Container className="container-xl py-16 sm:py-24">
      {hasFooterShowcase && <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-12 pb-14 border-b border-white/10">
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
      </div>}
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] py-14">
        <div><div className="text-[9px] uppercase tracking-[.3em] text-white/35">Afsana / Contact</div><p className="mt-5 text-sm leading-7 text-white/55">For fragrance questions, gifting help and order support, visit your account or explore the collection.</p><Link to="/contact" className="inline-flex mt-6 text-[10px] uppercase tracking-[.2em] text-[#d9ff55]">Contact the house ↗</Link></div>
        <div><h4 className="text-[9px] uppercase tracking-[.28em] text-[#d9ff55]">Explore</h4><div className="mt-5 space-y-3 text-sm text-white/55"><Link className="block hover:text-white transition" to="/shop">Collection</Link><Link className="block hover:text-white transition" to="/about">The House</Link><Link className="block hover:text-white transition" to="/journal">Journal</Link><Link className="block hover:text-white transition" to="/gifting">Gifting</Link><Link className="block hover:text-white transition" to="/contact">Contact us</Link></div></div>
        <div><h4 className="text-[9px] uppercase tracking-[.28em] text-[#d9ff55]">Customer</h4><div className="mt-5 space-y-3 text-sm text-white/55"><Link className="block hover:text-white transition" to="/track">Track order</Link><Link className="block hover:text-white transition" to="/account">Account</Link><Link className="block hover:text-white transition" to="/shop">Fragrance care</Link><Link className="block hover:text-white transition" to="/gifting">Gift guide</Link></div></div>
        <div><h4 className="text-[9px] uppercase tracking-[.28em] text-[#d9ff55]">Follow the house</h4><div className="mt-5 flex flex-wrap gap-2">{socialLinks.map(([label,url,Icon])=>url?<a key={label} href={url} target="_blank" rel="noreferrer" aria-label={label} title={label} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-[#d9ff55] hover:border-[#d9ff55] hover:bg-white/10 transition">{Icon?<Icon className="h-4 w-4"/>:<span className="text-sm font-bold">𝕏</span>}</a>:<span key={label} aria-label={label+' not connected'} title={label+' — connect in CMS'} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-white/35">{Icon?<Icon className="h-4 w-4"/>:<span className="text-sm font-bold">𝕏</span>}</span>)}</div><p className="mt-2 text-[9px] text-white/35">Official links can be connected in the Footer settings in CMS.</p></div>
      </div>
      <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-[8px] uppercase tracking-[.22em] text-white/25"><span>© 2026 AFSANA PERFUMES</span><span><Link to="/privacy-policy" className="text-white/50 transition hover:text-[#d9ff55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9ff55]">PRIVACY POLICY</Link> · <Link to="/terms-of-service" className="text-white/50 transition hover:text-[#d9ff55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9ff55]">TERMS OF SERVICE</Link></span><span>THE ART OF SCENT</span></div>
    </Container>
   </div>
  </footer>}

  {/* Legal links are included in the managed footer's responsive bottom bar. */}

  {search&&<div
    className="storefront-search-backdrop fixed inset-0 z-[65] overflow-y-auto px-3 py-5 sm:px-6 sm:py-9"
    role="presentation"
    onMouseDown={(event)=>{if(event.target===event.currentTarget)setSearch(false)}}
  >
    <div className="storefront-search-panel mx-auto w-full max-w-5xl overflow-hidden rounded-[26px] border border-white/60 bg-[#f7f4ed] text-[#17112f] shadow-[0_28px_100px_rgba(0,0,0,.38)]">
      <div className="storefront-search-heading flex items-start justify-between gap-5 bg-[#17112f] px-5 py-6 text-white sm:px-9 sm:py-8">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[.36em] text-[#d9ff55]">The AFSANA edit</div>
          <h2 className="mt-3 font-display text-3xl leading-tight sm:text-5xl">Find your next signature.</h2>
          <p className="mt-2 text-xs leading-5 text-white/55">Search by fragrance, mood or note.</p>
        </div>
        <button className="storefront-search-close" onClick={()=>setSearch(false)} aria-label="Close search" autoFocus><X className="h-5 w-5"/></button>
      </div>
      <div className="px-5 py-6 sm:px-9 sm:py-8">
        <form onSubmit={submit} className="storefront-search-form flex flex-col gap-2 rounded-[18px] border border-[#e4deec] bg-white p-2 shadow-[0_10px_28px_rgba(23,17,47,.08)] sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
            <Search className="h-5 w-5 shrink-0 text-[#7357ff]"/>
            <input aria-label="Search fragrances" autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Try oud, floral, fresh..." className="min-w-0 w-full border-0 bg-transparent px-1 py-4 font-display text-xl text-[#17112f] outline-none placeholder:font-sans placeholder:text-sm placeholder:text-[#aaa2b4] focus:outline-none focus:ring-0 sm:text-2xl"/>
            {q&&<button type="button" onClick={()=>setQ('')} className="rounded-full p-2 text-[#8c8497] transition hover:bg-[#f0edf6] hover:text-[#17112f]" aria-label="Clear search"><X className="h-4 w-4"/></button>}
          </div>
          <button className="storefront-search-submit inline-flex min-h-12 items-center justify-center gap-2 rounded-[13px] bg-[#7357ff] px-7 text-[10px] font-bold uppercase tracking-[.2em] text-white shadow-[0_5px_14px_rgba(115,87,255,.25)] transition hover:bg-[#5e43e4]" type="submit">Search fragrances <span aria-hidden="true">↗</span></button>
        </form>
        {q.trim().length>=2&&(suggesting||suggestions.length>0)&&<div className="storefront-search-results mt-4 overflow-hidden rounded-2xl border border-[#e8e2ef] bg-white shadow-[0_8px_24px_rgba(23,17,47,.05)]">
          {suggesting?<p className="px-5 py-4 text-xs text-[#81798d]">Finding fragrances…</p>:suggestions.map(product=><Link key={product.id||product._id||product.slug} to={`/product/${product.slug}`} onClick={()=>setSearch(false)} className="storefront-search-result-row flex items-center justify-between gap-4 border-b border-[#f0edf4] px-5 py-4 text-[#17112f] transition last:border-0 hover:bg-[#f7f4ed]">
            <span className="font-display text-xl">{product.name}</span><span className="shrink-0 text-[9px] font-semibold uppercase tracking-[.17em] text-[#7357ff]">View fragrance ↗</span>
          </Link>)}
        </div>}
        {q.trim().length>=2&&!suggesting&&suggestions.length===0&&<div className="mt-4 rounded-2xl border border-[#e8e2ef] bg-white px-5 py-4 text-sm text-[#81798d]">No matching fragrances found. Try another scent or note.</div>}
        <div className="mt-8 grid gap-8 md:grid-cols-[.75fr_1.25fr]">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[.28em] text-[#8a8195]">Explore by scent</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Signature','Oud','Floral','Fresh'].map(x=><button key={x} type="button" onClick={()=>{setQ(x);navigate('/shop?category='+x.toLowerCase());setSearch(false)}} className="storefront-search-chip">{x}<span aria-hidden="true">↗</span></button>)}
            </div>
          </div>
          <div className="md:border-l md:border-[#e7e1ed] md:pl-8">
            <div className="text-[9px] font-semibold uppercase tracking-[.28em] text-[#8a8195]">A little direction</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {['Discover your signature','Choose a gift','Explore the collection'].map((x,i)=><button key={x} type="button" onClick={()=>{setSearch(false);navigate(i===0?'/discover':i===1?'/gifting':'/shop')}} className="storefront-search-path">
                <span className="text-[9px] font-bold tracking-[.18em] text-[#7357ff]">0{i+1}</span>
                <span className="mt-5 block font-display text-lg leading-tight text-[#17112f]">{x}</span>
                <span className="mt-3 block text-xs text-[#8b8296]">Explore ↗</span>
              </button>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>}

  <WelcomeOfferPopup/>
  <CartDrawer/>
 </div>;
}
