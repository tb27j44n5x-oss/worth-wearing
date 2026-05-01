import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useState } from "react";

export default function NavBar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
        <Link to="/" className="flex-shrink-0">
          <span className="font-syne text-base font-bold text-foreground tracking-tight">Worth Wearing</span>
          <span className="block text-[9px] text-muted-foreground tracking-widest uppercase leading-none">by Patrick Olsen.tech</span>
        </Link>
        <div className="flex-1 flex items-center bg-muted rounded-xl overflow-hidden max-w-xl">
          <Search size={16} className="ml-3 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search brands or products..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-5 items-center">
          <Link to="/discover" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:block">Discover</Link>
          <Link to="/compare" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:block">Compare</Link>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:block">Admin</Link>
        </div>
      </div>
    </nav>
  );
}