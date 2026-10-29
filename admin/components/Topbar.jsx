import { useEffect, useState } from "react";
import { Search, Sun, Moon, Monitor, LogOut, ChevronDown } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useNavigate } from "react-router-dom";

const THEME_CYCLE = ["system", "light", "dark"];
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };

export default function Topbar({
  user = { name: "Admin", role: "Owner" },
  notificationCount = 0,
  onSearch,
  onLogout,
  onProfile,
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("afsana-theme") || "system");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
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

  return (
    <header className="h-[72px] border-b border-[#1e1b4b]/10 bg-[#ffffff]/95 backdrop-blur flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-30">
      <form onSubmit={submitSearch} className="flex-1 max-w-[430px] relative ml-10 md:ml-0" role="search">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4f46e5]" />
        <input
          type="search"
          placeholder="Search anything..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#f3f4f9] dark:bg-[#1e1b4b]/20 border border-transparent rounded-xl text-sm text-[#172033] placeholder:text-[#64748b] focus:outline-none focus:border-[#4f46e5]/40 focus:ring-2 focus:ring-[#6366f1]/20"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <button onClick={cycleTheme} className="p-2.5 rounded-xl text-[#64748b] hover:bg-[#f3f4f9] transition-colors" aria-label={`Theme: ${theme}. Click to change.`} title={`Theme: ${theme}`}>
          <ThemeIcon className="w-4.5 h-4.5" />
        </button>
        <NotificationBell />
        <div className="h-8 w-px bg-[#1e1b4b]/10 mx-1.5 hidden sm:block" />
        <button onClick={onProfile} className="flex items-center gap-2.5 text-left rounded-xl px-2 py-1.5 hover:bg-[#f3f4f9] transition-colors" aria-label="My account" title="My account">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-[#1e1b4b] to-[#4f46e5] shadow-md">
            {user.name.charAt(0)}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-[#172033] leading-tight">{user.name}</p>
            <p className="text-[11px] text-[#64748b] leading-tight">{user.role}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-[#64748b] hidden sm:block" />
        </button>
        {onLogout && (
          <button onClick={onLogout} className="p-2.5 rounded-xl text-[#64748b] hover:bg-[#9b3f3f]/10 hover:text-[#9b3f3f] transition-colors" aria-label="Sign out" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
