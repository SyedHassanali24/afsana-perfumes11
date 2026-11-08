import { useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { productsApi, cmsPublicApi, publicTaxonomyApi } from '../../services';
import { Select } from '../../../admin/components/FormFields';
import { StateBox, CardsSkeleton, Pager } from '../ui';
import ProductCard from '../ProductCard';
import useTitle from '../useTitle';

const SORTS = [['newest', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['popular', 'Featured']];
const KEYS = ['q', 'category', 'collection', 'brand', 'gender', 'sort', 'minPrice', 'maxPrice', 'page'];

export default function ShopPage() {
  useTitle('Shop');
  const [sp, setSp] = useSearchParams();
  const {data:cmsContent}=useApi(()=>cmsPublicApi.content(),[]);
  const {data:categoryData}=useApi(()=>publicTaxonomyApi.list('categories'),[]);
  const categories=categoryData?.items||[];
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
    <div className="shop-page afsana-shop-page">
      <section className="afsana-shop-intro">
        {referenceAssets.collectionHeroImageUrl && <div className="afsana-shop-intro-visual"><img src={referenceAssets.collectionHeroImageUrl} alt="" /></div>}
        <div className="container-xl afsana-shop-intro-inner">
          <p className="afsana-shop-eyebrow">AFSANA <span> / </span> THE COMPLETE COLLECTION</p>
          <h1>Find your<br/><em>forever note.</em></h1>
          <p>Explore fragrances crafted around mood, memory and modern identity. Find the scent that feels unmistakably yours.</p>
          <span className="afsana-shop-intro-foot"><i/> CURATED SCENTS. LASTING IMPRESSIONS.</span>
        </div>
      </section>
      <div className="container-xl afsana-shop-content pb-24 pt-8 sm:pt-10">

      <div className="afsana-shop-toolbar mt-2 flex flex-col gap-4 border-y py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="filters flex-nowrap overflow-x-auto">
          {[['','All fragrances'], ...categories.map((category)=>[category.slug,category.name])].map(([value,label]) => {
            const activeValue=get('category');
            const active=value ? activeValue===value : !activeValue;
            return <button key={label} type="button" className={'afsana-shop-filter whitespace-nowrap '+(active?'active':'')} aria-pressed={active} onClick={()=>applyFilter({category:value,page:''})}>{label}</button>;
          })}
        </div>
        <label className="afsana-shop-sort-wrap"><span>Sort by</span><Select aria-label="Sort products" value={get('sort') || 'popular'} onChange={(e)=>set({sort:e.target.value})} className="afsana-shop-sort !w-auto min-w-[180px]">
          {SORTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </Select></label>
      </div>

      {get('q') && <div className="mt-5 text-xs uppercase tracking-[.18em] text-[#5f654f]">Search results for “{get('q')}”</div>}

      <StateBox loading={loading && !data} error={error} onRetry={reload}
        empty={!loading && !list.length}
        emptyText="No perfumes match this story. Try another collection."
        skeleton={<CardsSkeleton n={8} />}>
        <div className={'afsana-shop-product-grid product-grid mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-7 ' + (loading ? 'opacity-60' : '')}>
          {list.map((p)=><ProductCard key={p.id || p._id} product={p}/>)}
        </div>
        <Pager pagination={data?.pagination} onPage={(p)=>{set({page:String(p)});window.scrollTo({top:0,behavior:'smooth'});}} />
      </StateBox>
      </div>
    </div>
  );
}