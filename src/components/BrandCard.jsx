import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, ShoppingBag } from "lucide-react";
import GradeBadge from "./GradeBadge";
import ConfidenceBadge from "./ConfidenceBadge";
import SmallBrandSpotlight from "./SmallBrandSpotlight";

const groupLabels = {
  lower_impact:       { label: "Lower-impact option",        color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  small_discovery:    { label: "Small brand discovery",      color: "text-primary bg-accent/15 border-accent/30" },
  second_hand_first:  { label: "Better second-hand",         color: "text-amber-700 bg-amber-50 border-amber-200" },
  repairable_durable: { label: "Strong repair & durability", color: "text-blue-700 bg-blue-50 border-blue-200" },
  caution:            { label: "Approach with caution",      color: "text-orange-700 bg-orange-50 border-orange-200" },
};

export default function BrandCard({ brand }) {
  const group = groupLabels[brand.result_group];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {group && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${group.color}`}>
                {group.label}
              </span>
            )}
          </div>
          <h3 className="font-playfair text-xl font-semibold text-foreground truncate">{brand.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{brand.country} · {brand.size_estimate} brand</p>
        </div>
        <GradeBadge grade={brand.preliminary_grade} size="md" />
      </div>

      {/* Confidence */}
      <ConfidenceBadge confidence={brand.preliminary_confidence} />

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{brand.why_shown || brand.description}</p>

      {/* Standout + Concern */}
      <div className="space-y-2">
        {brand.standout_practice && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-emerald-700 mt-0.5 flex-shrink-0">✓ Strong:</span>
            <span className="text-xs text-foreground">{brand.standout_practice}</span>
          </div>
        )}
        {brand.main_concern && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-amber-700 mt-0.5 flex-shrink-0">△ Uncertain:</span>
            <span className="text-xs text-foreground">{brand.main_concern}</span>
          </div>
        )}
      </div>

      {/* Spotlight */}
      {brand.is_small_brand_spotlight && brand.spotlight_reason && (
        <SmallBrandSpotlight reason={brand.spotlight_reason} />
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
        {brand.second_hand_available && (
          <span className="flex items-center gap-1 text-xs text-amber-700">
            <ShoppingBag size={12} /> Available second-hand
          </span>
        )}
        {brand.website && (
          <a href={brand.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-auto transition-colors">
            Website <ExternalLink size={11} />
          </a>
        )}
        <Link
          to={`/brand/${encodeURIComponent(brand.name)}?website=${encodeURIComponent(brand.website || '')}`}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View full report <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}