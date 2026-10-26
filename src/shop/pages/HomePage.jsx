import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Star, ShieldCheck, Truck, RefreshCw, Compass } from 'lucide-react';
import useApi from '../../hooks/useApi';
import { productsApi, publicTaxonomyApi, shopContentApi } from '../../services';
import { Container, StateBox, CardsSkeleton, Placeholder } from '../ui';
import ProductCard from '../ProductCard';
import useTitle from '../useTitle';

function ProductRow({ title, subtitle, query, viewAllLink }) {
  const { data, loading, error, reload } = useApi(() => productsApi.list({ ...query, limit: 4 }), [JSON.stringify(query)]);
  const list = data?.products || [];

  return (
    <section className="py-16 sm:py-24 border-b border-border/40">
      <Container>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gold font-medium mb-1.5">Haute Parfumerie</p>
            <h2 className="font-display text-2xl sm:text-4xl tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm text-ink-muted mt-1.5 max-w-lg">{subtitle}</p>}
          </div>
          <Link
            to={viewAllLink}
            className="group flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-gold hover:text-gold-hover transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <StateBox
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!list.length}
          emptyText="New Haute Parfumerie batches currently aging in maturation."
          skeleton={<CardsSkeleton n={4} />}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </StateBox>
      </Container>
    </section>
  );
}

