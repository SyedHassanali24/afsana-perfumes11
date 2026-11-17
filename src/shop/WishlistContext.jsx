import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useCustomer } from '../customer/CustomerAuthContext';
import { wishlistApi } from '../services';

const KEY = 'afsana_wishlist_v1';
const Ctx = createContext(null);

function readLocal() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]').map(String)); } catch { return new Set(); }
}
function writeLocal(ids) {
  try { localStorage.setItem(KEY, JSON.stringify([...ids])); } catch {}
}

export function WishlistProvider({ children }) {
  const { status } = useCustomer();
  const [ids, setIds] = useState(() => readLocal());

  useEffect(() => {
    if (status === 'authed') {
      let active = true;
      (async () => {
        const localIds = readLocal();
        try {
          const saved = await wishlistApi.list();
          const merged = new Set((saved.ids || []).map(String));
          for (const id of localIds) {
            if (merged.has(id)) continue;
            try { await wishlistApi.add(id); merged.add(id); }
            catch { /* keep an unsynced guest favourite locally for the next login */ }
          }
          if (active) {
            const allSaved = new Set([...merged, ...localIds]);
            setIds(allSaved);
            writeLocal(allSaved);
          }
        } catch {
          if (active) setIds(localIds);
        }
      })();
      return () => { active = false; };
    }
    if (status === 'guest') {
      const local = readLocal();
      setIds(local);
    }
    return undefined;
  }, [status]);

  const toggle = useCallback(async (productId) => {
    const id = String(productId);
    const had = ids.has(id);
    const flip = (on) => setIds((current) => {
      const next = new Set(current);
      if (on) next.add(id); else next.delete(id);
      writeLocal(next);
      return next;
    });

    // Visitors can save favourites without creating an account. The list remains
    // on this device and is merged into the shopper's account after sign-in.
    flip(!had);
    if (status !== 'authed') return;

    try {
      if (had) await wishlistApi.remove(id);
      else await wishlistApi.add(id);
    } catch {
      flip(had);
    }
  }, [status, ids]);

  const value = useMemo(() => ({ has: (id) => ids.has(String(id)), toggle, count: ids.size, ids: [...ids] }), [ids, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useWishlist() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return c;
}
