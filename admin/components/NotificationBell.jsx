import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { notificationsApi } from "../../src/services";

// Staff notification bell: polls every minute, red dot + count when something is unread, dropdown with the newest ones.
// Clicking one marks it read and opens its screen. Fails quietly (no bell data) if the request fails.
const POLL_MS = 60000;
const safeLink = (l) => (typeof l === "string" && /^\/admin(\/|$)/.test(l) ? l : "/admin");
const ago = (d) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [state, setState] = useState({ notifications: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try { const d = await notificationsApi.list(); if (alive.current) setState(d); } catch { /* bell stays as it was */ }
  }, []);
  useEffect(() => { alive.current = true; load(); const t = setInterval(load, POLL_MS); return () => { alive.current = false; clearInterval(t); }; }, [load]);

  const go = async (n) => {
    setOpen(false);
    if (!n.read) { try { await notificationsApi.markRead(n.id); } catch { /* still navigate */ } load(); }
    navigate(safeLink(n.link));
  };
  const readAll = async () => { try { await notificationsApi.readAll(); } catch { /* ignore */ } load(); };

  return (
    <div className="relative">
      <button type="button" onClick={() => { setOpen((o) => !o); if (!open) load(); }} className="relative p-2 rounded-sm text-ink-muted hover:bg-bg transition-colors" aria-label={state.unread ? `Notifications, ${state.unread} unread` : "Notifications"} aria-expanded={open}>
        <Bell className="w-4.5 h-4.5" />
        {state.unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] leading-4 text-center">{state.unread > 9 ? "9+" : state.unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 mt-2 w-80 max-w-[90vw] z-50 rounded-sm border border-border bg-surface shadow-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm text-ink">Notifications</p>
              {state.unread > 0 && <button type="button" onClick={readAll} className="text-xs text-gold hover:underline">Mark all read</button>}
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {!state.notifications.length && <li className="px-4 py-6 text-sm text-ink-muted text-center">Nothing new.</li>}
              {state.notifications.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => go(n)} className={`w-full text-left px-4 py-3 border-b border-border/60 hover:bg-bg ${n.read ? "" : "bg-gold-soft/30"}`}>
                    <p className="text-sm text-ink">{n.title}</p>
                    {n.body && <p className="text-xs text-ink-muted mt-0.5">{n.body}</p>}
                    <p className="text-[11px] text-ink-muted mt-1">{ago(n.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
