import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import MobileHeader from "@/components/MobileHeader";
import { Search, ChevronDown, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

export default function Discover() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("transparency");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["independent_brands"],
    queryFn: async () => {
      const all = await base44.entities.BrandCategoryReport.filter({
        status: "published"
      }, "-updated_date", 200).catch(() => []);
      return all;
    }
  });

  // Extract independent brand spotlights
  const independentBrands = useMemo(() => {
    if (!reports) return [];
    
    const brands = reports
      .filter(r => r.independent_brand_spotlight)
      .map(r => ({
        ...r.independent_brand_spotlight,
        category: r.category || r.independent_brand_spotlight.category || "uncategorized",
        report_id: r.id,
        brand_id: r.brand_id
      }))
      .filter(b => b.brand_name);

    // Filter by category
    const filtered = categoryFilter === "all" 
      ? brands
      : brands.filter(b => b.category === categoryFilter);

    // Search
    const searched = searchTerm.trim() === ""
      ? filtered
      : filtered.filter(b => 
          b.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.category.toLowerCase().includes(searchTerm.toLowerCase())
        );

    // Sort
    return searched.sort((a, b) => {
      if (sortBy === "transparency") {
        return (b.transparency_score || 0) - (a.transparency_score || 0);
      } else if (sortBy === "worker_ethics") {
        return (b.worker_score || 0) - (a.worker_score || 0);
      } else if (sortBy === "durability") {
        return (b.durability_score || 0) - (a.durability_score || 0);
      }
      return 0;
    });
  }, [reports, searchTerm, categoryFilter, sortBy]);

  const categories = useMemo(() => {
    if (!reports) return [];
    return [...new Set(reports.map(r => r.category))].sort();
  }, [reports]);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Discover Small Brands" />

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center justify-between px-6 py-5 max-w-5xl mx-auto border-b border-border">
        <div>
          <span className="font-syne text-base font-bold text-foreground tracking-tight">Worth Wearing</span>
          <span className="block text-[10px] text-muted-foreground tracking-widest uppercase">Discover independent brands</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-syne text-3xl md:text-4xl font-bold text-foreground mb-2">Independent Brand Spotlight</h1>
          <p className="text-sm text-muted-foreground">
            Discover smaller brands doing genuinely good work in sustainability. These are the finds that don't have billion-dollar budgets but are getting the fundamentals right.
          </p>
        </div>

        {/* Search & filters */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search brand name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            {/* Category filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-secondary rounded-full font-inter text-sm text-primary hover:bg-secondary/80 transition-colors">
                  <span>Category: {categoryFilter === "all" ? "All" : categoryFilter}</span>
                  <ChevronDown size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setCategoryFilter("all")}>All categories</DropdownMenuItem>
                {categories.map(cat => (
                  <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)}>{cat}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort by */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-secondary rounded-full font-inter text-sm text-primary hover:bg-secondary/80 transition-colors">
                  <span>Sort: {{ transparency: "Transparency", worker_ethics: "Worker Ethics", durability: "Durability" }[sortBy]}</span>
                  <ChevronDown size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setSortBy("transparency")}>Transparency</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("worker_ethics")}>Worker Ethics</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("durability")}>Durability</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary mr-2" size={18} />
            <p className="text-muted-foreground text-sm">Loading brands...</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && independentBrands.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No brands found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {independentBrands.map((brand, i) => (
              <motion.div
                key={brand.brand_name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-6 space-y-4 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-syne text-lg font-bold text-foreground">{brand.brand_name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{brand.category}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-primary font-bold">{brand.evidence_confidence}</p>
                    <p className="text-muted-foreground">confidence</p>
                  </div>
                </div>

                {/* Verdict */}
                <p className="text-sm text-foreground leading-relaxed">{brand.verdict}</p>

                {/* Scores */}
                <div className="grid grid-cols-3 gap-2">
                  {brand.transparency_score !== undefined && (
                    <div className="bg-muted/40 rounded p-2 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Transparency</p>
                      <p className="font-bold text-primary">{brand.transparency_score}</p>
                    </div>
                  )}
                  {brand.worker_score !== undefined && (
                    <div className="bg-muted/40 rounded p-2 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Workers</p>
                      <p className="font-bold text-primary">{brand.worker_score}</p>
                    </div>
                  )}
                  {brand.durability_score !== undefined && (
                    <div className="bg-muted/40 rounded p-2 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Durability</p>
                      <p className="font-bold text-primary">{brand.durability_score}</p>
                    </div>
                  )}
                </div>

                {/* Why chosen */}
                {brand.why_chosen && (
                  <div className="bg-secondary/50 border border-border rounded-lg p-3">
                    <p className="text-xs text-foreground leading-snug">{brand.why_chosen}</p>
                  </div>
                )}

                {/* CTA */}
                {brand.website && (
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Visit brand →
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <div className="mobile-bottom-spacer md:hidden" />
    </div>
  );
}