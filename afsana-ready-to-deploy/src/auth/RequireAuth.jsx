import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

// <RequireAuth>            -> any logged-in staff
// <RequireAuth permission="products.view"> -> also needs that permission (UX only; server re-checks)
export default function RequireAuth({ permission, children }) {
  const { status, can, mustChangePassword } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-bg text-ink-muted text-sm">Loading…</div>;
  }
  if (status === 'guest') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  if (mustChangePassword && location.pathname !== '/admin/change-password') {
    return <Navigate to="/admin/change-password" replace />;
  }
  if (permission && !can(permission)) {
    return (
      <div className="p-10 text-center">
        <h1 className="font-display text-xl text-ink mb-2">Access denied</h1>
        <p className="text-sm text-ink-muted">Your role does not include this section. Ask the owner if you need access.</p>
      </div>
    );
  }
  return children;
}
