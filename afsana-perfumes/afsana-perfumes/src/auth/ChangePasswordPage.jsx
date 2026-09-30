import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { authApi } from "../services";
import AuthCard from "./AuthCard";
import ChangePasswordForm from "./ChangePasswordForm";

// Shown when an admin created the account or reset the password: nothing else works until this is done.
export default function ChangePasswordPage() {
  const { status, mustChangePassword, refresh, logout } = useAuth();
  const navigate = useNavigate();
  if (status === "guest") return <Navigate to="/admin/login" replace />;
  if (status === "authed" && !mustChangePassword) return <Navigate to="/admin" replace />;
  return (
    <AuthCard title="Choose a new password" subtitle="Your password was set by an administrator. Pick your own to continue."
      footer={<button onClick={logout} className="underline">Sign out</button>}>
      <ChangePasswordForm onSubmit={(c, n) => authApi.changePassword(c, n)} onDone={async () => { await refresh(); navigate("/admin", { replace: true }); }} />
    </AuthCard>
  );
}
