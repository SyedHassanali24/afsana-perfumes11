import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useCustomer } from '../../customer/CustomerAuthContext';
import Button from '../../../admin/components/Button';
import StatusPill from '../../../admin/components/StatusPill';
import { Container, PageTitle, StateBox, Pager, Placeholder } from '../ui';
import useApi from '../../hooks/useApi';
import { accountApi } from '../../services';
import { money, fmtDate } from '../format';
import useTitle from '../useTitle';
import MyAddresses from './MyAddresses';
import MyProfile from './MyProfile';
import MyReturns from './MyReturns';

function MyOrders() {
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page')) || 1;
  const { data, loading, error, reload } = useApi(() => accountApi.orders({ page, limit: 10 }), [page]);
  const orders = data?.orders || [];
  return (
    <StateBox loading={loading && !data} error={error} onRetry={reload} empty={!loading && !orders.length} emptyText="You have not placed an order with this account yet.">
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.orderNumber}>
            <Link to={`/account/orders/${o.orderNumber}`} className="flex items-center gap-4 rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] p-4 sm:p-5 hover:border-[#263e0e]/20 hover:shadow-[0_18px_50px_rgba(24,35,8,.06)] transition">
              <div className="flex -space-x-3 shrink-0">
                {(o.images.length ? o.images : [null]).map((src, i) => <div key={i} className="w-12 h-14 rounded-xl overflow-hidden border-2 border-surface bg-[#f3f1e9]">{src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <Placeholder className="w-full h-full" />}</div>)}
              </div>
              <div className="flex-1 min-w-0"><p className="font-medium text-sm">{o.orderNumber}</p><p className="text-xs text-[#5f654f]">{fmtDate(o.placedAt)} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'}</p></div>
              <div className="text-right space-y-1"><StatusPill status={o.status} /><p className="text-sm tabular-nums">{money(o.total)}</p></div>
            </Link>
          </li>
        ))}
      </ul>
      <Pager pagination={data?.pagination} onPage={(p) => setSp({ page: String(p) })} />
    </StateBox>
  );
}

const TABS = [['orders', 'Orders'], ['returns', 'Returns'], ['addresses', 'Addresses'], ['profile', 'Profile']];
export default function AccountPage() {
  useTitle('My account');
  const { customer, logout } = useCustomer();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const tab = TABS.some(([k]) => k === sp.get('tab')) ? sp.get('tab') : 'orders';
  return (
    <Container className="max-w-4xl pb-12">
      <PageTitle title={`Hello, ${(customer?.name || '').split(' ')[0] || 'there'}`} subtitle="Your orders, addresses and details."
        action={<Button variant="ghost" size="sm" onClick={async () => { await logout(); navigate('/'); }}>Sign out</Button>} />
      <div className="flex gap-1 rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] p-1 mb-6 overflow-x-auto shadow-[0_18px_50px_rgba(24,35,8,.06)]" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setSp(k === 'orders' ? {} : { tab: k })}
            className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition ${tab === k ? 'bg-[#263e0e] text-white shadow-sm' : 'text-[#5f654f] hover:bg-[#263e0e]-soft hover:text-[#263e0e]'}`}>{label}</button>
        ))}
        <Link to="/wishlist" className="shrink-0 rounded-xl ml-auto px-4 py-2.5 text-sm text-[#5f654f] hover:bg-[#263e0e]-soft hover:text-[#263e0e]">Wishlist</Link>
      </div>
      {tab === 'orders' && <MyOrders />}
      {tab === 'returns' && <MyReturns />}
      {tab === 'addresses' && <MyAddresses />}
      {tab === 'profile' && <MyProfile />}
    </Container>
  );
}
