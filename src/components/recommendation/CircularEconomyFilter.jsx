import { useState } from "react";
import { Recycle, ChevronDown } from "lucide-react";

export default function CircularEconomyFilter({ isActive, onToggle, brandsWithCircular }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!brandsWithCircular || brandsWithCircular.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-5 py-3 rounded-full font-inter text-sm font-medium transition-colors border ${
          isActive
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-secondary border-secondary text-primary hover:bg-secondary/80"
        }`}
      >
        <Recycle size={15} />
        Repair & Circular Focus
        {isActive && <span className="ml-auto text-xs">✓</span>}
      </button>

      {isActive && (
        <div className="space-y-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <span>Brands with strong circular programs</span>
              <ChevronDown size={14} className={`transform transition-transform ${showDetails ? "rotate-180" : ""}`} />
            </button>
            {showDetails && (
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p>This filter shows brands with:</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>Circularity score {'>'} 7</li>
                  <li>Active repair programs with documented usage</li>
                  <li>Take-back or recycling initiatives</li>
                  <li>Design-for-longevity approach</li>
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-emerald-200">
            {brandsWithCircular.map(brand => (
              <div key={brand.brand_name} className="bg-white rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground text-sm">{brand.brand_name}</p>
                
                {brand.circularity_breakdown?.repair_programs?.exists && (
                  <div className="text-xs">
                    <span className="font-medium text-emerald-700">🔧 Repair:</span> {brand.circularity_breakdown.repair_programs.name}
                    {brand.circularity_breakdown.repair_programs.uptake_rate && (
                      <span className="text-muted-foreground"> — {brand.circularity_breakdown.repair_programs.uptake_rate} uptake</span>
                    )}
                  </div>
                )}

                {brand.circularity_breakdown?.take_back_schemes?.exists && (
                  <div className="text-xs">
                    <span className="font-medium text-emerald-700">♻️ Take-back:</span> {brand.circularity_breakdown.take_back_schemes.description}
                  </div>
                )}

                {brand.circularity_breakdown?.recycling_initiatives?.exists && (
                  <div className="text-xs">
                    <span className="font-medium text-emerald-700">🌍 Recycling:</span> {brand.circularity_breakdown.recycling_initiatives.description}
                  </div>
                )}

                <button
                  onClick={() => window.open(`${brand.website}?repair=true`, '_blank')}
                  className="text-xs text-primary hover:underline font-medium mt-2 inline-block"
                >
                  Learn how to use repair services →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}