import { CheckCircle, Clock } from "lucide-react";

const CONFIDENCE_STYLES = {
  high:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium:  "bg-amber-50 text-amber-700 border-amber-200",
  low:     "bg-orange-50 text-orange-700 border-orange-200",
  unknown: "bg-muted text-muted-foreground border-border",
};

export default function SummaryHeader({ result }) {
  const confStyle = CONFIDENCE_STYLES[result.confidence_level] || CONFIDENCE_STYLES.unknown;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Summary</p>
          <p className="text-base text-foreground leading-relaxed">{result.summary_verdict}</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${confStyle}`}>
            {result.confidence_level || "unknown"} confidence
          </span>
          {result.is_cached && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={11} /> Cached result
            </span>
          )}
        </div>
      </div>

      {result.normalized_category && (
        <p className="text-xs text-muted-foreground">
          Category identified: <span className="text-foreground font-medium">{result.normalized_category}</span>
        </p>
      )}

      {result.last_researched_at && (
        <p className="text-xs text-muted-foreground">
          Last researched: {new Date(result.last_researched_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}
    </div>
  );
}