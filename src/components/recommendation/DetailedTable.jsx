const SCORE_COLOR = (s) =>
  s >= 7 ? "text-emerald-600" : s >= 5 ? "text-amber-600" : s >= 3 ? "text-orange-600" : "text-destructive";

const ROUTE_LABELS = {
  buy_new:          "Buy new",
  buy_secondhand:   "2nd hand",
  research_further: "Research",
};

const CONFIDENCE_DOT = {
  high:    "bg-emerald-500",
  medium:  "bg-amber-500",
  low:     "bg-orange-500",
  unknown: "bg-muted-foreground",
};

function ScoreCell({ score }) {
  if (score === undefined || score === null) return <span className="text-muted-foreground text-xs">—</span>;
  return <span className={`font-semibold text-sm font-playfair ${SCORE_COLOR(score)}`}>{score}</span>;
}

export default function DetailedTable({ rows }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-syne text-2xl font-semibold text-foreground">Detailed comparison</h2>
        <p className="text-xs text-muted-foreground mt-1">Scores are 0–10. Lower scores do not always mean a brand is bad — they may reflect limited public evidence.</p>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Brand</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">Overall</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">Durability</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">Transparency</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">Repairability</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">2nd hand</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">Mfg clarity</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">Confidence</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground">Route</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.brand_name + i} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{row.brand_name}</span>
                    {!row.is_reviewed && (
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">unreviewed</span>
                    )}
                  </div>
                </td>
                <td className="text-center px-3 py-3"><ScoreCell score={row.overall_score} /></td>
                <td className="text-center px-3 py-3"><ScoreCell score={row.durability_score} /></td>
                <td className="text-center px-3 py-3"><ScoreCell score={row.transparency_score} /></td>
                <td className="text-center px-3 py-3"><ScoreCell score={row.repairability_score} /></td>
                <td className="text-center px-3 py-3"><ScoreCell score={row.secondhand_score} /></td>
                <td className="text-center px-3 py-3"><ScoreCell score={row.manufacturing_clarity_score} /></td>
                <td className="text-center px-3 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${CONFIDENCE_DOT[row.confidence_level] || CONFIDENCE_DOT.unknown}`} />
                    <span className="text-xs text-muted-foreground capitalize">{row.confidence_level || "?"}</span>
                  </div>
                </td>
                <td className="text-center px-3 py-3">
                  <span className="text-xs text-muted-foreground">{ROUTE_LABELS[row.recommended_buying_route] || "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}