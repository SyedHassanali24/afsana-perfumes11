import { useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { productsApi, cmsPublicApi } from '../../services';
import { Select } from '../../../admin/components/FormFields';
import { StateBox, CardsSkeleton, Pager } from '../ui';
import ProductCard from '../ProductCard';
import useTitle from '../useTitle';

const SORTS = [['newest', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['popular', 'Most loved']];
const KEYS = ['q', 'category', 'collection', 'brand', 'gender', 'sort', 'minPrice', 'maxPrice', 'page'];

export default function ShopPage() {
  useTitle('Shop');
  const [sp, setSp] = useSearchParams();
  const {data:cmsContent}=useApi(()=>cmsPublicApi.content(),[]);
  const referenceAssets=(cmsContent?.homepageSections||[]).find((item)=>item.type==='reference_assets')?.config||{};
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
    <div className="shop-page">
      <section className="afsana-ref-collection-hero">
        {referenceAssets.collectionHeroImageUrl && <img src={referenceAssets.collectionHeroImageUrl} alt="" />}
        <div className="container-xl relative z-10">
          <p className="afsana-ref-eyebrow">THE COMPLETE COLLECTION / 2026</p>
          <h1>Find your<br/><em>forever note.</em></h1>
          <p>Consider this your invitation to explore. Each AFSANA fragrance is a carefully composed expression of mood, memory and modern identity.</p>
        </div>
      </section>
      <div className="container-xl pb-24 pt-8 sm:pt-12">

      <div className="mt-2 flex flex-col gap-4 border-y border-[#263e0e]/10 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="filters flex-nowrap overflow-x-auto">
          {[['','All fragrances'],['signature','Signature'],['fresh','Fresh'],['bold','Bold'],['warm','Warm']].map(([value,label]) => {
            const activeValue=get('category');
            const active=value ? activeValue===value : !activeValue;
            return <button key={label} type="button" className={'filter whitespace-nowrap '+(active?'active':'')} onClick={()=>applyFilter({category:value,page:''})}>{label}</button>;
          })}
        </div>
        <Select aria-label="Sort products" value={get('sort') || 'popular'} onChange={(e)=>set({sort:e.target.value})} className="!w-auto min-w-[150px]">
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
    </div>
  );
}