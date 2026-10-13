import { useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import ChangePasswordForm from "../../src/auth/ChangePasswordForm";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";
import { authApi } from "../../src/services";

const when = (d) => (d ? new Date(d).toLocaleString() : "—");

export default function MyAccountPage() {
  const { user, logout } = useAuth();
  const { data, loading, error, reload } = useApi(() => authApi.sessions(), []);
  const [msg, setMsg] = useState("");
  const sessions = data?.sessions || [];

  const revoke = async (id) => { try { await authApi.revokeSession(id); reload(); } catch (e) { setMsg(e.message); } };
  const everywhere = async () => { try { await authApi.logoutAll(); } catch { /* cookie is cleared anyway */ } await logout(); };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl text-ink">My account</h1>
        <p className="text-sm text-ink-muted mt-1">{user?.name} · {user?.email} · {user?.role?.name}</p>
      </div>
      <Card>
        <h2 className="font-display text-lg text-ink mb-4">Change password</h2>
        <div className="max-w-sm"><ChangePasswordForm onSubmit={(c, n) => authApi.changePassword(c, n)} onDone={() => { setMsg("Password changed. Your other devices were signed out."); reload(); }} /></div>
      </Card>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-ink">Where you're signed in</h2>
          <Button variant="secondary" size="sm" onClick={everywhere}>Sign out everywhere</Button>
        </div>
        {msg && <p role="status" className="text-sm text-success bg-success-soft rounded-sm px-3 py-2 mb-3">{msg}</p>}
        {loading ? <p className="text-sm text-ink-muted">Loading…</p> : error ? <p className="text-sm text-danger">{error.message}</p> : (
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">{s.device?.userAgent || "Unknown device"}{s.current && <span className="ml-2 text-xs text-success">This device</span>}</p>
                  <p className="text-xs text-ink-muted">{s.device?.ip || "—"} · last active {when(s.lastActiveAt)}</p>
                </div>
                {!s.current && <Button variant="ghost" size="sm" onClick={() => revoke(s.id)}>Sign out</Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
