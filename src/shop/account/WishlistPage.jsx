import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { wishlistApi } from '../../services';
import Button from '../../../admin/components/Button';
import { Container, PageTitle, StateBox, CardsSkeleton } from '../ui';
import ProductCard from '../ProductCard';
import useTitle from '../useTitle';
import { useWishlist } from '../WishlistContext';
import { useCmsPageCopy } from '../cmsCopy';

export default function WishlistPage() {
  const copy = useCmsPageCopy('wishlist');
  useTitle(copy.browserTitle);
  const { data, loading, error, reload } = useApi(() => wishlistApi.list(), []);
  const { count } = useWishlist();
  // ProductCard toggles the shared wishlist; refetch so removed hearts disappear from this grid immediately.
  useEffect(() => { if (data) reload(); }, [count]);
  const list = data?.products || [];
  return (
    <Container className="pb-12">
      <PageTitle title={copy.title} subtitle={copy.subtitle} />
      <StateBox loading={loading} error={error} onRetry={reload} skeleton={<CardsSkeleton n={4} />} empty={!list.length}
        emptyText={<span className="space-y-4 block"><span className="block">{copy.empty}</span><Link to="/shop" className="inline-block"><Button>{copy.browse}</Button></Link></span>}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      </StateBox>
    </Container>
  );
}
