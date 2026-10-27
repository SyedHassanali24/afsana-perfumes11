import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, Moon, Search, ShoppingBag, Sun, User, X } from 'lucide-react';
import { useCart } from './CartContext';
import { useCustomer } from '../customer/CustomerAuthContext';
import { Container } from './ui';
import useApi from '../hooks/useApi';
import { shopContentApi } from '../services';

const nav=[{to:'/shop',label:'Shop All'},{to:'/shop?gender=Men',label:'For Him'},{to:'/shop?gender=Women',label:'For Her'},{to:'/track',label:'Track Order'}];
export default function ShopLayout(){
 const {count}=useCart(), content=useApi(()=>shopContentApi.get(),[]), announcement=content.data?.announcement;
 const {status}=useCustomer(), navigate=useNavigate(), location=useLocation(), isHome=location.pathname==='/', [open,setOpen]=useState(false);
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('afsana-shop-theme')||'system'}catch{return'system'}});
 const [q,setQ]=useState('');
 useEffect(()=>{const root=document.documentElement;if(theme==='system')root.removeAttribute('data-theme');else root.setAttribute('data-theme',theme);try{if(theme==='system')localStorage.removeItem('afsana-shop-theme');else localStorage.setItem('afsana-shop-theme',theme)}catch{}},[theme]);
 useEffect(()=>{if(!open)return;const fn=e=>{if(e.key==='Escape')setOpen(false)};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn)},[open]);
 const search=e=>{e.preventDefault();navigate(q.trim()?'/shop?q='+encodeURIComponent(q.trim()):'/shop');setOpen(false)};
 const icon='relative grid h-10 w-10 place-items-center rounded-full text-white/85 hover:bg-white/10 hover:text-gold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold';
 const navClass=({isActive})=>`relative py-5 text-[11px] uppercase tracking-[.2em] font-medium transition-colors ${isActive?'text-gold':'text-white/65 hover:text-white'} after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-gold after:transition-transform ${isActive?'scale-x-100':'scale-x-0'}`;
 return <div className="storefront-theme min-h-screen flex flex-col bg-bg text-ink">
   {announcement?.text&&<div className="luxury-dark text-gold text-center text-[10px] sm:text-xs uppercase tracking-[.2em] px-4 py-2.5 border-b border-gold/20">{announcement.link?<Link to={announcement.link} className="hover:text-white">{announcement.text}</Link>:announcement.text}</div>}
   <header className={`z-30 text-white transition-all ${isHome?'absolute top-0 left-0 right-0':'sticky top-0'}`}>
    <div className="absolute inset-0 luxury-dark-soft/80 backdrop-blur-xl border-b border-white/10"/>
    <Container className="relative flex h-16 sm:h-[74px] items-center gap-2">
      <button type="button" className={`md:hidden ${icon}`} aria-label={open?'Close menu':'Open menu'} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X className="w-5"/>:<Menu className="w-5"/>}</button>
      <Link to="/" className="group shrink-0 text-center"><span className="block font-display text-2xl sm:text-[1.8rem] tracking-wide text-white group-hover:text-gold transition">Afsana</span><span className="block text-[7px] uppercase tracking-[.42em] text-gold -mt-0.5">Perfumes</span></Link>
      <nav className="hidden md:flex items-center gap-7 ml-8" aria-label="Main">{nav.map(n=><NavLink key={n.to} to={n.to} end={n.to==='/shop'} className={navClass}>{n.label}</NavLink>)}</nav>
      <form onSubmit={search} className="hidden lg:flex ml-auto items-center w-52 border border-white/15 rounded-full px-3 bg-white/[.04] focus-within:border-gold/60" role="search"><Search className="w-4 h-4 text-white/50"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search fragrance" aria-label="Search perfumes" className="bg-transparent px-2 py-2.5 text-xs w-full focus:outline-none text-white placeholder:text-white/35"/></form>
      <div className="flex items-center ml-auto md:ml-0">
       <button type="button" className={icon} onClick={()=>setTheme(x=>x==='dark'?'light':'dark')} aria-label={theme==='dark'?'Switch to light theme':'Switch to dark theme'}>{theme==='dark'?<Sun className="w-4.5"/>:<Moon className="w-4.5"/>}</button>
       <Link to="/wishlist" className={icon} aria-label="Wishlist"><Heart className="w-4.5"/></Link>
       <Link to={status==='authed'?'/account':'/login'} className={icon} aria-label={status==='authed'?'My account':'Sign in'}><User className="w-4.5"/></Link>
       <Link to="/cart" className={icon} aria-label={`Cart, ${count} items`}><ShoppingBag className="w-4.5"/>{count>0&&<span className="absolute right-0 top-0.5 min-w-4 h-4 px-1 rounded-full bg-gold text-[#24152b] text-[9px] leading-4 text-center font-bold">{count}</span>}</Link>
      </div>
    </Container>
    {open&&<div className="md:hidden relative border-t border-white/10 luxury-dark-soft shadow-2xl"><div className="px-4 py-5 space-y-5"><form onSubmit={search} className="flex items-center border border-white/15 rounded-full px-3"><Search className="w-4 h-4 text-white/45"/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search fragrance" className="bg-transparent px-2 py-2.5 text-sm w-full focus:outline-none text-white"/></form><nav className="grid grid-cols-2 gap-2">{nav.map(n=><NavLink key={n.to} to={n.to} end={n.to==='/shop'} onClick={()=>setOpen(false)} className={({isActive})=>`py-3 border-b border-white/10 text-xs uppercase tracking-[.2em] ${isActive?'text-gold':'text-white/60'}`}>{n.label}</NavLink>)}</nav></div></div>}
   </header>
   <main className={`flex-1 ${isHome?'':'py-6 sm:py-8'}`}><Outlet/></main>
   <footer className="mt-0 luxury-dark text-white border-t border-gold/15">
    <Container className="py-14 sm:py-18 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
      <div className="lg:col-span-2"><p className="font-display text-3xl text-white">Afsana</p><p className="text-[9px] uppercase tracking-[.35em] text-gold mt-1">Perfumes</p><p className="text-white/55 mt-5 max-w-md text-sm leading-7">Fragrance with character. A considered collection for people who want to be remembered.</p><div className="gold-line w-20 mt-6"/></div>
      <div><p className="text-[10px] uppercase tracking-[.25em] text-gold mb-4">Explore</p><div className="space-y-3 text-sm text-white/60"><Link className="block hover:text-white" to="/shop">Shop all</Link><Link className="block hover:text-white" to="/shop?gender=Men">For him</Link><Link className="block hover:text-white" to="/shop?gender=Women">For her</Link></div></div>
      <div><p className="text-[10px] uppercase tracking-[.25em] text-gold mb-4">Customer care</p><div className="space-y-3 text-sm text-white/60"><Link className="block hover:text-white" to="/track">Track order</Link><Link className="block hover:text-white" to="/account">My account</Link><Link className="block hover:text-white" to="/wishlist">Wishlist</Link></div></div>
    </Container>
    <div className="border-t border-white/10 py-5 text-center text-[10px] uppercase tracking-[.18em] text-white/35">© {new Date().getFullYear()} Afsana Perfumes · Crafted with intention</div>
   </footer>
 </div>;
}
