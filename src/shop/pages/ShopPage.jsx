import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useApi from '../../hooks/useApi';
import { productsApi } from '../../services';
import { Select } from '../../../admin/components/FormFields';
import { StateBox, CardsSkeleton, Pager } from '../ui';
import ProductCard from '../ProductCard';
import { cardOf, money } from '../format';
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
  const [compare,setCompare] = useState([]);
  const [showCompare,setShowCompare] = useState(false);
  const toggleCompare = (product) => setCompare(current => current.some(item => String(item.id||item._id)===String(product.id||product._id)) ? current.filter(item => String(item.id||item._id)!==String(product.id||product._id)) : current.length>=3 ? current : [...current,product]);
  useEffect(()=>{
    if(!showCompare)return;
    const previous=document.body.style.overflow;
    const closeOnEscape=(event)=>{if(event.key==='Escape')setShowCompare(false)};
    document.body.style.overflow='hidden';
    window.addEventListener('keydown',closeOnEscape);
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',closeOnEscape)};
  },[showCompare]);

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
        <Select aria-label="Filter by fragrance style" value={get('gender')} onChange={(e)=>set({gender:e.target.value})} className="!w-auto min-w-[130px]">
          <option value="">All styles</option><option value="Men">Men</option><option value="Women">Women</option><option value="Unisex">Unisex</option>
        </Select>
        <Select aria-label="Filter by maximum price" value={get('maxPrice')} onChange={(e)=>set({maxPrice:e.target.value})} className="!w-auto min-w-[145px]">
          <option value="">Any price</option><option value="3000">Up to PKR 3,000</option><option value="5000">Up to PKR 5,000</option><option value="10000">Up to PKR 10,000</option><option value="20000">Up to PKR 20,000</option>
        </Select>
      </div>

      {get('q') && <div className="mt-5 text-xs uppercase tracking-[.18em] text-[#5f654f]">Search results for “{get('q')}”</div>}

      <StateBox loading={loading && !data} error={error} onRetry={reload}
        empty={!loading && !list.length}
        emptyText="No perfumes match this story. Try another collection."
        skeleton={<CardsSkeleton n={8} />}>
        <div className={'product-grid mt-10 grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12 ' + (loading ? 'opacity-60' : '')}>
          {list.map((p)=><ProductCard key={p.id || p._id} product={p} onCompare={toggleCompare} isCompared={compare.some(item=>String(item.id||item._id)===String(p.id||p._id))}/>)}
        </div>
        <Pager pagination={data?.pagination} onPage={(p)=>{set({page:String(p)});window.scrollTo({top:0,behavior:'smooth'});}} />
        {compare.length>0&&<div className="sticky bottom-4 z-30 mt-8 flex flex-wrap items-center justify-between gap-4 border border-[#263e0e]/15 bg-[#faf8f4]/95 p-4 shadow-xl backdrop-blur"><div><p className="text-[9px] uppercase tracking-[.2em] text-[#748e40]">Fragrance comparison · {compare.length}/3</p><p className="mt-1 text-sm text-[#263e0e]">{compare.map(p=>p.name).join(' · ')}</p></div><div className="flex gap-2"><button type="button" onClick={()=>setCompare([])} className="border border-[#263e0e]/15 px-4 py-3 text-[9px] uppercase tracking-[.15em]">Clear</button><button type="button" disabled={compare.length<2} onClick={()=>setShowCompare(true)} className="bg-[#263e0e] px-5 py-3 text-[9px] uppercase tracking-[.18em] text-white disabled:opacity-40">Compare now ↗</button></div></div>}
        {showCompare&&<div className="fixed inset-0 z-[80] overflow-y-auto bg-[#182308]/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Compare fragrances"><div className="mx-auto my-8 max-w-5xl bg-[#faf8f4] p-5 sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-[9px] uppercase tracking-[.25em] text-[#748e40]">The AFSANA collection</p><h2 className="mt-2 font-display text-3xl sm:text-5xl">Compare fragrances</h2></div><button type="button" onClick={()=>setShowCompare(false)} aria-label="Close comparison" className="border border-[#263e0e]/20 px-4 py-3 text-xs">Close ✕</button></div><div className="mt-7 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr><th className="w-28 p-3 text-[9px] uppercase tracking-[.16em] text-[#5f654f]">Details</th>{compare.map(p=><th key={p.id||p._id} className="p-3 font-display text-xl">{cardOf(p).name}</th>)}</tr></thead><tbody className="divide-y divide-[#263e0e]/10">{[[ 'Price from',p=>p.priceFrom!=null?money(p.priceFrom):'Not listed'],['Concentration',p=>p.fragrance?.concentration||'Not listed'],['Fragrance family',p=>p.fragrance?.family||p.fragrance?.familyName||'Not listed'],['Style',p=>p.fragrance?.gender||p.gender||'Not listed'],['Top notes',p=>p.notes?.top?.join(', ')||'Not listed'],['Heart notes',p=>p.notes?.heart?.join(', ')||'Not listed'],['Base notes',p=>p.notes?.base?.join(', ')||'Not listed'],['Availability',p=>p.inStock===false?'Sold out':'Check product sizes']].map(([label,get])=><tr key={label}><th className="p-3 text-[9px] uppercase tracking-[.12em] text-[#5f654f]">{label}</th>{compare.map(p=><td key={p.id||p._id} className="p-3 text-[#263e0e]">{get(p)}</td>)}</tr>)}</tbody></table></div><div className="mt-6 flex justify-end"><button type="button" onClick={()=>setShowCompare(false)} className="bg-[#263e0e] px-6 py-3 text-[9px] uppercase tracking-[.2em] text-white">Continue shopping</button></div></div></div>}
      </StateBox>
    </div>
  );
}