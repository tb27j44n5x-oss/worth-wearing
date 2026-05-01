import { Users, Award, AlertCircle } from "lucide-react";

export default function WorkerEthicsBlock({ block }) {
  if (!block) return null;

  const scoreColor = block.worker_score >= 7 ? "text-emerald-600" : 
                     block.worker_score >= 5 ? "text-amber-600" : "text-destructive";

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1 font-syne">Worker Ethics</p>
          <h3 className="font-syne text-xl font-bold text-foreground">{block.brand_name}</h3>
        </div>
        <span className={`text-3xl font-bold ${scoreColor}`}>{block.worker_score || "?"}/10</span>
      </div>

      <p className="text-sm text-foreground leading-relaxed">{block.verdict}</p>

      {block.wage_transparency && (
        <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
          <Award size={12} className="text-emerald-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-emerald-700">Wage Transparency</p>
            <p className="text-xs text-emerald-600 leading-snug">{block.wage_transparency}</p>
          </div>
        </div>
      )}

      {block.factory_conditions && (
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
          <Users size={12} className="text-blue-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-blue-700">Factory Conditions</p>
            <p className="text-xs text-blue-600 leading-snug">{block.factory_conditions}</p>
          </div>
        </div>
      )}

      {block.labor_certifications && (
        <div className="flex items-start gap-2.5 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2.5">
          <Award size={12} className="text-purple-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-purple-700">Labor Certifications</p>
            <p className="text-xs text-purple-600 leading-snug">{block.labor_certifications}</p>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <a href={block.website} target="_blank" rel="noopener noreferrer"
          className="text-sm text-primary hover:underline font-medium">
          Visit brand website →
        </a>
      </div>
    </div>
  );
}