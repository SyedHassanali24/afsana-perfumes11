import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { accountApi } from "../services";

const Ctx = createContext(null);

// Storefront shoppers. Completely separate from staff auth (different cookie, different API).
// status: 'loading' | 'authed' | 'guest'
export function CustomerAuthProvider({ children }) {
  const [state, setState] = useState({ status: "loading", customer: null });

  const refresh = useCallback(async () => {
    try { const { customer } = await accountApi.me(); setState({ status: "authed", customer }); }
    catch { setState({ status: "guest", customer: null }); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (identifier, password) => { const { customer } = await accountApi.login(identifier, password); setState({ status: "authed", customer }); }, []);
  const register = useCallback(async (body) => { const { customer } = await accountApi.register(body); setState({ status: "authed", customer }); }, []);
  const logout = useCallback(async () => { try { await accountApi.logout(); } catch { /* already signed out */ } setState({ status: "guest", customer: null }); }, []);

  const value = useMemo(() => ({ ...state, login, register, logout, refresh }), [state, login, register, logout, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useCustomer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCustomer must be used inside <CustomerAuthProvider>");
  return c;
}
