import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCustomer } from '../customer/CustomerAuthContext';
import { wishlistApi } from '../services';

const KEY = 'afsana_wishlist_v1';
const IS_GITHUB_PAGES = import.meta.env.BASE_URL !== '/' && !import.meta.env.VITE_API_ORIGIN;
const Ctx = createContext(null);

function readLocal() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]').map(String)); } catch { return new Set(); }
}
function writeLocal(ids) {
  try { localStorage.setItem(KEY, JSON.stringify([...ids])); } catch {}
}

export function WishlistProvider({ children }) {
  const { status } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();
  const [ids, setIds] = useState(() => readLocal());

  useEffect(() => {
    if (status === 'authed') wishlistApi.list().then((r) => setIds(new Set(r.ids))).catch(() => {});
    else if (IS_GITHUB_PAGES) setIds(readLocal());
    else setIds(new Set());
  }, [status]);

  const toggle = useCallback(async (productId) => {
    const id = String(productId);
    const had = ids.has(id);
    const flip = (on) => setIds((s) => {
      const n = new Set(s);
      if (on) n.add(id); else n.delete(id);
      if (IS_GITHUB_PAGES && status !== 'authed') writeLocal(n);
      return n;
    });

    if (status !== 'authed' && !IS_GITHUB_PAGES) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }

    flip(!had);
    if (status === 'authed') {
      try { if (had) await wishlistApi.remove(id); else await wishlistApi.add(id); }
      catch { flip(had); }
    }
  }, [status, ids, navigate, location]);

  const value = useMemo(() => ({ has: (id) => ids.has(String(id)), toggle, count: ids.size }), [ids, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useWishlist() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return c;
}
