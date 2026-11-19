import useApi from '../hooks/useApi';
import useDebounce from '../hooks/useDebounce';
import { cartApi } from '../services';
import { getReferralCode } from './trafficTracking';

// Server-priced view of the cart. Re-runs (debounced) when items or coupon change; keeps showing the old numbers while it reloads.
// `city` (optional, from the checkout form) makes the delivery fee follow the city's zone; without it the shop's default fee is shown.
export default function useQuote(items, couponCode, city, enabled = true) {
  const cityKey = (city || '').trim();
  const referralCode = getReferralCode();
  const key = useDebounce(JSON.stringify([items, couponCode || '', cityKey, referralCode]), 600);
  return useApi(() => (enabled && items.length ? cartApi.quote({ items, couponCode: couponCode || undefined, referralCode: referralCode || undefined, city: cityKey || undefined }) : Promise.resolve(null)), [key, enabled]);
}
