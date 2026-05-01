import { ShoppingBag, ExternalLink, Lightbulb, Search } from "lucide-react";
import { useState } from "react";

export default function SecondHandSection({ result }) {
  const hasLinks = result.second_hand_links?.length > 0;
  const hasAdvice = result.second_hand_advice;
  const [selectedBrand, setSelectedBrand] = useState("");

  if (!hasLinks && !hasAdvice) return null;

  // Get unique brand names from recommendation blocks
  const brandOptions = [
    result.best_overall?.brand_name,
    result.best_for_durability?.brand_name,
    result.best_for_transparency?.brand_name,
    result.best_for_worker_ethics?.brand_name,
    result.best_second_hand_choice?.brand_name,
    result.independent_brand_spotlight?.brand_name
  ].filter(Boolean);

  const uniqueBrands = [...new Set(brandOptions)];
  const searchTerm = selectedBrand || result.query || "";

  const buildSearchUrl = (url) => {
    return url.includes("?") ? `${url}&q=${encodeURIComponent(searchTerm)}` : `${url}?q=${encodeURIComponent(searchTerm)}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-syne text-2xl font-semibold text-foreground">Buying second-hand</h2>
        <p className="text-sm text-muted-foreground mt-1">Often the most sustainable — and cheapest — option.</p>
      </div>

      {/* Search customization */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-medium text-amber-900">Search for:</p>
        
        {/* Original query option */}
        <button
          onClick={() => setSelectedBrand("")}
          className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
            !selectedBrand
              ? "bg-amber-600 text-white border-amber-600"
              : "bg-white text-amber-900 border-amber-200 hover:bg-amber-100"
          }`}
        >
          "{result.query}"
        </button>

        {/* Brand options */}
        {uniqueBrands.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-amber-800 font-medium">Or a specific brand:</p>
            {uniqueBrands.map((brand) => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                  selectedBrand === brand
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-amber-900 border-amber-200 hover:bg-amber-100"
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Practical advice */}
      {hasAdvice && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <Lightbulb size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-relaxed">{result.second_hand_advice}</p>
        </div>
      )}

      {/* Marketplace links */}
      {hasLinks && (
        <div className="space-y-2">
          <p className="text-xs text-amber-900 font-medium">Searching for: <span className="text-amber-700 font-semibold">"{searchTerm}"</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {result.second_hand_links.map((link, i) => (
              <a
                key={i}
                href={buildSearchUrl(link.search_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-card border border-border hover:border-amber-300 hover:shadow-sm rounded-xl px-4 py-3 transition-all group"
              >
                <Search size={14} className="text-amber-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground group-hover:text-amber-700 transition-colors truncate">{link.platform}</p>
                  {link.note && <p className="text-xs text-muted-foreground truncate">{link.note}</p>}
                </div>
                <ExternalLink size={12} className="text-muted-foreground flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}