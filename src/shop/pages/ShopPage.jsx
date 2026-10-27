import { useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { productsApi } from '../../services';
import { Select } from '../../../admin/components/FormFields';
import { Container, PageTitle, StateBox, CardsSkeleton, Pager } from '../ui';
import ProductCard from '../ProductCard';
import useTitle from '../useTitle';

const SORTS = [['newest', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['popular', 'Most loved']];
const KEYS = ['q', 'category', 'collection', 'brand', 'gender', 'sort', 'minPrice', 'maxPrice', 'page'];

export default function ShopPage() {
  useTitle('Shop');
  const [sp, setSp] = useSearchParams();
  const get = (k) => sp.get(k) || '';
  const set = (patch) => {
    const n = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    if (!('page' in patch)) n.delete('page');
    setSp(n);
  };
  const applyFilter = (patch) => set(patch);

  const query = Object.fromEntries(KEYS.map((k) => [k, get(k)]).filter(([, v]) => v));
  const { data, loading, error, reload } = useApi(() => productsApi.list({ ...query, limit: 12 }), [sp.toString()]);
  const list = data?.products || [];

  return (
    <div className="container-xl shop-page py-16 sm:py-24">
      <div className="shop-head">
        <div>
          <div className="eyebrow">The complete collection</div>
          <h1 className="section-title mt-5">Choose your<br/><em>story.</em></h1>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-[9px] uppercase tracking-[.25em] text-[#5f654f]">{data ? data.pagination.total : ' '} fragrances</p>
          <p className="mt-2 text-sm text-[#5f654f]">Each composition is a chapter.</p>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4 border-y border-[#263e0e]/10 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="filters flex-nowrap overflow-x-auto">
          {[['','All'],['signature','Signature'],['oud','Oud'],['floral','Floral'],['fresh','Fresh']].map(([value,label]) => {
            const activeValue=get('category');
            const active=value ? activeValue===value : !activeValue;
            return <button key={label} type="button" className={'filter whitespace-nowrap '+(active?'active':'')} onClick={()=>applyFilter({category:value,page:''})}>{label}</button>;
          })}
        </div>
        <Select aria-label="Sort products" value={get('sort') || 'newest'} onChange={(e)=>set({sort:e.target.value})} className="!w-auto min-w-[150px]">
          {SORTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </Select>
      </div>

      {get('q') && <div className="mt-5 text-xs uppercase tracking-[.18em] text-[#5f654f]">Search results for “{get('q')}”</div>}

      <StateBox loading={loading && !data} error={error} onRetry={reload}
        empty={!loading && !list.length}
        emptyText="No perfumes match this story. Try another collection."
        skeleton={<CardsSkeleton n={8} />}>
        <div className={'product-grid mt-10 grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12 ' + (loading ? 'opacity-60' : '')}>
          {list.map((p)=><ProductCard key={p.id || p._id} product={p}/>)}
        </div>
        <Pager pagination={data?.pagination} onPage={(p)=>{set({page:String(p)});window.scrollTo({top:0,behavior:'smooth'});}} />
      </StateBox>
    </div>
  );
}