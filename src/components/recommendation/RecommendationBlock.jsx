import { ExternalLink, ShoppingBag, HelpCircle, ArrowRight } from "lucide-react";

const CONFIDENCE_STYLES = {
  high:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium:  "bg-amber-50 text-amber-700 border-amber-200",
  low:     "bg-orange-50 text-orange-700 border-orange-200",
  unknown: "bg-muted text-muted-foreground border-border",
};

const ROUTE_LABELS = {
  buy_new:          { label: "Buy new", className: "text-primary bg-primary/10" },
  buy_secondhand:   { label: "Buy second-hand", className: "text-amber-700 bg-amber-50" },
  research_further: { label: "Research further", className: "text-muted-foreground bg-muted" },
};

export default function RecommendationBlock({ block, label, highlight, icon, fullWidth }) {
  if (!block) return null;

  const confidenceStyle = CONFIDENCE_STYLES[block.evidence_confidence] || CONFIDENCE_STYLES.unknown;
  const route = ROUTE_LABELS[block.recommended_buying_route];

  return (
    <div className={`bg-card border rounded-2xl p-6 space-y-4 ${highlight ? "border-primary/40 ring-1 ring-primary/20" : "border-border"} ${fullWidth ? "md:col-span-2" : ""}`}>
      {/* Label + confidence */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
          <h3 className="font-playfair text-xl font-bold text-foreground">{block.brand_name}</h3>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${confidenceStyle} flex-shrink-0`}>
          {block.evidence_confidence || "unknown"} confidence
        </span>
      </div>

      {/* Verdict */}
      <p className="text-sm text-foreground leading-relaxed font-medium">{block.verdict}</p>

      {/* Why chosen */}
      {block.why_chosen && (
        <p className="text-sm text-muted-foreground leading-relaxed">{block.why_chosen}</p>
      )}

      {/* Known / Unknown */}
      <div className="space-y-2">
        {block.main_known_evidence && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-emerald-700 mt-0.5 flex-shrink-0">✓ Known:</span>
            <span className="text-xs text-foreground leading-snug">{block.main_known_evidence}</span>
          </div>
        )}
        {block.main_unknown && (
          <div className="flex items-start gap-2">
            <HelpCircle size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-xs text-muted-foreground leading-snug">{block.main_unknown}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
        {route && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${route.className}`}>
            {route.label}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {block.product_url && (
            <a href={block.product_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Shop <ExternalLink size={11} />
            </a>
          )}
          {block.website && (
            <a href={block.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Website <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}