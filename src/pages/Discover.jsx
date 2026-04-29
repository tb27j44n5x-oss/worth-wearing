import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import NavBar from "@/components/NavBar";
import BrandCard from "@/components/BrandCard";
import { Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const SPOTLIGHT_SEARCHES = [
  { label: "Natural rubber wetsuits", query: "natural rubber wetsuit" },
  { label: "Nordic outdoor brands", query: "Nordic outdoor clothing sustainable" },
  { label: "Repair-first fleece", query: "repairable fleece midlayer" },
  { label: "Merino small brands", query: "merino base layer small brand" },
  { label: "EU-made puffer jackets", query: "thin puffer jacket made in Europe" },
];

export default function Discover() {
  const [selected, setSelected] = useState(SPOTLIGHT_SEARCHES[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (item) => {
    setSelected(item);
    setData(null);
    setLoading(true);
    const res = await base44.functions.invoke("discoverBrands", { query: item.query, user_country: "Norway" });
    setData(res.data?.data || res.data);
    setLoading(false);
  };

  useEffect(() => { load(SPOTLIGHT_SEARCHES[0]); }, []);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-start gap-3">
          <Sparkles size={28} className="text-accent mt-1 flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Small brand discovery</p>
            <h1 className="font-playfair text-4xl font-bold text-foreground">Discover overlooked brands</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              We actively search for smaller and niche brands doing genuinely good work — brands you may never have heard of. 
              These are not necessarily perfect. But they are worth knowing about.
            </p>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-10">
          {SPOTLIGHT_SEARCHES.map(item => (
            <button
              key={item.label}
              onClick={() => load(item)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                selected.label === item.label
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex flex-col items-center py-20 text-center">
            <Loader2 className="animate-spin text-primary mb-4" size={32} />
            <p className="text-muted-foreground">Searching for brands — big, small, and niche...</p>
          </div>
        )}

        {data && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-sm text-muted-foreground mb-6">
              Showing results for: <span className="text-foreground font-medium">{selected.query}</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.brands?.map((brand, i) => (
                <motion.div key={brand.name + i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <BrandCard brand={brand} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}