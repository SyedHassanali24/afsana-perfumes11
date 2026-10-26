import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Filter, X, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react';
import useApi from '../../hooks/useApi';
import { productsApi, publicTaxonomyApi } from '../../services';
import { Container, StateBox, CardsSkeleton, Pager } from '../ui';
import ProductCard from '../ProductCard';
import useTitle from '../useTitle';

const SORTS = [
  ['popular', 'Most Celebrated'],
  ['newest', 'Newest Creations'],
  ['price_asc', 'Price: Low to High'],
  ['price_desc', 'Price: High to Low'],
];

const KEYS = ['q', 'category', 'collection', 'brand', 'gender', 'family', 'note', 'sort', 'minPrice', 'maxPrice', 'page'];

export const OLFACTORY_NOTES = [
  { id: '', label: 'All Notes', desc: 'Full Palette' },
  { id: 'Oud', label: 'Oud', desc: 'Cambodian & Assam Agarwood' },
  { id: 'Floral', label: 'Floral', desc: 'Taif Rose, Iris, Lily' },
  { id: 'Spicy', label: 'Spicy', desc: 'Pink Pepper, Saffron, Ginger' },
  { id: 'Woody', label: 'Woody', desc: 'Mysore Sandalwood & Cedar' },
  { id: 'Amber', label: 'Amber', desc: 'Golden Resins & Benzoin' },
  { id: 'Leather', label: 'Leather', desc: 'Tuscan Leather & Smoke' },
  { id: 'Citrus', label: 'Citrus', desc: 'Bergamot & White Tea' },
  { id: 'Musk', label: 'Musk', desc: 'Silken White Musk' },
  { id: 'Vanilla', label: 'Vanilla', desc: 'Bourbon Vanilla & Tonka' },
];

