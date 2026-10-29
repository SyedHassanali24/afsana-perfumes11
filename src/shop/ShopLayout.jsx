import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useCart } from './CartContext';
import { useCustomer } from '../customer/CustomerAuthContext';
import CartDrawer from './CartDrawer';
import { Container } from './ui';
import useApi from '../hooks/useApi';
import { cmsPublicApi } from '../services';
import LuxuryExperienceLayer from './LuxuryExperienceLayer';

const nav=[['/','Home'],['/shop','Collection'],['/about','The House'],['/journal','Journal'],['/gifting','Gifting']];
export default function ShopLayout(){
 const {count,openDrawer}=useCart(),{status}=useCustomer(),location=useLocation(),navigate=useNavigate(),isHome=location.pathname==='/',[menu,setMenu]=useState(false),[search,setSearch]=useState(false),[q,setQ]=useState('');
 const {data:cmsData}=useApi(()=>cmsPublicApi.content(),[]);
 const footerCms=(cmsData?.homepageSections||[]).find((s)=>s?.type==='footer_showcase')?.config||{};
 useEffect(()=>{setMenu(false)},[location.pathname,location.search]);
 useEffect(()=>{if(!search)return;const onKey=e=>{if(e.key==='Escape')setSearch(false)};document.addEventListener('keydown',onKey);const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=prev}},[search]);
 const submit=e=>{e.preventDefault();navigate(q.trim()?'/shop?q='+encodeURIComponent(q.trim()):'/shop');setSearch(false)};
 const icon='icon-btn grid h-10 w-10 place-items-center text-white/85 hover:text-[#b4bf41] transition focus:outline-none';
 return <div className="storefront-theme min-h-screen bg-[#faf8f4] text-[#263e0e]">
  <LuxuryExperienceLayer/>
  <div className="overflow-hidden border-b border-[#748e40]/20 bg-[#263e0e] text-[#e7ead9]"><div className="marquee-track flex min-w-max items-center gap-8 py-2.5">{['COMPLIMENTARY DELIVERY ON ORDERS ABOVE PKR 7,500','DISCOVER YOUR SIGNATURE','CRAFTED FOR MEMORIES','THE AFSANA PRIVATE COLLECTION'].concat(['COMPLIMENTARY DELIVERY ON ORDERS ABOVE PKR 7,500','DISCOVER YOUR SIGNATURE','CRAFTED FOR MEMORIES','THE AFSANA PRIVATE COLLECTION']).map((x,i)=><span key={i} className="flex items-center gap-8 text-[8px] uppercase tracking-[.3em]">AFSANA <b className="text-[#748e40]">•</b>{x}<b className="text-[#748e40]">•</b></span>)}</div></div>
  <header className={'z-40 text-white '+(isHome?'absolute top-[34px] left-0 right-0':'sticky top-0')}>
   <div className="absolute inset-0 bg-[#182308]/80 backdrop-blur-xl border-b border-white/10"/>
   <Container className="container-xl relative flex h-[76px] items-center">
    <button className={'md:hidden '+icon} onClick={()=>setMenu(!menu)} aria-label="Menu" aria-expanded={menu} aria-controls="mobile-navigation">{menu?<X/>:<Menu/>}</button>
    <Link to="/" className="logo group shrink-0 text-center"><span className="block font-display text-3xl tracking-[.08em] text-white group-hover:text-[#b4bf41]">AFSANA</span><small className="block text-[7px] uppercase tracking-[.42em] text-[#b4bf41]">THE ART OF SCENT</small></Link>
    <nav className="main-nav hidden md:flex items-center gap-8 ml-14">{nav.map(([to,label])=><NavLink key={to} to={to} end={to==='/' } className={({isActive})=>'py-7 text-[10px] uppercase tracking-[.22em] transition '+(isActive?'text-[#b4bf41]':'text-white/65 hover:text-white')}>{label}</NavLink>)}</nav>
    <div className="header-actions ml-auto flex items-center">
      <button className={icon} onClick={()=>setSearch(true)} aria-label="Search" aria-expanded={search}><Search className="w-[18px]"/></button>
      <Link className={icon} to={status==='authed'?'/account':'/login'} aria-label="Account"><User className="w-[18px]"/></Link>
      <button className={icon+' relative'} onClick={openDrawer} aria-label="Cart"><ShoppingBag className="w-[18px]"/>{count>0&&<span className="absolute right-0 top-1 min-w-4 h-4 rounded-full bg-[#b4bf41] text-[#263e0e] text-[9px] leading-4 text-center">{count}</span>}</button>
    </div>
   </Container>
   {menu&&<div id="mobile-navigation" className="relative md:hidden border-t border-white/10 bg-[#263e0e]"><nav className="grid grid-cols-2 p-5">{nav.map(([to,label])=><Link key={to} onClick={()=>setMenu(false)} to={to} className="border-b border-white/10 py-4 text-[10px] uppercase tracking-[.2em] text-white/75">{label}</Link>)}</nav></div>}
  </header>
  <main className={isHome?'':'py-0'}><Outlet/></main>
  <footer className="relative overflow-hidden bg-[#070906] text-white border-t border-[#b4bf41]/20">
   <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_15%,rgba(180,191,65,.10),transparent_24%),radial-gradient(circle_at_88%_70%,rgba(123,0,58,.14),transparent_28%)]"/>
   <div className="relative">
    <div className="border-b border-white/10 overflow-hidden"><div className="marquee-track flex min-w-max gap-12 py-3 text-[9px] uppercase tracking-[.32em] text-white/35">{['THE ART OF SCENT','CRAFTED FOR MEMORIES','AFSANA PERFUMES','LEAVE A TRACE','THE PRIVATE COLLECTION','THE ART OF SCENT'].map((x,i)=><span key={i}>{x}<b className="mx-12 text-[#b4bf41]">✦</b></span>)}</div></div>
    <Container className="container-xl py-16 sm:py-24">
      <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-12 pb-14 border-b border-white/10">
        <div>
          <p className="text-[9px] uppercase tracking-[.4em] text-[#b4bf41]">{footerCms.eyebrow||'THE HOUSE OF AFSANA'}</p>
          <div className="mt-5 font-display text-[clamp(5rem,14vw,11rem)] leading-[.68] tracking-[-.07em]">AFSANA</div>
          <p className="mt-10 max-w-xl font-display text-2xl sm:text-4xl leading-tight text-white/90">{footerCms.body||'Fragrance as memory. Designed in chapters. Created to leave a trace.'}</p>
        </div>
        <div className="self-end rounded-3xl border border-[#b4bf41]/20 bg-white/[.035] p-6 sm:p-8 backdrop-blur-xl">
          <p className="text-[9px] uppercase tracking-[.28em] text-[#b4bf41]">{footerCms.offerLabel||'THE FINAL NOTE'}</p>
          <h3 className="mt-4 font-display text-3xl">{footerCms.offerText||'Discover the scent that feels like you.'}</h3>
          <Link to={footerCms.buttonLink||'/shop'} className="mt-7 inline-flex items-center gap-2 bg-[#b4bf41] px-6 py-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#263e0e] hover:bg-white transition">{footerCms.buttonText||'Explore Collection'}<span>↗</span></Link>
        </div>
      </div>
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] py-14">
        <div><div className="text-[9px] uppercase tracking-[.3em] text-white/35">Afsana / Contact</div><p className="mt-5 text-sm leading-7 text-white/55">For fragrance questions, gifting help and order support, visit your account or explore the collection.</p><Link to="/account" className="inline-flex mt-6 text-[10px] uppercase tracking-[.2em] text-[#b4bf41]">Customer care ↗</Link></div>
        <div><h4 className="text-[9px] uppercase tracking-[.28em] text-[#b4bf41]">Explore</h4><div className="mt-5 space-y-3 text-sm text-white/55"><Link className="block hover:text-white transition" to="/shop">Collection</Link><Link className="block hover:text-white transition" to="/about">The House</Link><Link className="block hover:text-white transition" to="/journal">Journal</Link><Link className="block hover:text-white transition" to="/gifting">Gifting</Link></div></div>
        <div><h4 className="text-[9px] uppercase tracking-[.28em] text-[#b4bf41]">Customer</h4><div className="mt-5 space-y-3 text-sm text-white/55"><Link className="block hover:text-white transition" to="/track">Track order</Link><Link className="block hover:text-white transition" to="/account">Account</Link><Link className="block hover:text-white transition" to="/shop">Fragrance care</Link><Link className="block hover:text-white transition" to="/gifting">Gift guide</Link></div></div>
        <div><h4 className="text-[9px] uppercase tracking-[.28em] text-[#b4bf41]">Follow the house</h4><div className="mt-5 flex flex-wrap gap-2"><a className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase tracking-[.18em] text-white/55 hover:border-[#b4bf41] hover:text-[#b4bf41] transition" href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a><a className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase tracking-[.18em] text-white/55 hover:border-[#b4bf41] hover:text-[#b4bf41] transition" href="https://www.tiktok.com/" target="_blank" rel="noreferrer">TikTok</a><a className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase tracking-[.18em] text-white/55 hover:border-[#b4bf41] hover:text-[#b4bf41] transition" href="https://www.pinterest.com/" target="_blank" rel="noreferrer">Pinterest</a><a className="rounded-full border border-white/10 px-4 py-2 text-[9px] uppercase tracking-[.18em] text-white/55 hover:border-[#b4bf41] hover:text-[#b4bf41] transition" href="https://www.facebook.com/" target="_blank" rel="noreferrer">Facebook</a></div></div>
      </div>
      <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-[8px] uppercase tracking-[.22em] text-white/25"><span>© 2026 AFSANA PERFUMES</span><span>PRIVACY · TERMS · COOKIES</span><span>THE ART OF SCENT</span></div>
    </Container>
   </div>
  </footer>
  {search&&<div className="fixed inset-0 z-[65] bg-[#182308]/96 backdrop-blur-xl text-white overflow-y-auto">
    <Container className="container-xl min-h-full py-8 md:py-12">
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <div><div className="eyebrow text-[#b4bf41]">The Afsana search</div><h2 className="font-display text-4xl md:text-6xl mt-3">Search Afsana</h2></div>
        <button className="icon-btn" onClick={()=>setSearch(false)} aria-label="Close search" autoFocus><X/></button>
      </div>
      <form onSubmit={submit} className="mt-14 border-b border-white/25 flex items-center">
        <Search className="w-5 h-5 text-[#b4bf41]"/>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search fragrances..." className="w-full bg-transparent px-5 py-6 font-display text-4xl md:text-6xl outline-none placeholder:text-white/20"/>
        <button className="text-[9px] uppercase tracking-[.25em] text-[#b4bf41]" type="submit">Search</button>
      </form>
      <div className="mt-14 grid gap-10 md:grid-cols-3">
        <div><div className="eyebrow text-[#b4bf41]">Popular paths</div><div className="mt-5 space-y-3">
          {['Signature','Oud','Floral','Fresh'].map(x=><button key={x} type="button" onClick={()=>{setQ(x);navigate('/shop?category='+x.toLowerCase());setSearch(false)}} className="block text-left font-display text-3xl hover:text-[#b4bf41]">{x}</button>)}
        </div></div>
        <div className="md:col-span-2 border-l border-white/10 md:pl-10">
          <div className="eyebrow text-[#b4bf41]">Find your ritual</div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {['Discover your signature','Choose a gift','Explore the collection'].map((x,i)=><button key={x} type="button" onClick={()=>{setSearch(false);navigate(i===0?'/shop':i===1?'/gifting':'/shop')}} className="border border-white/10 p-5 text-left hover:border-[#b4bf41] transition"><span className="text-[9px] uppercase tracking-[.18em] text-[#b4bf41]">0{i+1}</span><span className="block mt-8 font-display text-2xl">{x}</span></button>)}
          </div>
        </div>
      </div>
    </Container>
  </div>}
  <div className="fixed bottom-5 right-4 z-[55] md:hidden"><button type="button" aria-label="Open AI Concierge" onClick={()=>navigate('/shop')} className="rounded-full bg-[#b4bf41] text-[#263e0e] px-4 py-3 shadow-2xl text-[8px] uppercase tracking-[.18em] border border-[#263e0e]/10">AI Concierge ↗</button></div>
  <div className="fixed bottom-6 right-6 z-[55] hidden md:block">
    <div className="group relative">
      <button onClick={()=>navigate('/shop')} className="rounded-full bg-[#b4bf41] text-[#263e0e] px-5 py-3 shadow-xl text-[9px] uppercase tracking-[.2em] hover:scale-105">AI Concierge</button>
      <div className="pointer-events-none absolute bottom-full right-0 mb-3 w-72 translate-y-2 opacity-0 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 transition">
        <div className="bg-[#faf8f4] text-[#263e0e] p-5 shadow-2xl border border-[#748e40]/20">
          <div className="eyebrow text-[#748e40]">Afsana private concierge</div>
          <div className="mt-4 space-y-2">
            <button type="button" onClick={()=>navigate('/shop')} className="w-full border border-[#263e0e]/10 p-3 text-left text-xs">Find my signature scent</button>
            <button type="button" onClick={()=>navigate('/gifting')} className="w-full border border-[#263e0e]/10 p-3 text-left text-xs">Help me choose a gift</button>
            <button onClick={()=>navigate('/shop')} className="w-full border border-[#263e0e]/10 p-3 text-left text-xs">Explore collection</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <CartDrawer/>
 </div>;
}
