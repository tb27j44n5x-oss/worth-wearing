import { CheckCircle, HelpCircle, Clock, Info } from "lucide-react";

const CONFIDENCE_STYLES = {
  high:    { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "High confidence" },
  medium:  { badge: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500",   label: "Medium confidence" },
  low:     { badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500",  label: "Low confidence" },
  unknown: { badge: "bg-muted text-muted-foreground border-border",   dot: "bg-muted-foreground", label: "Confidence unknown" },
};

export default function SummaryHeader({ result }) {
  const conf = CONFIDENCE_STYLES[result.confidence_level] || CONFIDENCE_STYLES.unknown;

  return (
    <div className="space-y-4">
      {/* Main summary card */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Our take</p>
            <p className="text-base text-foreground leading-relaxed">{result.summary_verdict}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${conf.badge} flex items-center gap-1.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
              {conf.label}
            </span>
            {result.is_cached && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={11} /> Cached result
              </span>
            )}
          </div>
        </div>

        {/* Confidence explanation */}
        {result.confidence_explanation && (
          <div className="flex items-start gap-2.5 bg-muted/60 rounded-xl px-4 py-3">
            <Info size={13} className="text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{result.confidence_explanation}</p>
          </div>
        )}

        {result.normalized_category && (
          <p className="text-xs text-muted-foreground">
            Category: <span className="text-foreground font-medium">{result.normalized_category}</span>
            {result.last_researched_at && (
              <> · Researched {new Date(result.last_researched_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</>
            )}
          </p>
        )}
      </div>

      {/* What we know / don't know */}
      {(result.what_we_know?.length > 0 || result.what_we_dont_know?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.what_we_know?.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">What we found evidence for</p>
              </div>
              <ul className="space-y-2">
                {result.what_we_know.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold text-xs mt-0.5 flex-shrink-0">–</span>
                    <span className="text-xs text-emerald-900 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.what_we_dont_know?.length > 0 && (
            <div className="bg-muted border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={14} className="text-muted-foreground flex-shrink-0" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What we could not verify</p>
              </div>
              <ul className="space-y-2">
                {result.what_we_dont_know.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-muted-foreground font-bold text-xs mt-0.5 flex-shrink-0">–</span>
                    <span className="text-xs text-muted-foreground leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}