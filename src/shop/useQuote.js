import useApi from '../hooks/useApi';
import useDebounce from '../hooks/useDebounce';
import { cartApi } from '../services';

// Server-priced view of the cart. Re-runs (debounced) when items or coupon change; keeps showing the old numbers while it reloads.
// `city` (optional, from the checkout form) makes the delivery fee follow the city's zone; without it the shop's default fee is shown.
export default function useQuote(items, couponCode, city) {
  const cityKey = (city || '').trim();
  const key = useDebounce(JSON.stringify([items, couponCode || '', cityKey]), 250);
  return useApi(() => (items.length ? cartApi.quote({ items, couponCode: couponCode || undefined, city: cityKey || undefined }) : Promise.resolve(null)), [key]);
}
