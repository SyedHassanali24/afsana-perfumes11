import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useCustomer } from '../customer/CustomerAuthContext';
import { cartApi } from '../services';
import { addItem, setQuantity, removeItem, countItems } from './cartLogic';

// Guest cart lives in localStorage ({variantId, quantity} only). A signed-in shopper's cart lives on the server;
// on login the guest cart is merged into it once. Must be rendered INSIDE <CustomerAuthProvider>.
const KEY = 'afsana_cart_v1';
const EMPTY = { items: [], couponCode: '' };
const readLocal = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return { items: Array.isArray(v.items) ? v.items : [], couponCode: v.couponCode || '' }; } catch { return EMPTY; } };
const writeLocal = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: cart just won't persist */ } };

const Ctx = createContext(null);
export function CartProvider({ children }) {
  const { status } = useCustomer();
  const [state, setState] = useState(readLocal);
  const [serverReady, setServerReady] = useState(false);
  const wasAuthed = useRef(false);
  const lastSaved = useRef('');

  useEffect(() => {
    if (status === 'authed' && !wasAuthed.current) {
      wasAuthed.current = true;
      (async () => {
        const local = readLocal();
        try {
          const r = await cartApi.merge({ items: local.items, couponCode: local.couponCode });
          const next = { items: r.items || [], couponCode: r.couponCode || '' };
          lastSaved.current = JSON.stringify(next);
          writeLocal(EMPTY); setState(next);
        } catch { /* offline: keep the local cart, the shopper can still browse */ }
        setServerReady(true);
      })();
    }
    if (status === 'guest' && wasAuthed.current) { wasAuthed.current = false; setServerReady(false); lastSaved.current = ''; writeLocal(EMPTY); setState(EMPTY); }
  }, [status]);

  const sig = JSON.stringify(state);
  useEffect(() => {
    if (status === 'guest') { writeLocal(state); return undefined; }
    if (status !== 'authed' || !serverReady || sig === lastSaved.current) return undefined;
    const t = setTimeout(() => { lastSaved.current = sig; cartApi.save({ items: state.items, couponCode: state.couponCode }).catch(() => {}); }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, status, serverReady]);

  const add = useCallback((variantId, qty = 1) => setState((s) => ({ ...s, items: addItem(s.items, variantId, qty) })), []);
  const setQty = useCallback((variantId, qty) => setState((s) => ({ ...s, items: setQuantity(s.items, variantId, qty) })), []);
  const remove = useCallback((variantId) => setState((s) => ({ ...s, items: removeItem(s.items, variantId) })), []);
  const setCoupon = useCallback((code) => setState((s) => ({ ...s, couponCode: (code || '').trim().toUpperCase() })), []);
  const clear = useCallback(() => setState(EMPTY), []);

  const value = useMemo(() => ({ items: state.items, couponCode: state.couponCode, count: countItems(state.items), add, setQty, remove, setCoupon, clear }), [state, add, setQty, remove, setCoupon, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart must be used inside <CartProvider>');
  return c;
}
