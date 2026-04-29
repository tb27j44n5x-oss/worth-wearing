const configs = {
  high:    { label: "High confidence",    className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medium:  { label: "Medium confidence",  className: "bg-amber-50 text-amber-700 border-amber-200" },
  low:     { label: "Low confidence",     className: "bg-orange-50 text-orange-700 border-orange-200" },
  unknown: { label: "Confidence unknown", className: "bg-muted text-muted-foreground border-border" },
};

export default function ConfidenceBadge({ confidence }) {
  const cfg = configs[confidence] || configs.unknown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  );
}