export default function ShopPage() {
  useTitle('Haute Parfumerie Boutique | Afsana');
  const [sp, setSp] = useSearchParams();
  const get = (k) => sp.get(k) || '';
  const set = (patch) => {
    const n = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    if (!('page' in patch)) n.delete('page');
    setSp(n);
  };

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [price, setPrice] = useState({ min: get('minPrice'), max: get('maxPrice') });

  useEffect(() => {
    setPrice({ min: get('minPrice'), max: get('maxPrice') });
  }, [sp.get('minPrice'), sp.get('maxPrice')]);

  const cats = useApi(() => publicTaxonomyApi.list('categories'), []);
  const families = useApi(() => publicTaxonomyApi.list('fragranceFamilies'), []);
  const brands = useApi(() => publicTaxonomyApi.list('brands'), []);

  const query = Object.fromEntries(KEYS.map((k) => [k, get(k)]).filter(([, v]) => v));
  const { data, loading, error, reload } = useApi(() => productsApi.list({ ...query, limit: 12 }), [sp.toString()]);
  const list = data?.products || [];

  const activeFilters = KEYS.filter((k) => k !== 'page' && k !== 'sort' && get(k));

  const clearAll = () => {
    setSp(new URLSearchParams());
    setPrice({ min: '', max: '' });
  };

  return (
    <div className="py-8 sm:py-12">
      <Container>
        {/* Boutique Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-gold font-medium">Boutique Privée</p>
          <h1 className="font-display text-3xl sm:text-5xl tracking-tight">
            {get('q') ? `Search: “${get('q')}”` : 'The Haute Parfumerie Compendium'}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-light">
            Each flacon is macerated for 18 months, hand-filled with rare agarwood, Taif rose, and precious ambergris. Formulated exclusively at Extrait de Parfum strength.
          </p>
        </div>

        {/* Gender Quick-Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 pb-6 border-b border-border/40">
          {[
            { id: '', label: 'All Fragrances' },
            { id: 'Men', label: 'Pour Homme (Men)' },
            { id: 'Women', label: 'Pour Femme (Women)' },
            { id: 'Unisex', label: 'L\'Art Unisexe' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => set({ gender: item.id })}
              className={`px-5 py-2 rounded-sm text-xs uppercase tracking-wider transition-all ${
                get('gender') === item.id
                  ? 'bg-gold text-bg font-semibold shadow-sm'
                  : 'bg-surface border border-border text-ink-muted hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Olfactory Note Filtering Bar */}
        <div className="mb-8 p-4 rounded-sm bg-surface border border-border/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold flex-shrink-0" />
              <span className="font-display text-sm tracking-wide text-ink font-medium">
                Browse by Olfactory Note
              </span>
              <span className="text-[11px] text-ink-muted hidden md:inline">
                · Pure macerated accords & pyramids
              </span>
            </div>
            {get('note') && (
              <button
                type="button"
                onClick={() => set({ note: '' })}
                className="text-xs text-gold hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Note ({get('note')})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {OLFACTORY_NOTES.map((n) => {
              const isSelected = get('note').toLowerCase() === n.id.toLowerCase();
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => set({ note: isSelected ? '' : n.id })}
                  title={n.desc}
                  className={`px-3.5 py-1.5 rounded-sm text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gold text-bg font-semibold shadow-sm'
                      : 'bg-surface-raised border border-border/80 text-ink-muted hover:text-ink hover:border-gold/40'
                  }`}
                >
                  <span>{n.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filters & Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-border/40 text-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3.5 py-2 rounded-sm bg-surface border border-border text-ink font-medium"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-gold" />
              <span>Filters {activeFilters.length > 0 && `(${activeFilters.length})`}</span>
            </button>

            <span className="text-ink-muted hidden sm:inline">
              Showing <strong className="text-ink font-medium">{data?.pagination?.total || list.length}</strong> Haute Creations
            </span>

            {/* Active filter badges */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {activeFilters.map((key) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-gold/10 border border-gold/30 text-gold text-[11px]"
                  >
                    <span>{key === 'note' ? `Note: ${get(key)}` : `${key}: ${get(key)}`}</span>
                    <button
                      type="button"
                      onClick={() => set({ [key]: '' })}
                      className="hover:text-ink"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-ink-muted hover:text-danger underline ml-1"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-ink-muted hidden sm:inline">Sort by:</span>
            <select
              value={get('sort') || 'popular'}
              onChange={(e) => set({ sort: e.target.value })}
              className="bg-surface border border-border rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-gold text-ink"
            >
              {SORTS.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Layout: Filters Sidebar + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 space-y-7 p-6 rounded-sm bg-surface border border-border">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="font-display text-base tracking-tight flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-gold" />
                Refine Compendium
              </span>
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-gold hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="space-y-2.5">
              <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted block">Line & Category</span>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => set({ category: '' })}
                  className={`w-full text-left py-1 text-xs transition-colors flex items-center justify-between ${
                    !get('category') ? 'text-gold font-semibold' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <span>All Categories</span>
                </button>
                {(cats.data?.items || []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set({ category: get('category') === c.slug ? '' : c.slug })}
                    className={`w-full text-left py-1 text-xs transition-colors flex items-center justify-between ${
                      get('category') === c.slug ? 'text-gold font-semibold' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fragrance Family Filter */}
            <div className="space-y-2.5 pt-4 border-t border-border">
              <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted block">Olfactive Family</span>
              <div className="space-y-1">
                {(families.data?.items || []).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => set({ family: get('family') === f.slug ? '' : f.slug })}
                    className={`w-full text-left py-1 text-xs transition-colors flex items-center justify-between ${
                      get('family') === f.slug ? 'text-gold font-semibold' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <span>{f.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Olfactory Notes Filter */}
            <div className="space-y-2.5 pt-4 border-t border-border">
              <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted block">
                Olfactory Notes
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {OLFACTORY_NOTES.map((n) => {
                  const isSelected = get('note').toLowerCase() === n.id.toLowerCase();
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => set({ note: isSelected ? '' : n.id })}
                      className={`w-full text-left py-1 text-xs transition-colors flex items-center justify-between ${
                        isSelected ? 'text-gold font-semibold' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <span>{n.label}</span>
                      {isSelected && <span className="text-gold font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-2.5 pt-4 border-t border-border">
              <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted block">Price (PKR)</span>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  set({ minPrice: price.min, maxPrice: price.max });
                }}
                className="space-y-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={price.min}
                    onChange={(e) => setPrice({ ...price, min: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-surface-raised border border-border rounded-sm text-xs focus:outline-none focus:border-gold"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={price.max}
                    onChange={(e) => setPrice({ ...price, max: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-surface-raised border border-border rounded-sm text-xs focus:outline-none focus:border-gold"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-surface-raised hover:bg-gold hover:text-bg border border-border rounded-sm text-xs font-medium transition-colors"
                >
                  Apply Price
                </button>
              </form>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="lg:col-span-9">
            <StateBox
              loading={loading && !data}
              error={error}
              onRetry={reload}
              empty={!loading && !list.length}
              emptyText="No Afsana creations match your selected filters. Try broadening your criteria."
              skeleton={<CardsSkeleton n={6} />}
            >
              <div className={`grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 ${loading ? 'opacity-60 transition-opacity' : ''}`}>
                {list.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="mt-12">
                <Pager
                  pagination={data?.pagination}
                  onPage={(p) => {
                    set({ page: String(p) });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            </StateBox>
          </div>
        </div>
      </Container>

      {/* Mobile Filter Slide-out Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileFilterOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-xs bg-surface border-l border-border h-full flex flex-col shadow-2xl p-6 overflow-y-auto animate-fade-in space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="font-display text-lg">Filter Boutique</span>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted">Category</span>
              <div className="space-y-1">
                {(cats.data?.items || []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      set({ category: get('category') === c.slug ? '' : c.slug });
                      setMobileFilterOpen(false);
                    }}
                    className={`w-full text-left py-1 text-xs ${
                      get('category') === c.slug ? 'text-gold font-semibold' : 'text-ink-muted'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Families */}
            <div className="space-y-2 pt-4 border-t border-border">
              <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted">Fragrance Family</span>
              <div className="space-y-1">
                {(families.data?.items || []).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      set({ family: get('family') === f.slug ? '' : f.slug });
                      setMobileFilterOpen(false);
                    }}
                    className={`w-full text-left py-1 text-xs ${
                      get('family') === f.slug ? 'text-gold font-semibold' : 'text-ink-muted'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Olfactory Notes */}
            <div className="space-y-2 pt-4 border-t border-border">
              <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted">Olfactory Notes</span>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {OLFACTORY_NOTES.map((n) => {
                  const isSelected = get('note').toLowerCase() === n.id.toLowerCase();
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        set({ note: isSelected ? '' : n.id });
                        setMobileFilterOpen(false);
                      }}
                      className={`w-full text-left py-1.5 text-xs flex items-center justify-between ${
                        isSelected ? 'text-gold font-semibold' : 'text-ink-muted'
                      }`}
                    >
                      <span>{n.label}</span>
                      {isSelected && <span className="text-gold font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => { clearAll(); setMobileFilterOpen(false); }}
                className="w-full py-2.5 rounded-sm border border-danger text-danger text-xs font-semibold uppercase tracking-wider"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
