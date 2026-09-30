import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useCart } from './CartContext';
import { useCustomer } from '../customer/CustomerAuthContext';
import { Container } from './ui';

const nav = [{ to: '/shop', label: 'Shop' }, { to: '/shop?gender=Men', label: 'For Him' }, { to: '/shop?gender=Women', label: 'For Her' }, { to: '/track', label: 'Track order' }];

export default function ShopLayout() {
  const { count } = useCart();
  const { status } = useCustomer();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const search = (e) => { e.preventDefault(); navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop'); setOpen(false); };
  const icon = 'relative p-2 text-ink hover:text-gold';

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur">
        <Container className="flex items-center gap-4 h-16">
          <button type="button" className="md:hidden p-2" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
          <Link to="/" className="font-display text-2xl" style={{ color: 'var(--gold)' }}>Afsana</Link>
          <nav className="hidden md:flex items-center gap-6 ml-6 text-sm" aria-label="Main">
            {nav.map((n) => <NavLink key={n.to} to={n.to} end className="text-ink-muted hover:text-ink">{n.label}</NavLink>)}
          </nav>
          <form onSubmit={search} className="hidden md:flex ml-auto items-center border border-border rounded-sm px-2 w-56" role="search">
            <Search className="w-4 h-4 text-ink-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search perfumes" aria-label="Search perfumes" className="bg-transparent px-2 py-1.5 text-sm w-full focus:outline-none" />
          </form>
          <div className="flex items-center ml-auto md:ml-0">
            <Link to="/wishlist" className={icon} aria-label="Wishlist"><Heart className="w-5 h-5" /></Link>
            <Link to={status === 'authed' ? '/account' : '/login'} className={icon} aria-label={status === 'authed' ? 'My account' : 'Sign in'}><User className="w-5 h-5" /></Link>
            <Link to="/cart" className={icon} aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
              <ShoppingBag className="w-5 h-5" />
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 h-4 px-1 rounded-full bg-gold text-bg text-[10px] leading-4 text-center font-semibold">{count}</span>}
            </Link>
          </div>
        </Container>
        {open && (
          <div className="md:hidden border-t border-border bg-bg px-4 py-3 space-y-3">
            <form onSubmit={search} className="flex items-center border border-border rounded-sm px-2" role="search">
              <Search className="w-4 h-4 text-ink-muted" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search perfumes" aria-label="Search perfumes" className="bg-transparent px-2 py-2 text-sm w-full focus:outline-none" />
            </form>
            {nav.map((n) => <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block py-1 text-sm">{n.label}</Link>)}
          </div>
        )}
      </header>

      <main className="flex-1 py-8"><Outlet /></main>

      <footer className="border-t border-border mt-12">
        <Container className="py-10 grid gap-6 sm:grid-cols-3 text-sm">
          <div><p className="font-display text-xl" style={{ color: 'var(--gold)' }}>Afsana Perfumes</p><p className="text-ink-muted mt-2">Fragrances for every mood and moment.</p></div>
          <div className="space-y-1.5"><p className="font-medium">Shop</p><Link to="/shop" className="block text-ink-muted hover:text-ink">All perfumes</Link><Link to="/track" className="block text-ink-muted hover:text-ink">Track an order</Link></div>
          <div className="space-y-1.5"><p className="font-medium">Account</p><Link to="/account" className="block text-ink-muted hover:text-ink">My orders</Link><Link to="/wishlist" className="block text-ink-muted hover:text-ink">Wishlist</Link></div>
        </Container>
        <div className="border-t border-border py-4 text-center text-xs text-ink-muted">© {new Date().getFullYear()} Afsana Perfumes</div>
      </footer>
    </div>
  );
}
