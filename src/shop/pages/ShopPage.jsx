import { Link, useSearchParams } from 'react-router-dom';
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
  const categories=(categoryData?.items||[]).filter((category)=>Number(category.productCount||0)>0);
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
  const collectionVisual = referenceAssets.collectionHeroImageUrl || list.find((product)=>product.image?.url)?.image?.url || '';
  const collectionBeforeSections = cmsContent?.pageSections?.collection_before || [];
  const hasCmsCollectionBanner = collectionBeforeSections.some((section)=>['hero','image_banner','video_banner'].includes(section.type));

  return (
    <div className="shop-page afsana-shop-page">
      {!hasCmsCollectionBanner ? <section className="relative isolate overflow-hidden bg-white font-sans text-[#261638]">
        <div aria-hidden="true" className="pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-[#fff0a8]/55 blur-3xl"/>
        <div aria-hidden="true" className="pointer-events-none absolute right-[-7rem] top-[-3rem] h-[30rem] w-[30rem] rounded-full bg-purple-100/80 blur-3xl"/>
        <div aria-hidden="true" className="pointer-events-none absolute bottom-[-10rem] left-[36%] h-96 w-96 rounded-full bg-sky-100/80 blur-3xl"/>
        <div className="container-xl relative mx-auto grid min-h-[520px] max-w-[1440px] items-center gap-9 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[1.08fr_.92fr] lg:gap-14 lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-purple-100 bg-white/85 px-4 py-2 text-[9px] font-bold uppercase tracking-[.2em] text-purple-700 shadow-sm sm:text-[10px]">
              <span className="h-2 w-2 rounded-full bg-[#f6d957] shadow-[0_0_0_4px_rgba(246,217,87,.18)]"/> THE AFSANA EDIT <span className="text-pink-400">/</span> SCENT, SELECTED
            </div>
            <p className="mt-7 text-[10px] font-bold uppercase tracking-[.28em] text-sky-700 sm:text-xs">AFSANA <span className="px-1 text-pink-400">/</span> THE COMPLETE COLLECTION</p>
            <h1 className="mt-4 font-display text-[clamp(3.2rem,7vw,6.6rem)] font-medium leading-[.91] tracking-[-.055em] text-[#261638]">Find your<br/><em className="bg-gradient-to-r from-purple-700 via-fuchsia-500 to-sky-500 bg-clip-text text-transparent">forever note.</em></h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">Explore fragrances crafted around mood, memory and modern identity. Find the scent that feels unmistakably yours.</p>
            <Link to="/discover" className="group mt-8 inline-flex min-h-12 items-center gap-5 rounded-full bg-gradient-to-r from-purple-700 via-violet-600 to-pink-500 px-6 py-3 text-[10px] font-bold uppercase tracking-[.16em] text-white shadow-[0_14px_34px_rgba(109,40,217,.2)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(109,40,217,.27)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 sm:text-[11px]">Find your signature scent <span className="grid h-7 w-7 place-items-center rounded-full bg-[#ffe66d] text-base text-[#261638] transition-transform duration-300 group-hover:translate-x-1">↗</span></Link>
            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-purple-100 pt-5">
              <span className="text-[9px] font-bold uppercase tracking-[.2em] text-purple-700"><span className="mr-2 text-pink-400">01</span>THE AFSANA COLLECTION</span>
              <span className="text-[9px] font-semibold uppercase tracking-[.17em] text-slate-400">CURATED SCENTS. LASTING IMPRESSIONS.</span>
            </div>
          </div>
          <div className="relative mx-auto flex min-h-[310px] w-full max-w-[560px] items-center justify-center sm:min-h-[400px] lg:min-h-[455px]">
            <div aria-hidden="true" className="absolute inset-[8%] rounded-[38%] bg-gradient-to-br from-[#fff0a8]/70 via-pink-100/70 to-sky-100/80 blur-[1px]"/>
            <div aria-hidden="true" className="absolute inset-[13%] rounded-full border border-purple-200/80 shadow-[0_0_0_18px_rgba(167,139,250,.06),0_0_0_38px_rgba(125,211,252,.06)]"/>
            <div aria-hidden="true" className="absolute inset-[22%] rounded-full border border-pink-200/80"/>
            <div className="relative z-10 flex aspect-square w-full max-w-[360px] items-center justify-center overflow-hidden rounded-[32px] border border-white/90 bg-white/75 p-3 shadow-[0_25px_80px_rgba(90,55,130,.14)] backdrop-blur-xl sm:max-w-[390px] sm:rounded-[42px] sm:p-5 lg:max-w-[440px]">
              {collectionVisual ? <img src={collectionVisual} alt="AFSANA fragrance from the collection" loading="lazy" onError={(event)=>{event.currentTarget.style.display='none';}} className="h-full w-full object-contain drop-shadow-[0_20px_22px_rgba(48,28,70,.16)]"/> : <div className="flex h-full w-full flex-col items-center justify-center rounded-[28px] bg-gradient-to-br from-[#fff9db] via-[#fcecff] to-[#eaf8ff] text-center"><span className="font-display text-5xl italic text-purple-700">A.</span><span className="mt-3 text-[8px] font-bold uppercase tracking-[.25em] text-slate-500">THE ART OF SCENT</span></div>}
            </div>
            <span aria-hidden="true" className="absolute right-[7%] top-[13%] h-5 w-5 rounded-full bg-[#f6d957] shadow-[0_0_30px_rgba(246,217,87,.65)]"/>
            <span aria-hidden="true" className="absolute bottom-[14%] left-[7%] h-4 w-4 rounded-full bg-pink-300 shadow-[0_0_26px_rgba(244,114,182,.55)]"/>
            <span aria-hidden="true" className="absolute bottom-[16%] right-[10%] h-3 w-3 rounded-full bg-sky-300 shadow-[0_0_22px_rgba(125,211,252,.65)]"/>
            <span className="absolute bottom-2 right-3 text-[8px] font-bold uppercase tracking-[.25em] text-purple-400 sm:bottom-4 sm:right-7">AFSANA · OBJECT 001</span>
          </div>
        </div>
      </section> : <section className="relative isolate overflow-hidden bg-white font-sans text-[#261638]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#fff9dd] via-white to-[#f4efff]"/>
        <div className="container-xl relative mx-auto max-w-[1320px] px-5 py-12 sm:px-8 sm:py-16">
          <p className="text-[10px] font-bold uppercase tracking-[.25em] text-purple-700">AFSANA <span className="px-1 text-pink-400">/</span> THE COMPLETE COLLECTION</p>
          <h1 className="mt-4 font-display text-5xl font-medium leading-none tracking-[-.05em] sm:text-7xl">Find your <em className="bg-gradient-to-r from-purple-700 via-pink-500 to-sky-500 bg-clip-text text-transparent">forever note.</em></h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">Explore fragrances crafted around mood, memory and modern identity. Find the scent that feels unmistakably yours.</p>
          <p className="mt-7 text-[9px] font-bold uppercase tracking-[.2em] text-slate-400">CURATED SCENTS. LASTING IMPRESSIONS.</p>
        </div>
      </section>}
      <div className="container-xl afsana-shop-content pb-24 pt-7 sm:pt-9">

      <div className="afsana-shop-toolbar mt-2 flex flex-col gap-4 border-y py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="afsana-shop-category-heading">
          <div><span>THE COLLECTION</span><strong>Browse by category</strong></div>
          <div className="filters afsana-shop-filter-rail" aria-label="Filter fragrances by category">
            {[['','All fragrances'], ...categories.map((category)=>[category.slug,category.name])].map(([value,label]) => {
              const activeValue=get('category');
              const active=value ? activeValue===value : !activeValue;
              return <button key={value || 'all'} type="button" className={'afsana-shop-filter whitespace-nowrap '+(active?'active':'')} aria-pressed={active} onClick={()=>applyFilter({category:value,page:''})}>{label}<span aria-hidden="true">↗</span></button>;
            })}
          </div>
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