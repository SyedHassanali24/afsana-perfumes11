import { Link, useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { myReturnsApi } from '../../services';
import { StateBox, Pager } from '../ui';
import { ReturnCard } from './ReturnsSection';

// "Returns" tab of /account. Requests are made from the order page.
export default function MyReturns() {
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page')) || 1;
  const { data, loading, error, reload } = useApi(() => myReturnsApi.list({ page, limit: 10 }), [page]);
  const rows = data?.returns || [];
  return (
    <StateBox loading={loading && !data} error={error} onRetry={reload} empty={!loading && !rows.length} emptyText="You have not requested any returns. To start one, open a delivered order.">
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.returnNumber}>
            <ReturnCard r={r} />
            <Link to={`/account/orders/${r.orderNumber}`} className="text-xs text-ink-muted hover:text-ink mt-1 inline-block">View order {r.orderNumber} →</Link>
          </li>
        ))}
      </ul>
      <Pager pagination={data?.pagination} onPage={(p) => setSp({ tab: 'returns', page: String(p) })} />
    </StateBox>
  );
}
