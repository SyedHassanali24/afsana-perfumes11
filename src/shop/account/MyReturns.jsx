import { Link, useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { myReturnsApi } from '../../services';
import { StateBox, Pager } from '../ui';
import { ReturnCard } from './ReturnsSection';
import { useCmsPageCopy } from '../cmsCopy';

// "Returns" tab of /account. Requests are made from the order page.
export default function MyReturns() {
  const copy = useCmsPageCopy('account');
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page')) || 1;
  const { data, loading, error, reload } = useApi(() => myReturnsApi.list({ page, limit: 10 }), [page]);
  const rows = data?.returns || [];
  return (
    <StateBox loading={loading && !data} error={error} onRetry={reload} empty={!loading && !rows.length} emptyText={copy.returnsEmpty}>
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.returnNumber}>
            <ReturnCard r={r} />
            <Link to={`/account/orders/${r.orderNumber}`} className="text-xs text-[#5f654f] hover:text-ink mt-1 inline-block">{copy.viewOrder} {r.orderNumber} →</Link>
          </li>
        ))}
      </ul>
      <Pager pagination={data?.pagination} onPage={(p) => setSp({ tab: 'returns', page: String(p) })} />
    </StateBox>
  );
}
