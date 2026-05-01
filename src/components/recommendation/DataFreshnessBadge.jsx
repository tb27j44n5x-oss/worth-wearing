import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DataFreshnessBadge({ lastResearched, evidenceFreshness, onRefresh }) {
  if (!lastResearched) return null;

  const researchDate = new Date(lastResearched);
  const daysSince = Math.floor((Date.now() - researchDate.getTime()) / (1000 * 60 * 60 * 24));
  const isStale = daysSince > 540; // 18 months

  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
      isStale
        ? "bg-amber-50 border-amber-200 text-amber-800"
        : "bg-emerald-50 border-emerald-200 text-emerald-800"
    }`}>
      {isStale && <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">
          Data last researched {formatDate(researchDate)}
          {evidenceFreshness?.confidence_adjustment && (
            <span className="text-muted-foreground"> (confidence adjusted by {evidenceFreshness.confidence_adjustment})</span>
          )}
        </p>
        {isStale && (
          <p className="text-xs mt-1">
            Some evidence is older than 18 months. Research quality may improve with a refresh.
          </p>
        )}
      </div>
      {onRefresh && isStale && (
        <button
          onClick={onRefresh}
          className="flex-shrink-0 p-1.5 hover:bg-amber-100 rounded transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}