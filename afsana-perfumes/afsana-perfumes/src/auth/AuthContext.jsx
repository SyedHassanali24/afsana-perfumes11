import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services';
import { can as canFn } from './permissions';

const AuthContext = createContext(null);

// status: 'loading' (checking session) | 'authed' | 'guest'
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, permissions: null, mustChangePassword: false });

  const refresh = useCallback(async () => {
    try {
      const { user, permissions, mustChangePassword } = await authApi.me();
      setState({ status: 'authed', user, permissions, mustChangePassword: !!mustChangePassword });
    } catch {
      setState({ status: 'guest', user: null, permissions: null, mustChangePassword: false });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Any API call that comes back 401 anywhere in the app -> back to login.
  useEffect(() => {
    const onUnauthorized = () => setState({ status: 'guest', user: null, permissions: null, mustChangePassword: false });
    const onMustChange = () => setState((s) => ({ ...s, mustChangePassword: true }));
    window.addEventListener('afsana:unauthorized', onUnauthorized);
    window.addEventListener('afsana:must-change-password', onMustChange);
    return () => { window.removeEventListener('afsana:unauthorized', onUnauthorized); window.removeEventListener('afsana:must-change-password', onMustChange); };
  }, []);

  const login = useCallback(async (email, password) => {
    await authApi.login(email, password); // throws ApiError on failure (message is safe to show)
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* cookie may already be gone */ }
    setState({ status: 'guest', user: null, permissions: null, mustChangePassword: false });
  }, []);

  const value = useMemo(() => ({
    ...state,
    login, logout, refresh,
    can: (key) => canFn(state.permissions, key),
  }), [state, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
