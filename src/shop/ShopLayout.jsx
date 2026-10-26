import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Heart, Menu, Moon, Search, ShoppingBag, Sun, User, X, Sparkles, ShieldCheck, Truck, Clock } from 'lucide-react';
import { useCart } from './CartContext';
import { useCustomer } from '../customer/CustomerAuthContext';
import { useWishlist } from './WishlistContext';
import { Container } from './ui';
import useApi from '../hooks/useApi';
import { shopContentApi, settingsApi } from '../services';
import CartDrawer from './CartDrawer';
import NewsletterSubscription from './components/NewsletterSubscription';

const navLinks = [
  { to: '/shop', label: 'All Fragrances' },
  { to: '/shop?gender=Men', label: 'For Him' },
  { to: '/shop?gender=Women', label: 'For Her' },
  { to: '/shop?gender=Unisex', label: 'L\'Art Unisexe' },
  { to: '/shop?category=discovery-sets', label: 'Discovery Coffret' },
  { to: '/track', label: 'Track Order' },
];

export default function ShopLayout() {
  const { count, openDrawer } = useCart();
  const { list } = useWishlist();
  const content = useApi(() => shopContentApi.get(), []);
  const settings = useApi(() => settingsApi.public(), []);
  const announcement = content.data?.announcement;
  const storeInfo = settings.data?.store || {};
  const { status, customer } = useCustomer();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('afsana-shop-theme') || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      if (theme === 'system') localStorage.removeItem('afsana-shop-theme');
      else localStorage.setItem('afsana-shop-theme', theme);
    } catch { /* storage fallback */ }
  }, [theme]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/shop?q=${encodeURIComponent(q.trim())}`);
      setSearchOpen(false);
      setMobileMenuOpen(false);
    }
  };

  const iconBtn = 'relative p-2.5 rounded-full text-ink-muted hover:text-gold transition-colors';

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink selection:bg-gold/30 selection:text-gold">
      {/* Global Slide-Over Cart Drawer */}
      <CartDrawer />

      {/* Top Luxury Announcement Bar */}
      {announcement?.text && (
        <aside aria-label="Announcement" className="bg-gradient-to-r from-[#181C15] via-[#242A1D] to-[#181C15] border-b border-gold/20 text-center text-xs py-2 px-4 text-gold">
          <Container className="flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-gold flex-shrink-0" />
            {announcement.link ? (
              <Link to={announcement.link} className="hover:underline tracking-wide">
                {announcement.text}
              </Link>
            ) : (
              <span className="tracking-wide">{announcement.text}</span>
            )}
          </Container>
        </aside>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/90 backdrop-blur-md transition-all">
        <Container className="flex items-center justify-between h-20 gap-4">
          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="lg:hidden p-2 text-ink-muted hover:text-ink"
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Brand Logo & Heritage Wordmark */}
          <Link to="/" className="flex flex-col items-start group">
            <span className="font-display text-2xl sm:text-3xl font-medium tracking-widest text-gold group-hover:text-gold-hover transition-colors">
              AFSANA
            </span>
            <span className="text-[9px] uppercase tracking-[0.3em] text-ink-muted -mt-1 font-sans">
              Haute Parfumerie · Privé
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8 text-xs uppercase tracking-widest font-medium" aria-label="Main Navigation">
            {navLinks.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `transition-colors py-1 relative hover:text-gold ${
                    isActive ? 'text-gold font-semibold' : 'text-ink-muted'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* Utility Icons & CTAs */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Search Toggle */}
            <button
              type="button"
              className={iconBtn}
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search fragrances"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              className={iconBtn}
              onClick={() => setTheme((curr) => (curr === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Switch to Alabaster light theme' : 'Switch to Onyx dark theme'}
              title={theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Wishlist Link */}
            <Link
              to="/wishlist"
              className={iconBtn}
              aria-label={`Wishlist, ${list?.length || 0} items`}
            >
              <Heart className="w-5 h-5" />
              {(list?.length || 0) > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gold text-bg text-[10px] font-bold flex items-center justify-center">
                  {list.length}
                </span>
              )}
            </Link>

            {/* Customer Account / Sign In */}
            <Link
              to={status === 'authed' ? '/account' : '/login'}
              className={iconBtn}
              aria-label={status === 'authed' ? `Account (${customer?.name || 'Customer'})` : 'Sign In'}
            >
              <User className="w-5 h-5" />
            </Link>

            {/* Shopping Bag (Opens Cart Drawer) */}
            <button
              type="button"
              onClick={openDrawer}
              className="relative p-2.5 rounded-full text-ink-muted hover:text-gold transition-colors ml-1"
              aria-label={`Shopping Bag, ${count} item${count === 1 ? '' : 's'}`}
            >
              <ShoppingBag className="w-5 h-5 text-ink" />
              {count > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-gold text-bg text-[10px] font-bold leading-4 text-center">
                  {count}
                </span>
              )}
            </button>

            {/* Admin Panel Access */}
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 text-[11px] sm:text-xs font-medium tracking-wider uppercase transition-colors ml-1 sm:ml-2"
              title="Afsana Enterprise Admin Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-gold" />
              <span>Admin</span>
            </Link>
          </div>
        </Container>

        {/* Search Overlay Dropdown */}
        {searchOpen && (
          <div className="border-t border-border bg-surface-raised px-4 py-4 animate-fade-in shadow-xl">
            <Container>
              <form onSubmit={onSearchSubmit} className="relative max-w-2xl mx-auto flex items-center">
                <Search className="w-5 h-5 text-gold absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by fragrance name, note (e.g. Saffron, Rose, Oud), or category..."
                  autoFocus
                  className="w-full pl-12 pr-28 py-3.5 bg-surface border border-border focus:border-gold rounded-sm text-sm focus:outline-none text-ink placeholder:text-ink-muted/70"
                />
                <button
                  type="submit"
                  className="absolute right-2 px-4 py-2 bg-gold hover:bg-gold-hover text-bg text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors"
                >
                  Search
                </button>
              </form>
              <div className="max-w-2xl mx-auto mt-2.5 flex items-center gap-3 text-xs text-ink-muted">
                <span className="uppercase tracking-wider text-[10px]">Trending:</span>
                {['Sultan de L\'Oud', 'Velvet Rose', 'Amber Nuit', 'Extrait de Parfum'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => { setQ(term); navigate(`/shop?q=${encodeURIComponent(term)}`); setSearchOpen(false); }}
                    className="hover:text-gold transition-colors underline-offset-2 hover:underline"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </Container>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-surface px-6 py-6 space-y-4 animate-fade-in">
            <form onSubmit={onSearchSubmit} className="relative flex items-center mb-4">
              <Search className="w-4 h-4 text-ink-muted absolute left-3" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search perfumes..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-raised border border-border rounded-sm text-sm focus:outline-none focus:border-gold"
              />
            </form>
            <div className="space-y-3 font-display text-lg">
              {navLinks.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-1 hover:text-gold transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </div>
            <div className="pt-4 border-t border-border space-y-3">
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 px-4 rounded-sm bg-gold/15 hover:bg-gold/25 text-gold border border-gold/40 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Panel · Management Portal</span>
              </Link>
              <div className="flex items-center justify-between text-xs text-ink-muted px-1">
                <span>Afsana Parfums Privé</span>
                <Link
                  to="/admin/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gold hover:underline"
                >
                  Staff Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Editorial Luxury Footer */}
      <footer className="border-t border-border bg-surface mt-20">
        {/* Newsletter Subscription Component */}
        <NewsletterSubscription />

        {/* Value Pillars Banner */}
        <div className="border-b border-border py-10 bg-surface-raised/40">
          <Container className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display text-sm font-semibold">100% Pure Extraits</p>
                <p className="text-xs text-ink-muted">30%+ Concentration for 14h+ wear</p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold flex-shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display text-sm font-semibold">Complimentary Express Delivery</p>
                <p className="text-xs text-ink-muted">Free on all orders over PKR 5,000</p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display text-sm font-semibold">Discovery Guarantee</p>
                <p className="text-xs text-ink-muted">Sample tester included with each bottle</p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display text-sm font-semibold">Cash on Delivery & Bank Transfer</p>
                <p className="text-xs text-ink-muted">Payment options designed for you</p>
              </div>
            </div>
          </Container>
        </div>

        {/* Footer Main Links */}
        <Container className="py-16 grid grid-cols-1 md:grid-cols-5 gap-10 text-sm">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="block">
              <span className="font-display text-2xl font-medium tracking-widest text-gold">
                AFSANA
              </span>
              <p className="text-[10px] uppercase tracking-[0.25em] text-ink-muted">Haute Parfumerie · Privé</p>
            </Link>
            <p className="text-xs text-ink-muted leading-relaxed max-w-sm">
              Artisanal Haute Parfumerie born from the marriage of French mastery and imperial Oriental heritage. Macerated for 18 months using wild agarwood, Taif rose, and precious resins.
            </p>
            <div className="pt-2 text-xs text-ink-muted space-y-1">
              <p><strong className="text-ink">Concierge:</strong> {storeInfo.phone || '+92 300 123 4567'}</p>
              <p><strong className="text-ink">Email:</strong> {storeInfo.email || 'concierge@afsana.pk'}</p>
              <p><strong className="text-ink">Salon:</strong> {storeInfo.address || 'Gulberg Galleria, Main Boulevard, Lahore'}</p>
            </div>
          </div>

          {/* Haute Collections */}
          <div className="space-y-3">
            <p className="font-display text-base font-medium tracking-tight text-ink">Collections</p>
            <div className="space-y-2 text-xs text-ink-muted flex flex-col">
              <Link to="/shop" className="hover:text-gold transition-colors">All Creations</Link>
              <Link to="/shop?gender=Men" className="hover:text-gold transition-colors">Pour Homme (Men)</Link>
              <Link to="/shop?gender=Women" className="hover:text-gold transition-colors">Pour Femme (Women)</Link>
              <Link to="/shop?gender=Unisex" className="hover:text-gold transition-colors">L&apos;Art Unisexe</Link>
              <Link to="/shop?category=discovery-sets" className="hover:text-gold transition-colors">Discovery Coffret</Link>
            </div>
          </div>

          {/* Client Concierge */}
          <div className="space-y-3">
            <p className="font-display text-base font-medium tracking-tight text-ink">Client Concierge</p>
            <div className="space-y-2 text-xs text-ink-muted flex flex-col">
              <Link to="/track" className="hover:text-gold transition-colors">Track Your Order</Link>
              <Link to="/account" className="hover:text-gold transition-colors">VIP Account & Orders</Link>
              <Link to="/wishlist" className="hover:text-gold transition-colors">Saved Wishlist</Link>
              <Link to="/cart" className="hover:text-gold transition-colors">Shopping Bag</Link>
              <a href="https://wa.me/923001234567" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                WhatsApp Concierge
              </a>
            </div>
          </div>

          {/* Staff & Admin Access */}
          <div className="space-y-3">
            <p className="font-display text-base font-medium tracking-tight text-ink">Administration</p>
            <div className="space-y-2 text-xs text-ink-muted flex flex-col">
              <Link to="/admin" className="text-gold font-medium hover:underline flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Panel Dashboard</span>
              </Link>
              <Link to="/admin/login" className="hover:text-gold transition-colors">
                Staff Sign In Portal
              </Link>
              <Link to="/admin" className="text-[11px] text-ink-muted/80 hover:text-gold transition-colors">
                Quick Demo: admin@afsana.pk
              </Link>
              <span className="text-[11px] text-ink-muted/60 pt-2 block">
                Afsana Enterprise Operations · 14 Modules
              </span>
            </div>
          </div>
        </Container>

        {/* Bottom Bar */}
        <div className="border-t border-border py-6 text-center text-xs text-ink-muted">
          <Container className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} Afsana Haute Parfumerie. All rights reserved.</p>
            <p className="text-[11px] tracking-wider text-gold font-serif">
              Crafted with Excellence · Lahore & Paris
            </p>
          </Container>
        </div>
      </footer>
    </div>
  );
}
