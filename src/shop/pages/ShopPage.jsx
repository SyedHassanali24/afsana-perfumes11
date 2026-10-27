import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useApi from '../../hooks/useApi';
import { productsApi, publicTaxonomyApi } from '../../services';
import { Select, Input } from '../../../admin/components/FormFields';
import Button from '../../../admin/components/Button';
import { Container, PageTitle, StateBox, CardsSkeleton, Pager } from '../ui';
import ProductCard from '../ProductCard';
import useTitle from '../useTitle';

const SORTS = [['newest', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['popular', 'Most loved']];
const KEYS = ['q', 'category', 'collection', 'brand', 'gender', 'sort', 'minPrice', 'maxPrice', 'page'];

export default function ShopPage() {
  useTitle('Shop');
  const [sp, setSp] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const get = (k) => sp.get(k) || '';
  const set = (patch) => {
    const n = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    if (!('page' in patch)) n.delete('page');
    setSp(n);
  };
  const applyFilter = (patch) => {
    set(patch);
    setShowFilters(false);
  };

  const [price, setPrice] = useState({ min: get('minPrice'), max: get('maxPrice') });
  useEffect(() => {
    setPrice({ min: get('minPrice'), max: get('maxPrice') });
  }, [sp]);

  const cats = useApi(() => publicTaxonomyApi.list('categories'), []);
  const collections = useApi(() => publicTaxonomyApi.list('collections'), []);
  const brands = useApi(() => publicTaxonomyApi.list('brands'), []);

  const query = Object.fromEntries(KEYS.map((k) => [k, get(k)]).filter(([, v]) => v));
  const { data, loading, error, reload } = useApi(() => productsApi.list({ ...query, limit: 12 }), [sp.toString()]);
  const list = data?.products || [];
  const active = KEYS.filter((k) => !['page', 'sort'].includes(k) && get(k));

  const clearFilters = () => {
    const n = new URLSearchParams();
    if (get('q')) n.set('q', get('q'));
    setSp(n);
    setPrice({ min: '', max: '' });
    setShowFilters(false);
  };

  return (
    <div className="container-xl shop-page">
      <div className="shop-head"><div><div className="eyebrow">The complete collection</div><h1 className="section-title">Choose your<br/><em>story.</em></h1></div></div><PageTitle
        title={get('q') ? 'Results for “' + get('q') + '”' : 'All perfumes'}
        subtitle={data ? data.pagination.total + ' fragrance' + (data.pagination.total === 1 ? '' : 's') : ' '}
      />

      <div className="md:hidden flex items-center gap-2 mb-5">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
          {showFilters ? 'Hide filters' : 'Filters' + (active.length ? ' (' + active.length + ')' : '')}
        </Button>
        <Select aria-label="Sort products" value={get('sort') || 'newest'} onChange={(e) => set({ sort: e.target.value })} className="flex-1">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>

      <div className="shop-layout grid gap-8 md:grid-cols-[220px_1fr]">
        <aside>
          <div className={(showFilters ? 'block' : 'hidden') + ' md:block'}>
            <div className="space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-card md:border-0 md:bg-transparent md:p-0">
              <label className="block text-sm">
                <span className="block mb-1.5">Category</span>
                <Select value={get('category')} onChange={(e) => applyFilter({ category: e.target.value })}>
                  <option value="">All</option>
                  {(cats.data?.items || []).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                </Select>
              </label>

              <label className="block text-sm">
                <span className="block mb-1.5">Collection</span>
                <Select value={get('collection')} onChange={(e) => applyFilter({ collection: e.target.value })}>
                  <option value="">All</option>
                  {(collections.data?.items || []).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                </Select>
              </label>

              <label className="block text-sm">
                <span className="block mb-1.5">Brand</span>
                <Select value={get('brand')} onChange={(e) => applyFilter({ brand: e.target.value })}>
                  <option value="">All</option>
                  {(brands.data?.items || []).map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
                </Select>
              </label>

              <div className="text-sm">
                <span className="block mb-1.5">For</span>
                <div className="flex flex-wrap gap-2">
                  {['Men', 'Women', 'Unisex'].map((g) => (
                    <button key={g} type="button" aria-pressed={get('gender') === g} onClick={() => applyFilter({ gender: get('gender') === g ? '' : g })}
                      className={'px-3 py-1.5 rounded-xl border text-xs transition-colors ' + (get('gender') === g ? 'border-primary text-primary bg-primary-soft' : 'border-border text-ink-muted hover:text-primary hover:bg-primary-soft')}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <form className="text-sm" onSubmit={(e) => { e.preventDefault(); applyFilter({ minPrice: price.min, maxPrice: price.max }); }}>
                <span className="block mb-1.5">Price (PKR)</span>
                <div className="flex items-center gap-2">
                  <Input inputMode="numeric" placeholder="Min" aria-label="Minimum price" value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value.replace(/\D/g, '') })} />
                  <Input inputMode="numeric" placeholder="Max" aria-label="Maximum price" value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value.replace(/\D/g, '') })} />
                </div>
                <Button type="submit" variant="secondary" size="sm" className="mt-2 w-full">Apply price</Button>
              </form>

              {active.length > 0 && <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>Clear all filters</Button>}
            </div>
          </div>
        </aside>

        <div>
          <div className="hidden md:flex justify-end mb-4">
            <label className="text-sm flex items-center gap-2">
              <span className="text-ink-muted">Sort by</span>
              <Select value={get('sort') || 'newest'} onChange={(e) => set({ sort: e.target.value })} className="!w-auto">
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </label>
          </div>

          {active.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4" aria-label="Active filters">
              {active.map((key) => {
                const labels = { q: 'Search', category: 'Category', collection: 'Collection', brand: 'Brand', gender: 'For', minPrice: 'Min price', maxPrice: 'Max price' };
                return (
                  <button key={key} type="button" onClick={() => set({ [key]: '' })}
                    className="rounded-full border border-primary-soft-border bg-primary-soft px-2.5 py-1 text-xs text-primary hover:bg-primary-soft"
                    title={'Remove ' + (labels[key] || key) + ' filter'}>
                    {(labels[key] || key) + ': ' + get(key) + ' ×'}
                  </button>
                );
              })}
            </div>
          )}

          <StateBox loading={loading && !data} error={error} onRetry={reload}
            empty={!loading && !list.length}
            emptyText="No perfumes match these filters. Try clearing a filter or changing your search."
            skeleton={<CardsSkeleton n={6} />}>
            <div className={'product-grid grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 ' + (loading ? 'opacity-60' : '')}>
              {list.map((p) => <ProductCard key={p.id || p._id} product={p} />)}
            </div>
            <Pager pagination={data?.pagination} onPage={(p) => { set({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </StateBox>
        </div>
      </div>
    </div>
  );
}
