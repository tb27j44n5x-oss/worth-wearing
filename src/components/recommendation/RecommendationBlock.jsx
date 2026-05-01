import { ExternalLink, HelpCircle, FileText, MessageCircle, Store } from "lucide-react";

const CONFIDENCE_STYLES = {
  high:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium:  "bg-amber-50 text-amber-700 border-amber-200",
  low:     "bg-orange-50 text-orange-700 border-orange-200",
  unknown: "bg-muted text-muted-foreground border-border",
};

const ROUTE_CONFIG = {
  buy_new:          { label: "Buy new",          className: "text-primary bg-primary/10 border-primary/20" },
  buy_secondhand:   { label: "Buy second-hand",  className: "text-amber-700 bg-amber-50 border-amber-200" },
  research_further: { label: "Research further", className: "text-muted-foreground bg-muted border-border" },
};

export default function RecommendationBlock({ block, label, highlight, icon, fullWidth }) {
  if (!block) return null;

  const confidenceStyle = CONFIDENCE_STYLES[block.evidence_confidence] || CONFIDENCE_STYLES.unknown;
  const route = ROUTE_CONFIG[block.recommended_buying_route];
  const isSecondhand = icon === "secondhand";
  const isUnknown = icon === "unknown";
  const isIndependent = icon === "independent";

  return (
    <div className={`bg-card border rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 flex flex-col
      ${highlight ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}
      ${fullWidth ? "md:col-span-2" : ""}
    `}>
      {/* Label + confidence */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-1 font-syne ${isUnknown ? "text-muted-foreground" : isSecondhand ? "text-accent" : isIndependent ? "text-amber-700" : highlight ? "text-primary" : "text-muted-foreground"}`}>
            {label}
          </p>
          <h3 className="font-syne text-lg sm:text-xl font-bold text-foreground break-words">{block.brand_name}</h3>
        </div>
        <span className={`text-[10px] sm:text-xs font-medium px-2 sm:px-2.5 py-1 rounded-full border ${confidenceStyle} flex-shrink-0 whitespace-nowrap`}>
          {block.evidence_confidence || "unknown"}
        </span>
      </div>

      {/* Verdict */}
      <p className="text-xs sm:text-sm text-foreground leading-relaxed">{block.verdict}</p>

      {/* Why chosen */}
      {block.why_chosen && !isUnknown && (
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{block.why_chosen}</p>
      )}

      {/* Second-hand specific advice */}
      {isSecondhand && (block.secondhand_why || block.secondhand_tips) && (
        <div className="bg-secondary/50 border border-border rounded-xl p-2 sm:p-3 space-y-1.5">
          {block.secondhand_why && (
            <p className="text-[10px] sm:text-xs font-medium text-foreground">{block.secondhand_why}</p>
          )}
          {block.secondhand_tips && (
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug">Tip: {block.secondhand_tips}</p>
          )}
        </div>
      )}

      {/* Known / Unknown */}
      <div className="space-y-2">
        {block.main_known_evidence && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-emerald-700 mt-0.5 flex-shrink-0">✓ Known:</span>
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

      {/* Reddit sentiment */}
      {block.reddit_sentiment && (
        <div className="flex items-start gap-2 bg-muted/60 rounded-xl px-2 sm:px-3 py-2 sm:py-2.5">
          <MessageCircle size={10} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug"><span className="font-medium text-foreground">Reddit: </span>{block.reddit_sentiment}</p>
        </div>
      )}

      {/* Independent brand note */}
      {isIndependent && block.why_chosen && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-2 sm:px-3 py-2 sm:py-2.5">
          <Store size={10} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] sm:text-xs text-amber-800 leading-snug">{block.why_chosen}</p>
        </div>
      )}

      {/* Evidence snippets */}
      {block.evidence_snippets?.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <FileText size={10} />
            Evidence
          </div>
          {block.evidence_snippets.map((snippet, i) => (
            <p key={i} className="text-[10px] sm:text-xs text-muted-foreground leading-snug pl-3 sm:pl-4 border-l-2 border-border">
              {snippet}
            </p>
          ))}
        </div>
      )}

      {/* Biggest unknown — why this brand is still interesting */}
      {isUnknown && block.why_chosen && (
        <div className="bg-muted rounded-xl p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug">{block.why_chosen}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-border flex-wrap mt-auto">
        {route && (
          <span className={`text-[10px] sm:text-xs font-medium px-2 sm:px-2.5 py-1 rounded-lg border ${route.className}`}>
            {route.label}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {block.product_url && (
            <a href={block.product_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-medium text-primary hover:underline whitespace-nowrap">
              Shop <ExternalLink size={10} />
            </a>
          )}
          {block.website && (
            <a href={block.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
              Website <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}