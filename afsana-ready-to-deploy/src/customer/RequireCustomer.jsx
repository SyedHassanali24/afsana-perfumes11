import { Navigate, useLocation } from "react-router-dom";
import { useCustomer } from "./CustomerAuthContext";

export default function RequireCustomer({ children }) {
  const { status } = useCustomer();
  const location = useLocation();
  if (status === "loading") return <div className="min-h-screen flex items-center justify-center bg-bg text-ink-muted text-sm">Loading…</div>;
  if (status === "guest") return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
