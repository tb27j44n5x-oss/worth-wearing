import { Link, useLocation } from "react-router-dom";
import { Search, Sparkles, Lightbulb, Settings } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: Search, label: "Search" },
  { to: "/discover", icon: Sparkles, label: "Discover" },
  { to: "/suggest", icon: Lightbulb, label: "Suggest" },
  { to: "/admin", icon: Settings, label: "Admin" },
];


export default function BottomNav() {
  const { pathname } = useLocation();

  // Determine active tab: exact match or parent route
  const getIsActive = (to) => {
    if (to === '/') return pathname === '/';
    // For other tabs, match exact or nested routes
    return pathname === to || pathname.startsWith(to + '/');
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border flex md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
        const active = getIsActive(to);
        return (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors select-none
              ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            style={{ WebkitUserSelect: "none", userSelect: "none" }}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.75} aria-hidden="true" />
            <span className="text-[10px] font-medium sr-only">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}