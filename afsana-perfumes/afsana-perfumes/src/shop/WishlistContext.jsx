import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCustomer } from '../customer/CustomerAuthContext';
import { wishlistApi } from '../services';

// Wishlist needs an account. Guests who tap the heart are sent to /login and come back afterwards.
const Ctx = createContext(null);
export function WishlistProvider({ children }) {
  const { status } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();
  const [ids, setIds] = useState(() => new Set());

  useEffect(() => {
    if (status === 'authed') wishlistApi.list().then((r) => setIds(new Set(r.ids))).catch(() => {});
    else setIds(new Set());
  }, [status]);

  const toggle = useCallback(async (productId) => {
    const id = String(productId);
    if (status !== 'authed') { navigate('/login', { state: { from: location.pathname + location.search } }); return; }
    const had = ids.has(id);
    const flip = (on) => setIds((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
    flip(!had); // optimistic
    try { if (had) await wishlistApi.remove(id); else await wishlistApi.add(id); } catch { flip(had); }
  }, [status, ids, navigate, location]);

  const value = useMemo(() => ({ has: (id) => ids.has(String(id)), toggle, count: ids.size }), [ids, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useWishlist() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return c;
}
