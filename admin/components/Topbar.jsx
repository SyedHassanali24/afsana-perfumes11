import { useEffect, useState } from "react";
import { Search, Sun, Moon, LogOut, ChevronDown, Database, Trash2 } from "lucide-react";
import { CACHE_EVENT, clearApiCache, getApiCacheStats } from "../../src/services/api";
import NotificationBell from "./NotificationBell";
import { useNavigate } from "react-router-dom";

const THEME_CYCLE = ["light", "dark"];
const THEME_ICON = { light: Sun, dark: Moon };

export default function Topbar({
  user = { name: "Admin", role: "Owner" },
  notificationCount = 0,
  onSearch,
  onLogout,
  onProfile,
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("afsana-theme") || "light");
  const [cacheStats, setCacheStats] = useState(() => getApiCacheStats());
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setCacheStats(getApiCacheStats());
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener(CACHE_EVENT, update);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener(CACHE_EVENT, update); window.removeEventListener("scroll", onScroll); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem("afsana-theme", theme);
  }, [theme]);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      onSearch?.(q);
      navigate(`/admin/products?q=${encodeURIComponent(q)}`);
    }
  };

  const cycleTheme = () => setTheme(THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length]);
  const ThemeIcon = THEME_ICON[theme];
  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** i)).toFixed(i ? 1 : 0)} ${units[i]}`;
  };

  return (
    <header className={`admin-glass-header h-[72px] flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-30 transition-all duration-300 ${scrolled ? "is-scrolled" : ""}`}>
      <form onSubmit={submitSearch} className="flex-1 max-w-[430px] relative ml-10 md:ml-0" role="search">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4f46e5]" />
        <input
          type="search"
          placeholder="Search anything..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="admin-glass-control w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="admin-cache-control admin-glass-control flex items-center gap-1 rounded-xl px-2 py-1.5" title={`${cacheStats.entries} cached requests · ${formatBytes(cacheStats.bytes)}`}>
          <Database className="w-3.5 h-3.5 text-[#4f46e5]" />
          <span className="cache-size text-[10px] font-semibold">{formatBytes(cacheStats.bytes)}</span><span className="cache-count hidden sm:inline text-[10px]">· {cacheStats.active} cached</span>
          <button type="button" onClick={clearApiCache} className="cache-clear ml-1 p-1 rounded-md hover:bg-[#e11d48]/10 hover:text-[#fb7185]" aria-label="Clear dashboard cache" title="Clear cache"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
        <button onClick={cycleTheme} className="admin-topbar-icon p-2.5 rounded-xl transition-colors" aria-label={`Theme: ${theme}. Click to change.`} title={`Theme: ${theme}`}>
          <ThemeIcon className="w-4.5 h-4.5" />
        </button>
        <NotificationBell />
        <div className="h-8 w-px bg-[#1e1b4b]/10 mx-1.5 hidden sm:block" />
        <button onClick={onProfile} className="admin-profile-control flex items-center gap-2.5 text-left rounded-xl px-2 py-1.5 transition-colors" aria-label="My account" title="My account">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-[#1e1b4b] to-[#4f46e5] shadow-md">
            {user.name.charAt(0)}
          </div>
          <div className="text-left hidden sm:block">
            <p className="admin-profile-name text-sm font-semibold leading-tight">{user.name}</p>
            <p className="admin-profile-role text-[11px] leading-tight">{user.role}</p>
          </div>
          <ChevronDown className="admin-profile-chevron w-4 h-4 hidden sm:block" />
        </button>
        {onLogout && (
          <button onClick={onLogout} className="admin-topbar-icon p-2.5 rounded-xl transition-colors" aria-label="Sign out" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
