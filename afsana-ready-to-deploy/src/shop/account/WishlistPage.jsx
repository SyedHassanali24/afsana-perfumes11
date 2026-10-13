import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { wishlistApi } from '../../services';
import Button from '../../../admin/components/Button';
import { Container, PageTitle, StateBox, CardsSkeleton } from '../ui';
import ProductCard from '../ProductCard';
import useTitle from '../useTitle';

export default function WishlistPage() {
  useTitle('Wishlist');
  const { data, loading, error, reload } = useApi(() => wishlistApi.list(), []);
  const list = data?.products || [];
  return (
    <Container>
      <PageTitle title="Your wishlist" subtitle="Perfumes you have saved." />
      <StateBox loading={loading} error={error} onRetry={reload} skeleton={<CardsSkeleton n={4} />} empty={!list.length}
        emptyText={<span className="space-y-4 block"><span className="block">Nothing saved yet. Tap the heart on any perfume.</span><Link to="/shop" className="inline-block"><Button>Browse perfumes</Button></Link></span>}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      </StateBox>
    </Container>
  );
}
