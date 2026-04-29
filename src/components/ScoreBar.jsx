export default function ScoreBar({ label, score, argument }) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100));
  const color = score >= 7 ? "bg-primary" : score >= 5 ? "bg-accent" : score >= 3 ? "bg-amber-400" : "bg-destructive";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{score !== undefined && score !== null ? `${score}/10` : "—"}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      {argument && <p className="text-xs text-muted-foreground leading-relaxed">{argument}</p>}
    </div>
  );
}