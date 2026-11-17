import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { wishlistApi, productsApi } from '../../services';
import { useCustomer } from '../../customer/CustomerAuthContext';
import Button from '../../../admin/components/Button';
import { Container, PageTitle, StateBox, CardsSkeleton } from '../ui';
import ProductCard from '../ProductCard';
import useTitle from '../useTitle';
import { useWishlist } from '../WishlistContext';

export default function WishlistPage() {
  useTitle('Wishlist');
  const { status } = useCustomer();
  const { ids, count } = useWishlist();
  const { data, loading, error, reload } = useApi(
    () => status === 'authed' ? wishlistApi.list() : productsApi.list({ limit: 100 }),
    [status],
  );

  useEffect(() => {
    if (status === 'authed' && data) reload();
  }, [count, status]);

  const list = status === 'authed'
    ? data?.products || []
    : (data?.products || []).filter((product) => ids.includes(String(product.id || product._id)));

  return (
    <Container className="pb-12">
      <PageTitle title="Your wishlist" subtitle={status === 'authed' ? "Perfumes you have saved." : "Your saved perfumes stay on this device. Sign in later to sync them to your account."} />
      <StateBox loading={loading} error={error} onRetry={reload} skeleton={<CardsSkeleton n={4} />} empty={!list.length}
        emptyText={<span className="space-y-4 block"><span className="block">Nothing saved yet. Tap the heart on any perfume.</span><Link to="/shop" className="inline-block"><Button>Browse perfumes</Button></Link></span>}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">{list.map((p) => <ProductCard key={p.id || p._id} product={p} />)}</div>
      </StateBox>
    </Container>
  );
}
