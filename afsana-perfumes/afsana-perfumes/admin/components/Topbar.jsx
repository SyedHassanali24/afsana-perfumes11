import { useEffect, useState } from "react";
import { Search, Bell, Sun, Moon, Monitor, ChevronDown } from "lucide-react";

const THEME_CYCLE = ["system", "light", "dark"];
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };

/**
 * @param {{name: string, role: string}} [user]
 * @param {number} [notificationCount]
 * @param {(query: string) => void} [onSearch]
 */
export default function Topbar({
  user = { name: "Admin", role: "Owner" },
  notificationCount = 0,
  onSearch,
}) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("afsana-theme") || "system"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    localStorage.setItem("afsana-theme", theme);
  }, [theme]);

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
  };
  const ThemeIcon = THEME_ICON[theme];

  return (
    <header className="h-16 border-b border-border bg-surface flex items-center gap-4 px-6 sticky top-0 z-10">
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          placeholder="Search orders, products, customers…"
          onChange={(e) => onSearch?.(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-sm text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>

      <button
        onClick={cycleTheme}
        className="p-2 rounded-sm text-ink-muted hover:bg-bg transition-colors"
        aria-label={`Theme: ${theme}. Click to change.`}
        title={`Theme: ${theme}`}
      >
        <ThemeIcon className="w-4.5 h-4.5" />
      </button>

      <button className="relative p-2 rounded-sm text-ink-muted hover:bg-bg transition-colors" aria-label="Notifications">
        <Bell className="w-4.5 h-4.5" />
        {notificationCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger" />
        )}
      </button>

      <button className="flex items-center gap-2.5 pl-3 border-l border-border">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
          style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
        >
          {user.name.charAt(0)}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm text-ink leading-tight">{user.name}</p>
          <p className="text-xs text-ink-muted leading-tight">{user.role}</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
      </button>
    </header>
  );
}
