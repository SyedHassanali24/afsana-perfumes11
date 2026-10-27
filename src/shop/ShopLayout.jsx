import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, Moon, Search, ShoppingBag, Sun, User, X } from 'lucide-react';
import { useCart } from './CartContext';
import { useCustomer } from '../customer/CustomerAuthContext';
import { Container } from './ui';
import useApi from '../hooks/useApi';
import { shopContentApi } from '../services';

const isExternal = (url) => /^https?:\/\//i.test(String(url || ''));
const SmartLink = ({ to, children, ...props }) => isExternal(to) ? <a href={to} {...props}>{children}</a> : <Link to={to} {...props}>{children}</Link>;

const nav = [
  { to: '/shop', label: 'Shop' },
  { to: '/shop?gender=Men', label: 'For Him' },
  { to: '/shop?gender=Women', label: 'For Her' },
  { to: '/track', label: 'Track order' },
];

export default function ShopLayout() {
  const { count } = useCart();
  const content = useApi(() => shopContentApi.get(), []);
  const announcement = content.data?.announcement;
  const { status } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('afsana-shop-theme') || 'system'; } catch { return 'system'; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      if (theme === 'system') localStorage.removeItem('afsana-shop-theme');
      else localStorage.setItem('afsana-shop-theme', theme);
    } catch { /* storage may be unavailable */ }
  }, [theme]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const [q, setQ] = useState('');
  const search = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
    setOpen(false);
  };

  const icon = 'relative flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
  const navClass = ({ isActive }) => `relative py-5 text-sm transition-colors ${isActive ? 'text-ink' : 'text-white/70 hover:text-gold'} after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-primary after:transition-transform ${isActive ? 'scale-x-100' : 'scale-x-0'}`;

  return (
    <div className="storefront-theme min-h-screen flex flex-col bg-bg text-ink">
      {announcement?.text && (
        <div className="bg-primary text-white text-center text-xs sm:text-sm px-4 py-2">
          {announcement.link ? <SmartLink to={announcement.link} className="underline underline-offset-2">{announcement.text}</SmartLink> : announcement.text}
        </div>
      )}

      <header className={`${isHome ? "absolute top-0 left-0 right-0" : "sticky top-0"} z-30 border-b border-white/10 bg-[#24152b]/90 text-white backdrop-blur-md shadow-lg`}>
        <Container className="flex h-14 sm:h-16 items-center gap-1 sm:gap-3">
          <button
            type="button"
            className={`md:hidden ${icon}`}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="font-display text-[1.55rem] sm:text-2xl tracking-tight shrink-0 text-gold">
            Afsana
          </Link>

          <nav className="hidden md:flex items-center gap-6 ml-6" aria-label="Main">
            {nav.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/shop'} className={navClass}>{n.label}</NavLink>)}
          </nav>

          <form onSubmit={search} className="hidden lg:flex ml-auto items-center border border-white/20 rounded-full px-3 w-60 focus-within:border-gold/70 transition-colors" role="search">
            <Search className="w-4 h-4 text-white/60 shrink-0" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search perfumes" aria-label="Search perfumes" className="bg-transparent px-2 py-2 text-sm w-full focus:outline-none" />
          </form>

          <div className="flex items-center ml-auto md:ml-0">
            <button type="button" className={icon} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Light theme' : 'Dark theme'}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link to="/wishlist" className={icon} aria-label="Wishlist"><Heart className="w-5 h-5" /></Link>
            <Link to={status === 'authed' ? '/account' : '/login'} className={icon} aria-label={status === 'authed' ? 'My account' : 'Sign in'}><User className="w-5 h-5" /></Link>
            <Link to="/cart" className={icon} aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
              <ShoppingBag className="w-5 h-5" />
              {count > 0 && <span className="absolute right-0 top-0.5 min-w-4 h-4 px-1 rounded-full bg-gold text-[#24152b] text-[10px] leading-4 text-center font-semibold">{count}</span>}
            </Link>
          </div>
        </Container>

        {open && (
          <div className="md:hidden border-t border-border bg-bg shadow-lg">
            <div className="px-4 py-4 space-y-4">
              <form onSubmit={search} className="flex items-center border border-border rounded-full px-3 focus-within:border-primary/70" role="search">
                <Search className="w-4 h-4 text-ink-muted shrink-0" aria-hidden />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search perfumes" aria-label="Search perfumes" className="bg-transparent px-2 py-2.5 text-sm w-full focus:outline-none" />
              </form>
              <nav className="grid grid-cols-2 gap-x-6 gap-y-1" aria-label="Mobile">
                {nav.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.to === '/shop'} onClick={() => setOpen(false)} className={({ isActive }) => `block py-2.5 text-sm border-b border-border ${isActive ? 'text-primary font-medium' : 'text-ink-muted'}`}>
                    {n.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>

      <main className={`flex-1 ${isHome ? "" : "py-6 sm:py-8"}`}><Outlet /></main>

      <footer className="border-t border-[#3a2740] mt-12 bg-[#24152b] text-white">
        <Container className="py-10 grid gap-8 sm:grid-cols-3 text-sm">
          <div>
            <p className="font-display text-xl" style={{ color: 'var(--gold)' }}>Afsana Perfumes</p>
            <p className="text-ink-muted mt-2 max-w-xs">Fragrances for every mood and moment.</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-medium mb-2">Shop</p>
            <Link to="/shop" className="block text-ink-muted hover:text-ink">All perfumes</Link>
            <Link to="/track" className="block text-ink-muted hover:text-ink">Track an order</Link>
          </div>
          <div className="space-y-1.5">
            <p className="font-medium mb-2">Account</p>
            <Link to="/account" className="block text-ink-muted hover:text-ink">My orders</Link>
            <Link to="/wishlist" className="block text-ink-muted hover:text-ink">Wishlist</Link>
          </div>
        </Container>
        <div className="border-t border-border py-4 text-center text-xs text-ink-muted">© {new Date().getFullYear()} Afsana Perfumes</div>
      </footer>
    </div>
  );
}
