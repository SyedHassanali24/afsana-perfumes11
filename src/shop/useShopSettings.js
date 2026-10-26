import { useEffect, useState } from 'react';
import { settingsApi } from '../services';

// Public shop settings (name, contact, bank details when switched on, delivery fee, return days). Loaded once, shared by every page.
let cached = null; let inflight = null;
const load = () => (cached ? Promise.resolve(cached) : (inflight ||= settingsApi.public().then((d) => { cached = d; return d; }).finally(() => { inflight = null; })));

export default function useShopSettings() {
  const [data, setData] = useState(cached);
  useEffect(() => { let on = true; if (!cached) load().then((d) => on && setData(d)).catch(() => {}); return () => { on = false; }; }, []);
  return data; // null until loaded (or if it could not be loaded: pages then fall back to the generic text)
}
