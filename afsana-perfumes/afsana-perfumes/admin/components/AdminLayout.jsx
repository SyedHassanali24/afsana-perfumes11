import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/**
 * Wrap admin pages with this. Example (React Router):
 *
 *   <Route path="/admin" element={<AdminLayout activeHref="/admin"><Dashboard /></AdminLayout>} />
 */
export default function AdminLayout({ children, activeHref, user, notificationCount }) {
  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar activeHref={activeHref} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar user={user} notificationCount={notificationCount} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