export default function HomePage() {
  useTitle('Afsana Perfumes | Haute Parfumerie Privé');
  const cats = useApi(() => publicTaxonomyApi.list('categories'), []);
  const families = useApi(() => publicTaxonomyApi.list('fragranceFamilies'), []);
  const content = useApi(() => shopContentApi.get(), []);

  const [activeFamily, setActiveFamily] = useState(null);
  const banners = content.data?.banners || [];
  const faqs = content.data?.faqs || [];
  const categories = (cats.data?.items || []).filter((c) => !c.parentId);

  const mainBanner = banners[0] || {
    heading: 'The Splendor of Haute Fragrance',
    subtitle: 'Artisanal Extraits de Parfum macerated with wild Cambodian agarwood, Taif rose petals, and crystalline ambergris.',
    buttonText: 'Discover Collection',
    buttonLink: '/shop',
    desktopImage: {
      url: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1920&q=85',
      alt: 'Afsana Perfume Bottle',
    },
  };

  return (
    <div className="space-y-0">
      {/* 1. Cinematic Hero Section */}
      <section className="relative min-h-[580px] sm:min-h-[720px] flex items-center justify-center overflow-hidden border-b border-border bg-[#0B0D09]">
        {/* Background Visual with Ambient Lighting */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img
            src={mainBanner.desktopImage?.url}
            alt={mainBanner.desktopImage?.alt || 'Afsana Haute Parfumerie Flacon'}
            className="w-full h-full object-cover object-center scale-105 animate-fade-in filter brightness-[0.7] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D09] via-[#0B0D09]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0D09]/80 via-transparent to-[#0B0D09]/80" />
        </div>

        {/* Hero Content */}
        <Container className="py-24 sm:py-32 text-center relative z-10">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold/10 border border-gold/30 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              <span className="text-[11px] uppercase tracking-[0.25em] text-gold font-semibold">
                Haute Parfumerie Privé · Edition 2026
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-white leading-[1.1] text-balance">
              {mainBanner.heading}
            </h1>

            <p className="text-sm sm:text-base text-white/80 max-w-xl mx-auto font-light leading-relaxed">
              {mainBanner.subtitle}
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={mainBanner.buttonLink || '/shop'}
                className="w-full sm:w-auto px-8 py-4 rounded-sm bg-gold hover:bg-gold-hover text-bg text-xs font-semibold uppercase tracking-widest transition-all shadow-luxury hover:scale-[1.02] active:scale-[0.99]"
              >
                {mainBanner.buttonText || 'Explore Flacons'}
              </Link>
              <Link
                to="/shop?category=discovery-sets"
                className="w-full sm:w-auto px-8 py-4 rounded-sm border border-gold/40 hover:border-gold text-white hover:text-gold text-xs font-semibold uppercase tracking-widest backdrop-blur-md transition-colors"
              >
                Order Discovery Coffret
              </Link>
            </div>

            {/* Micro Pillars */}
            <div className="pt-10 grid grid-cols-3 gap-2 border-t border-white/10 max-w-lg mx-auto text-[11px] text-white/70 uppercase tracking-wider">
              <span>32% Extrait Strength</span>
              <span className="border-x border-white/10">Free Express Delivery</span>
              <span>Tester Vial Included</span>
            </div>
          </div>
        </Container>
      </section>

      {/* 2. Maison Story & Heritage */}
      <section className="py-20 sm:py-28 border-b border-border/40 bg-surface">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 relative">
              <div className="aspect-[4/5] rounded-sm overflow-hidden border border-border shadow-2xl relative">
                <img
                  src="https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=85"
                  alt="Afsana Fragrance Maceration"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-[10px] uppercase tracking-widest text-gold font-semibold">Cold Maceration Process</p>
                  <p className="font-display text-lg">18-Month Maturation in French Glass Flacons</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <p className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">The House of Afsana</p>
              <h2 className="font-display text-3xl sm:text-5xl tracking-tight leading-tight">
                Where French Haute Parfumerie Meets Imperial Oriental Majesty
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Founded with a singular uncompromising ambition: to resurrect the lost art of true Extrait de Parfum. In an era dominated by synthetic, fleeting department store scents, Afsana formulates at extraordinary 28% to 32% oil concentrations.
              </p>
              <p className="text-sm text-ink-muted leading-relaxed">
                Every flacon is infused with aged Cambodian wild agarwood, Taif rose petals harvested at dawn, and ethically sourced golden ambergris. We ship every bottle with a complimentary 2ml sample vial so you can experience the fragrance first on your skin.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4 border-t border-border">
                <div>
                  <p className="font-display text-2xl text-gold font-semibold">14h+</p>
                  <p className="text-xs text-ink-muted uppercase tracking-wider mt-1">Average Longevity</p>
                </div>
                <div>
                  <p className="font-display text-2xl text-gold font-semibold">32%</p>
                  <p className="text-xs text-ink-muted uppercase tracking-wider mt-1">Oil Concentration</p>
                </div>
                <div>
                  <p className="font-display text-2xl text-gold font-semibold">100%</p>
                  <p className="text-xs text-ink-muted uppercase tracking-wider mt-1">Authentic Essences</p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-gold hover:text-gold-hover group"
                >
                  <span>Explore The Artisanal Compendium</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 3. Signature Best-Sellers Row */}
      <ProductRow
        title="Signature Extraits"
        subtitle="Our most celebrated flacons, revered by fragrance connoisseurs for their sillage and magnetic presence."
        query={{ sort: 'popular' }}
        viewAllLink="/shop?sort=popular"
      />

      {/* 4. Interactive Olfactive Families Explorer */}
      <section className="py-20 sm:py-28 border-b border-border/40 bg-surface-raised/40">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-gold font-semibold">
              <Compass className="w-3.5 h-3.5" />
              <span>Olfactive Families</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Discover By Scent Architecture</h2>
            <p className="text-xs sm:text-sm text-ink-muted">
              Whether you are drawn to deep smoked woods or sparkling dewy florals, explore creations categorized by family.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
            <button
              type="button"
              onClick={() => setActiveFamily(null)}
              className={`px-5 py-2.5 rounded-sm text-xs uppercase tracking-wider font-medium transition-all ${
                activeFamily === null
                  ? 'bg-gold text-bg shadow-sm font-semibold'
                  : 'bg-surface border border-border text-ink-muted hover:text-ink'
              }`}
            >
              All Families
            </button>
            {(families.data?.items || []).map((fam) => (
              <button
                key={fam.id}
                type="button"
                onClick={() => setActiveFamily(fam.slug)}
                className={`px-5 py-2.5 rounded-sm text-xs uppercase tracking-wider font-medium transition-all ${
                  activeFamily === fam.slug
                    ? 'bg-gold text-bg shadow-sm font-semibold'
                    : 'bg-surface border border-border text-ink-muted hover:text-ink'
                }`}
              >
                {fam.name}
              </button>
            ))}
          </div>

          <div className="text-center">
            <Link
              to={activeFamily ? `/shop?family=${activeFamily}` : '/shop'}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-sm bg-surface border border-gold/40 hover:border-gold text-gold text-xs uppercase tracking-widest font-semibold transition-colors"
            >
              <span>Browse {activeFamily ? 'This Family' : 'All Fragrances'} in Boutique</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* 5. Curated Gender Portals (Pour Homme / Pour Femme / L'Art Unisexe) */}
      <section className="py-20 sm:py-28 border-b border-border/40 bg-surface">
        <Container>
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-gold font-medium mb-1">Tailored Portals</p>
              <h2 className="font-display text-2xl sm:text-4xl tracking-tight">Curated By Persona</h2>
            </div>
            <Link to="/shop" className="text-xs uppercase tracking-widest font-semibold text-gold hover:underline">
              View All (8)
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pour Homme */}
            <Link
              to="/shop?gender=Men"
              className="group relative aspect-[3/4] overflow-hidden rounded-sm border border-border bg-surface-raised"
            >
              <img
                src="https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=85"
                alt="Afsana Pour Homme"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold font-semibold">The Gentleman</p>
                <h3 className="font-display text-2xl font-normal">Pour Homme</h3>
                <p className="text-xs text-white/70">Oud, Cuban Tobacco, Smoked Suede & Spices</p>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-gold font-medium">
                  <span>Explore Masculine Extraits</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            {/* Pour Femme */}
            <Link
              to="/shop?gender=Women"
              className="group relative aspect-[3/4] overflow-hidden rounded-sm border border-border bg-surface-raised"
            >
              <img
                src="https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=1000&q=85"
                alt="Afsana Pour Femme"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold font-semibold">The Enchantress</p>
                <h3 className="font-display text-2xl font-normal">Pour Femme</h3>
                <p className="text-xs text-white/70">Taif Rose, White Musk, Nashi Pear & Bourbon Vanilla</p>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-gold font-medium">
                  <span>Explore Feminine Extraits</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            {/* L'Art Unisexe */}
            <Link
              to="/shop?gender=Unisex"
              className="group relative aspect-[3/4] overflow-hidden rounded-sm border border-border bg-surface-raised"
            >
              <img
                src="https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1000&q=85"
                alt="Afsana Unisexe"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold font-semibold">Genderless Haute Art</p>
                <h3 className="font-display text-2xl font-normal">L&apos;Art Unisexe</h3>
                <p className="text-xs text-white/70">Golden Amber, Tuscan Iris & Mediterranean Neroli</p>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-gold font-medium">
                  <span>Explore Signature Extraits</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </div>
        </Container>
      </section>

      {/* 6. The Discovery Coffret VIP Feature */}
      <section className="py-20 sm:py-28 border-b border-border/40 bg-gradient-to-b from-[#121510] to-[#0B0D09] text-white">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs uppercase tracking-wider font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>The Perfect Introduction</span>
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-normal tracking-tight leading-tight">
                The Imperial Discovery Coffret
              </h2>
              <p className="text-sm text-white/80 leading-relaxed font-light">
                Cannot decide on a single flacon? Experience our five most legendary creations in bespoke 10ml travel sprays, housed in a lacquered presentation box.
              </p>
              <ul className="space-y-2.5 text-xs text-white/90 font-light">
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  <span>5x 10ml Extrait de Parfum Sprays (Sultan de L&apos;Oud, Velvet Rose, Amber Nuit, Tobacco Vanille, Cuir Noir)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  <span>Includes a <strong>PKR 2,000 Gift Voucher</strong> redeemable against your first full-size flacon</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  <span>Complimentary express courier delivery included</span>
                </li>
              </ul>
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                <Link
                  to="/product/the-imperial-discovery-set"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-sm bg-gold hover:bg-gold-hover text-bg text-xs font-semibold uppercase tracking-widest text-center shadow-lg transition-colors"
                >
                  Acquire Discovery Set — PKR 6,900
                </Link>
                <span className="text-xs text-white/60">Limited stock available</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="aspect-[4/3] rounded-sm overflow-hidden border border-gold/30 shadow-luxury">
                <img
                  src="https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=85"
                  alt="Discovery Coffret Collection"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 7. Verified Patron Reviews */}
      <section className="py-20 sm:py-28 border-b border-border/40 bg-surface">
        <Container>
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-gold font-medium">Patron Acclaim</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Words of Admiration</h2>
            <p className="text-xs sm:text-sm text-ink-muted">Reviews from verified collectors and patrons across Pakistan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Barrister Daniyal Qureshi',
                city: 'Lahore',
                fragrance: 'Sultan de L\'Oud',
                rating: 5,
                text: 'The Cambodian Oud is dark, majestic and velvety. I received compliments from colleagues hours after application. Truly rivals Roja and Clive Christian.',
              },
              {
                name: 'Dr. Ayesha Al-Mansoor',
                city: 'Karachi',
                fragrance: 'Velvet Rose & Santal',
                rating: 5,
                text: 'Velvet Rose & Santal is breathtaking. The rose is fresh and dewy, and the sandalwood dry-down is utterly intoxicating. My new everyday signature.',
              },
              {
                name: 'Hamza Farooq',
                city: 'Islamabad',
                fragrance: 'Tobacco Vanille Intense',
                rating: 5,
                text: 'Rich, masculine and aristocratic. Reminds me of Tom Ford but smoother with darker cacao and spiced honey. Fantastic longevity on woolen blazers.',
              },
            ].map((rev, i) => (
              <div
                key={i}
                className="p-6 rounded-sm bg-surface-raised border border-border flex flex-col justify-between shadow-sm space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-gold">
                    {[...Array(rev.rating)].map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="text-xs italic text-ink/90 leading-relaxed font-serif text-sm">
                    &ldquo;{rev.text}&rdquo;
                  </p>
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-ink">{rev.name}</p>
                    <p className="text-[11px] text-ink-muted">{rev.city} · Verified Patron</p>
                  </div>
                  <span className="text-[10px] font-medium text-gold uppercase tracking-wider">{rev.fragrance}</span>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 8. CMS Frequently Asked Questions */}
      {faqs.length > 0 && (
        <section className="py-20 sm:py-28 border-b border-border/40 bg-surface-raised/40">
          <Container>
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12 space-y-2">
                <p className="text-xs uppercase tracking-[0.25em] text-gold font-medium">Concierge Inquiries</p>
                <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Frequently Answered Questions</h2>
              </div>
              <div className="divide-y divide-border border-y border-border">
                {faqs.map((faq) => (
                  <details key={faq.id} className="py-5 group">
                    <summary className="cursor-pointer list-none font-display text-base sm:text-lg flex items-center justify-between gap-4 text-ink hover:text-gold transition-colors">
                      <span>{faq.question}</span>
                      <span className="text-gold text-2xl transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                    </summary>
                    <p className="mt-3 text-xs sm:text-sm leading-relaxed text-ink-muted whitespace-pre-line pl-1 font-sans">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* 9. Maison VIP Club & Newsletter */}
      <section className="py-20 sm:py-24 bg-[#0B0D09] text-white">
        <Container className="text-center max-w-xl mx-auto space-y-5">
          <p className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Maison Privée</p>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Join The Connoisseur Club</h2>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-light">
            Receive private allocations of limited batch extraits, invitations to smelling salons in Lahore & Karachi, and an immediate 10% welcome privilege code.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); alert('Welcome to the Afsana Connoisseur Club. Your privilege code is WELCOME10.'); }}
            className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2"
          >
            <input
              type="email"
              placeholder="Enter your email address"
              required
              className="px-4 py-3 bg-[#181C15] border border-gold/30 rounded-sm text-xs focus:outline-none focus:border-gold flex-1 text-white placeholder:text-white/40"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-sm bg-gold hover:bg-gold-hover text-bg text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Request Access
            </button>
          </form>
        </Container>
      </section>
    </div>
  );
}
