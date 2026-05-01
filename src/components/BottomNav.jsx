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

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border flex md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors select-none
              ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            style={{ WebkitUserSelect: "none", userSelect: "none" }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}