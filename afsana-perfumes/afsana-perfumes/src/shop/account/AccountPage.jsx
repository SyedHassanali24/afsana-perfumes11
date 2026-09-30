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
            <Link to={`/account/orders/${o.orderNumber}`} className="flex items-center gap-4 rounded-md border border-border bg-surface p-4 hover:border-gold">
              <div className="flex -space-x-3 shrink-0">
                {(o.images.length ? o.images : [null]).map((src, i) => <div key={i} className="w-12 h-14 rounded-sm overflow-hidden border-2 border-surface bg-bg">{src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <Placeholder className="w-full h-full" />}</div>)}
              </div>
              <div className="flex-1 min-w-0"><p className="font-medium text-sm">{o.orderNumber}</p><p className="text-xs text-ink-muted">{fmtDate(o.placedAt)} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'}</p></div>
              <div className="text-right space-y-1"><StatusPill status={o.status} /><p className="text-sm tabular-nums">{money(o.total)}</p></div>
            </Link>
          </li>
        ))}
      </ul>
      <Pager pagination={data?.pagination} onPage={(p) => setSp({ page: String(p) })} />
    </StateBox>
  );
}

const TABS = [['orders', 'Orders'], ['addresses', 'Addresses'], ['profile', 'Profile']];
export default function AccountPage() {
  useTitle('My account');
  const { customer, logout } = useCustomer();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const tab = TABS.some(([k]) => k === sp.get('tab')) ? sp.get('tab') : 'orders';
  return (
    <Container className="max-w-3xl">
      <PageTitle title={`Hello, ${(customer?.name || '').split(' ')[0] || 'there'}`} subtitle="Your orders, addresses and details."
        action={<Button variant="ghost" size="sm" onClick={async () => { await logout(); navigate('/'); }}>Sign out</Button>} />
      <div className="flex gap-1 border-b border-border mb-6" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setSp(k === 'orders' ? {} : { tab: k })}
            className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === k ? 'border-gold text-ink' : 'border-transparent text-ink-muted hover:text-ink'}`}>{label}</button>
        ))}
        <Link to="/wishlist" className="ml-auto px-4 py-2 text-sm text-ink-muted hover:text-ink">Wishlist</Link>
      </div>
      {tab === 'orders' && <MyOrders />}
      {tab === 'addresses' && <MyAddresses />}
      {tab === 'profile' && <MyProfile />}
    </Container>
  );
}
