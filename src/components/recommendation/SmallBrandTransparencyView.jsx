import { ExternalLink, CheckCircle, Info, Globe } from "lucide-react";

export default function SmallBrandTransparencyView({ brand, crawlData }) {
  if (!crawlData) return null;

  const score = crawlData.small_brand_transparency_score || 0;
  const breakdown = crawlData.transparency_breakdown || {};
  const findings = crawlData.key_findings || {};

  const scoreColor = score >= 7 ? "text-emerald-600" : score >= 5 ? "text-amber-600" : "text-orange-600";

  return (
    <div className="space-y-6 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-2xl p-6 border border-border">
      {/* Transparency score */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Small Brand Transparency Score</p>
            <p className="text-sm text-muted-foreground">Rewards honest communication about limitations & specificity</p>
          </div>
          <div className={`text-4xl font-bold font-syne ${scoreColor}`}>{score}/10</div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {breakdown.factory_transparency !== undefined && (
            <div className="bg-card rounded-lg p-2.5 text-center">
              <p className="text-xs text-muted-foreground mb-1">Factory</p>
              <p className="font-bold text-foreground">{breakdown.factory_transparency}/10</p>
            </div>
          )}
          {breakdown.founder_honesty !== undefined && (
            <div className="bg-card rounded-lg p-2.5 text-center">
              <p className="text-xs text-muted-foreground mb-1">Founder Honesty</p>
              <p className="font-bold text-foreground">{breakdown.founder_honesty}/10</p>
            </div>
          )}
          {breakdown.supply_chain_detail !== undefined && (
            <div className="bg-card rounded-lg p-2.5 text-center">
              <p className="text-xs text-muted-foreground mb-1">Supply Chain</p>
              <p className="font-bold text-foreground">{breakdown.supply_chain_detail}/10</p>
            </div>
          )}
          {breakdown.repair_clarity !== undefined && (
            <div className="bg-card rounded-lg p-2.5 text-center">
              <p className="text-xs text-muted-foreground mb-1">Repair Info</p>
              <p className="font-bold text-foreground">{breakdown.repair_clarity}/10</p>
            </div>
          )}
          {breakdown.sustainability_specificity !== undefined && (
            <div className="bg-card rounded-lg p-2.5 text-center">
              <p className="text-xs text-muted-foreground mb-1">Specificity</p>
              <p className="font-bold text-foreground">{breakdown.sustainability_specificity}/10</p>
            </div>
          )}
        </div>
      </div>

      {/* What makes them transparent */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">What makes {brand} transparent</p>
        <div className="space-y-2">
          {findings.honest_limitations?.length > 0 && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle size={14} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-emerald-900 mb-1">Honest about limitations</p>
                <p className="text-xs text-emerald-800">{findings.honest_limitations[0]}</p>
              </div>
            </div>
          )}

          {findings.founder_notes && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Info size={14} className="text-blue-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-900 mb-1">Founder insights</p>
                <p className="text-xs text-blue-800 line-clamp-2">"{findings.founder_notes}"</p>
              </div>
            </div>
          )}

          {findings.factory_information?.named_factories?.length > 0 && (
            <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <CheckCircle size={14} className="text-purple-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-purple-900 mb-1">Named factories</p>
                <p className="text-xs text-purple-800">{findings.factory_information.named_factories.join(", ").substring(0, 60)}...</p>
              </div>
            </div>
          )}

          {findings.repair_programs?.exists && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <CheckCircle size={14} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-900 mb-1">Clear repair program</p>
                <p className="text-xs text-amber-800">{findings.repair_programs.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Website findings */}
      {crawlData.crawled_pages?.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Website pages analyzed</p>
          <div className="space-y-1.5">
            {crawlData.crawled_pages.map((page, i) => (
              <a
                key={i}
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 p-2 bg-card rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Globe size={12} className="text-primary flex-shrink-0 mt-0.5 group-hover:text-accent transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{page.title || page.url}</p>
                  <p className="text-xs text-muted-foreground">{page.page_type?.replace(/_/g, " ")}</p>
                </div>
                <ExternalLink size={11} className="text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Red flags */}
      {crawlData.red_flags?.length > 0 && (
        <div className="space-y-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs font-medium text-red-900">⚠️ Potential red flags detected</p>
          <ul className="text-xs text-red-800 space-y-1">
            {crawlData.red_flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="flex-shrink-0 mt-0.5">•</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}