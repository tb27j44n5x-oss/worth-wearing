import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Leaf, Shield, Wrench, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const EXAMPLES = [
  "waterproof shell jacket",
  "thin puffer jacket",
  "fleece midlayer",
  "merino base layer",
  "winter hiking jacket",
];

const FEATURES = [
  { icon: Shield, label: "Evidence-backed", desc: "We separate verified facts from brand marketing claims." },
  { icon: Leaf, label: "Small brand discovery", desc: "We surface lesser-known brands doing genuinely good work." },
  { icon: Wrench, label: "Repair-first logic", desc: "We check if brands actually back up their repair promises." },
  { icon: ShoppingBag, label: "Second-hand first", desc: "Sometimes the most sustainable choice is buying used." },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("Norway");
  const [preference, setPreference] = useState("either");
  const [budget, setBudget] = useState("mid");
  const navigate = useNavigate();

  const handleSearch = (q) => {
    const term = (q || query).trim();
    if (!term) return;
    const params = new URLSearchParams({ q: term, country, preference, budget });
    navigate(`/recommendation?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <span className="font-playfair text-xl font-bold text-primary tracking-tight">ClaimCheck</span>
        <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Admin</a>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 bg-accent/15 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-8 tracking-wide uppercase">
            <Leaf size={12} /> Sustainability research, not marketing
          </div>

          <h1 className="font-playfair text-5xl md:text-6xl font-bold text-foreground leading-[1.1] mb-5">
            Find a better<br />
            <span className="text-primary italic">jacket brand.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-10">
            Get a recommendation based on durability, transparency, repairability, second-hand value, 
            manufacturing evidence, and what is still unknown.
          </p>

          {/* Search input */}
          <div className="flex items-center bg-card border border-border rounded-2xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 transition-all mb-4">
            <Search className="ml-5 text-muted-foreground flex-shrink-0" size={20} />
            <input
              type="text"
              placeholder="e.g. I need a waterproof shell jacket"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-5 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base"
            />
            <button
              onClick={() => handleSearch()}
              disabled={!query.trim()}
              className="m-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              Research <ArrowRight size={16} />
            </button>
          </div>

          {/* Optional filters */}
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="text-sm bg-muted border border-border rounded-xl px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="Norway">Norway</option>
              <option value="Sweden">Sweden</option>
              <option value="Denmark">Denmark</option>
              <option value="UK">UK</option>
              <option value="Germany">Germany</option>
              <option value="Netherlands">Netherlands</option>
            </select>

            <select
              value={preference}
              onChange={e => setPreference(e.target.value)}
              className="text-sm bg-muted border border-border rounded-xl px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="either">New or second-hand</option>
              <option value="new">Buying new</option>
              <option value="secondhand">Second-hand only</option>
            </select>

            <select
              value={budget}
              onChange={e => setBudget(e.target.value)}
              className="text-sm bg-muted border border-border rounded-xl px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="low">Budget</option>
              <option value="mid">Mid-range</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          {/* Example searches */}
          <div className="flex flex-wrap gap-2 justify-center">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => handleSearch(ex)}
                className="text-sm text-muted-foreground bg-muted hover:bg-secondary hover:text-foreground px-3 py-1.5 rounded-full transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-6"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Icon size={18} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm">{label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        ClaimCheck — Sustainability research for people who do not trust sustainability marketing.
      </footer>
    </div>
  );
}