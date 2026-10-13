import useApi from '../hooks/useApi';
import useDebounce from '../hooks/useDebounce';
import { cartApi } from '../services';

// Server-priced view of the cart. Re-runs (debounced) when items or coupon change; keeps showing the old numbers while it reloads.
export default function useQuote(items, couponCode) {
  const key = useDebounce(JSON.stringify([items, couponCode || '']), 250);
  return useApi(() => (items.length ? cartApi.quote({ items, couponCode: couponCode || undefined }) : Promise.resolve(null)), [key]);
}
