import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import NavBar from "@/components/NavBar";
import BrandCard from "@/components/BrandCard";
import { Loader2, ShoppingBag, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const GROUP_ORDER = ["lower_impact", "small_discovery", "second_hand_first", "repairable_durable", "caution"];
const GROUP_TITLES = {
  lower_impact:       { title: "Best lower-impact options", desc: "Brands with strong evidence of lower environmental impact." },
  small_discovery:    { title: "Small brands worth discovering", desc: "Lesser-known brands with standout sustainability practices." },
  second_hand_first:  { title: "Better second-hand", desc: "These brands are commonly available used — that may be the smarter choice." },
  repairable_durable: { title: "Strong repair & durability", desc: "Brands with clear evidence of repairability and product longevity." },
  caution:            { title: "Approach with caution", desc: "Vague claims, weak transparency, or poor repair policies." },
};

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setData(null);
    setError(null);
    base44.functions.invoke("discoverBrands", { query, user_country: "Norway" })
      .then(res => setData(res.data?.data || res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [query]);

  const grouped = data?.brands?.reduce((acc, brand) => {
    const g = brand.result_group || "lower_impact";
    if (!acc[g]) acc[g] = [];
    acc[g].push(brand);
    return acc;
  }, {}) || {};

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        {query && (
          <div className="mb-8">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Research results for</p>
            <h1 className="font-playfair text-3xl md:text-4xl font-bold text-foreground">"{query}"</h1>
            {data?.product_category && (
              <p className="text-muted-foreground mt-2">Category identified: <span className="text-foreground font-medium">{data.product_category}</span></p>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="animate-spin text-primary mb-4" size={36} />
            <p className="font-playfair text-xl text-foreground mb-2">Researching brands...</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Our AI agent is searching for all relevant brands — big, small, and niche — and evaluating their sustainability practices.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center">
            <p className="text-destructive font-medium">Research failed: {error}</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-12">
            {GROUP_ORDER.map(group => {
              const brands = grouped[group];
              if (!brands?.length) return null;
              const meta = GROUP_TITLES[group];
              return (
                <motion.section key={group} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="mb-5">
                    <h2 className="font-playfair text-2xl font-semibold text-foreground">{meta.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{meta.desc}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {brands.map((brand, i) => (
                      <motion.div key={brand.name + i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                        <BrandCard brand={brand} />
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              );
            })}

            {/* Direct product links */}
            {data.product_links?.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="border-t border-border pt-10">
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-2">Buy new — direct product links</h2>
                <p className="text-sm text-muted-foreground mb-5">Links to specific products matching your search on each brand's website.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.product_links.map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all group">
                      <ExternalLink size={14} className="text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{p.product_name}</p>
                        <p className="text-xs text-muted-foreground">{p.brand}{p.price_approx ? ` · ${p.price_approx}` : ""}</p>
                        {p.note && <p className="text-xs text-muted-foreground mt-0.5">{p.note}</p>}
                      </div>
                    </a>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Second-hand links */}
            {data.second_hand_links?.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="border-t border-border pt-10">
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-2">Buy second-hand</h2>
                <p className="text-sm text-muted-foreground mb-5">Search results pre-filled with your query on second-hand platforms.</p>
                <div className="flex flex-wrap gap-3">
                  {data.second_hand_links.map((s, i) => (
                    <a key={i} href={s.search_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm hover:border-amber-400 hover:shadow-sm transition-all">
                      <ShoppingBag size={14} className="text-amber-700" />
                      <span className="font-medium text-amber-900">{s.platform}</span>
                      {s.note && <span className="text-amber-700 text-xs">— {s.note}</span>}
                      <ExternalLink size={12} className="text-amber-600" />
                    </a>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Suggest a brand */}
            <div className="border-t border-border pt-8">
              <p className="text-sm text-muted-foreground">
                Know a brand we should research?{" "}
                <a href="/suggest" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">Suggest a brand</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}