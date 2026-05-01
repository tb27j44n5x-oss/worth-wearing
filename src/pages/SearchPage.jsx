import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Shield, Wrench, ShoppingBag, Eye, MapPin, RefreshCw, DollarSign, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ROTATING_WORDS = ["jacket", "hoodie", "wetsuit", "base layers", "jeans", "clothes"];

const EXAMPLES = [
  "waterproof shell jacket",
  "natural rubber wetsuit",
  "warm winter coat",
  "merino base layer",
  "fleece midlayer",
];

const FEATURES = [
  { icon: Shield, label: "Evidence-backed", desc: "We separate verified facts from brand marketing claims." },
  { icon: Eye, label: "Small brand discovery", desc: "We surface lesser-known brands doing genuinely good work." },
  { icon: Wrench, label: "Repair-first logic", desc: "We check if brands actually back up their repair promises." },
  { icon: ShoppingBag, label: "Second-hand first", desc: "Sometimes the most sustainable choice is buying used." },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [country, setCountry] = useState("Norway");
  const [preference, setPreference] = useState("either");
  const [budget, setBudget] = useState("mid");
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex(i => (i + 1) % ROTATING_WORDS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

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
        <div>
          <span className="font-syne text-lg font-bold text-foreground tracking-tight">Worth Wearing</span>
          <span className="block text-[10px] text-muted-foreground tracking-widest uppercase font-inter">by Patrick Olsen.tech</span>
        </div>

      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-14 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          <h1 className="font-syne text-5xl md:text-6xl font-bold text-foreground leading-[1.08] mb-4 tracking-tight">
            Find{" "}
            <span
              key={wordIndex}
              className="text-accent italic inline-block"
              style={{ animation: "fadeUp 0.4s ease-out" }}
            >
              {ROTATING_WORDS[wordIndex]}
            </span>
            <br />worth wearing
          </h1>


          {/* Search input */}
          <div className="flex items-center bg-card border border-border rounded-2xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all mb-4">
            <Search className="ml-4 text-muted-foreground flex-shrink-0" size={18} />
            <input
              type="text"
              placeholder="Try: waterproof shell jacket, natural rubber wetsuit, warm winter coat"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-3 py-4 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm min-w-0"
            />
            <button
              onClick={() => handleSearch()}
              disabled={!query.trim()}
              className="m-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-1.5 flex-shrink-0 font-syne"
            >
              <span className="hidden sm:inline">Find a better buy</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Optional filters */}
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            {/* Country */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-5 py-3 bg-secondary border border-secondary rounded-full font-inter text-sm text-primary hover:bg-secondary/80 transition-colors">
                  <MapPin size={15} className="text-primary/70 flex-shrink-0" />
                  <span>{country}</span>
                  <ChevronDown size={13} className="text-primary/50 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {["Norway","Sweden","Denmark","UK","Germany","Netherlands"].map(c => (
                  <DropdownMenuItem key={c} onClick={() => setCountry(c)}>{c}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Preference */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-5 py-3 bg-secondary border border-secondary rounded-full font-inter text-sm text-primary hover:bg-secondary/80 transition-colors">
                  <RefreshCw size={15} className="text-primary/70 flex-shrink-0" />
                  <span>{{ either: "New or second-hand", new: "Buying new", secondhand: "Second-hand only" }[preference]}</span>
                  <ChevronDown size={13} className="text-primary/50 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={() => setPreference("either")}>New or second-hand</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPreference("new")}>Buying new</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPreference("secondhand")}>Second-hand only</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Budget */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-5 py-3 bg-secondary border border-secondary rounded-full font-inter text-sm text-primary hover:bg-secondary/80 transition-colors">
                  <DollarSign size={15} className="text-primary/70 flex-shrink-0" />
                  <span>{{ low: "Budget", mid: "Mid-range", premium: "Premium" }[budget]}</span>
                  <ChevronDown size={13} className="text-primary/50 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={() => setBudget("low")}>Budget</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBudget("mid")}>Mid-range</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBudget("premium")}>Premium</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Example searches */}
          <div className="flex flex-wrap gap-2 justify-center">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => handleSearch(ex)}
                className="text-sm text-muted-foreground bg-secondary/60 hover:bg-secondary hover:text-foreground px-3 py-1.5 rounded-full transition-colors border border-border"
              >
                {ex}
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      {/* About the app */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="font-syne text-2xl font-semibold text-foreground text-center mb-8">How we pick what's worth wearing</h2>
          <div className="space-y-3">
            {[
              { step: "🔍", title: "We scan real evidence", desc: "We look at independent audits, certification data, repair policies, and community reviews — not just what brands say about themselves." },
              { step: "⚖️", title: "We score on what matters", desc: "Every brand is evaluated on durability, transparency, repairability, second-hand availability, and manufacturing clarity. We flag what we couldn't verify." },
              { step: "🏆", title: "We surface the honest picks", desc: "Our recommendation shows the best overall choice, the most durable, the most transparent, and the best second-hand option — so you can decide what matters most to you." },
            ].map(({ step, title, desc }) => (
              <div key={title} className="flex items-start gap-4 bg-card border border-border rounded-2xl px-6 py-5">
                <span className="text-xl flex-shrink-0 mt-0.5">{step}</span>
                <div>
                  <p className="font-syne font-semibold text-foreground text-sm mb-1">{title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
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
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                <Icon size={18} className="text-accent" />
              </div>
              <h3 className="font-syne font-semibold text-foreground mb-2 text-sm">{label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <span className="font-syne font-medium text-foreground">Worth Wearing</span>
        {" "}— a free research tool by{" "}
        <a href="https://patrickolsen.tech" className="underline underline-offset-2 hover:text-foreground transition-colors">Patrick Olsen.tech</a>
      </footer>
      <div className="mobile-bottom-spacer md:hidden" />
    </div>
  );
}