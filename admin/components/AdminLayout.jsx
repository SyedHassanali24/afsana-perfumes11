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
    <div className="admin-shell min-h-screen">
      <div className="flex min-h-screen">
        <Sidebar activeHref={pathname} onNavigate={navigate} />

        <div className="min-w-0 flex-1 flex flex-col">
          <Topbar
            user={{ name: user?.name || "Staff", role: user?.role?.name || "" }}
            notificationCount={notificationCount}
            onLogout={logout}
            onProfile={() => navigate("/admin/account")}
          />

          <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div className="mx-auto w-full max-w-[1600px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
