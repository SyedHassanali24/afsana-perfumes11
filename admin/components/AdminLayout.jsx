import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "../../src/auth/AuthContext";

/**
 * Shell for every admin page. Reads the logged-in user from AuthContext and
 * highlights the sidebar from the current URL. Use inside <RequireAuth>.
 */
export default function AdminLayout({ children, notificationCount }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar activeHref={pathname} onNavigate={navigate} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar user={{ name: user?.name || "Staff", role: user?.role?.name || "" }} notificationCount={notificationCount} onLogout={logout} onProfile={() => navigate("/admin/account")} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
