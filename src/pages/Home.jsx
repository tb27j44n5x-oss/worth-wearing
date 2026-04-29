import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Leaf, Shield, Wrench, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const EXAMPLE_SEARCHES = [
  "thin puffer jacket",
  "mens 5mm wetsuit",
  "merino base layer",
  "sustainable rain jacket",
  "fleece midlayer",
];

const FEATURES = [
  { icon: Shield, label: "Evidence-backed", desc: "We separate verified facts from brand marketing claims." },
  { icon: Leaf, label: "Small brand discovery", desc: "We surface lesser-known brands doing genuinely good work." },
  { icon: Wrench, label: "Repair-first logic", desc: "We check if brands actually back up their repair promises." },
  { icon: ShoppingBag, label: "Second-hand first", desc: "Sometimes the most sustainable choice is buying used." },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (q) => {
    const term = q || query;
    if (term.trim()) navigate(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span className="font-playfair text-xl font-bold text-primary tracking-tight">ClaimCheck</span>
        <div className="flex gap-6 items-center">
          <a href="/discover" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Discover</a>
          <a href="/compare" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Compare</a>
          <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Admin</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-accent/15 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-8 tracking-wide uppercase">
            <Leaf size={12} />
            Sustainability research, not marketing
          </div>
          <h1 className="font-playfair text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-6">
            Sustainability research<br />
            <span className="text-primary italic">for sceptics.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12">
            Find lower-impact clothing and wetsuits with evidence-backed research, small-brand discovery, 
            repair-first logic, and clear confidence levels. No greenwashing. No buzzwords.
          </p>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center bg-card border border-border rounded-2xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
              <Search className="ml-5 text-muted-foreground flex-shrink-0" size={20} />
              <input
                type="text"
                placeholder="What are you looking for? e.g. thin puffer jacket"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-5 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base"
              />
              <button
                onClick={() => handleSearch()}
                className="m-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                Research <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Example searches */}
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {EXAMPLE_SEARCHES.map(ex => (
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

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: FeatureIcon, label, desc }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-6"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <FeatureIcon size={18} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm">{label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Philosophy */}
      <section className="border-t border-border py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-playfair text-3xl md:text-4xl text-foreground mb-6">
            We do not trust sustainability marketing.<br />
            <span className="text-primary italic">You shouldn't either.</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            ClaimCheck separates verified evidence from brand claims, highlights smaller brands doing genuinely good work, 
            and always tells you what is uncertain. Because sustainability is complex — and anyone who tells you otherwise is selling something.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        ClaimCheck — Sustainability research for people who do not trust sustainability marketing.
      </footer>
    </div>
  );
}