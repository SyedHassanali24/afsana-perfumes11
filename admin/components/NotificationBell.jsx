import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { notificationsApi } from "../../src/services";

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
    try { const d = await notificationsApi.list(); if (alive.current) setState(d); } catch {}
  }, []);
  useEffect(() => { alive.current = true; load(); const t = setInterval(load, POLL_MS); return () => { alive.current = false; clearInterval(t); }; }, [load]);

  const go = async (n) => {
    setOpen(false);
    if (!n.read) { try { await notificationsApi.markRead(n.id); } catch {} load(); }
    navigate(safeLink(n.link));
  };
  const readAll = async () => { try { await notificationsApi.readAll(); } catch {} load(); };

  return (
    <div className="relative">
      <button type="button" onClick={() => { setOpen((o) => !o); if (!open) load(); }} className="relative p-2 rounded-xl text-[#5f654f] hover:bg-[#f3f1e9] hover:text-[#182308] transition-colors" aria-label={state.unread ? `Notifications, ${state.unread} unread` : "Notifications"} aria-expanded={open}>
        <Bell className="w-4.5 h-4.5" />
        {state.unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#9b3f3f] text-white text-[10px] leading-4 text-center">{state.unread > 9 ? "9+" : state.unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 mt-2 w-80 max-w-[90vw] z-50 rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#263e0e]/10">
              <p className="text-sm text-[#182308]">Notifications</p>
              {state.unread > 0 && <button type="button" onClick={readAll} className="text-xs text-[#748e40] hover:text-[#263e0e] hover:underline">Mark all read</button>}
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {!state.notifications.length && <li className="px-4 py-6 text-sm text-[#5f654f] text-center">Nothing new.</li>}
              {state.notifications.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => go(n)} className={`w-full text-left px-4 py-3 border-b border-[#263e0e]/10 hover:bg-[#f3f1e9] ${n.read ? "" : "bg-[#e7ead9]/60"}`}>
                    <p className="text-sm text-[#182308]">{n.title}</p>
                    {n.body && <p className="text-xs text-[#5f654f] mt-0.5">{n.body}</p>}
                    <p className="text-[11px] text-[#5f654f] mt-1">{ago(n.createdAt)}</p>
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
