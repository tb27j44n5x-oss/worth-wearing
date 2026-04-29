import { Sparkles } from "lucide-react";

export default function SmallBrandSpotlight({ reason }) {
  return (
    <div className="flex items-start gap-2 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3">
      <Sparkles size={15} className="text-accent mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Small brand spotlight</span>
        <p className="text-sm text-foreground mt-0.5 leading-snug">This brand stands out for: {reason}</p>
      </div>
    </div>
  );
}