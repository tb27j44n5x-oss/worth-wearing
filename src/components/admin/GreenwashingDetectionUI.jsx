import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, AlertCircle, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";

const RISK_CONFIG = {
  high: {
    icon: AlertTriangle,
    label: "High Risk",
    color: "bg-red-50 border-red-200 text-red-700"
  },
  medium: {
    icon: AlertCircle,
    label: "Medium Risk",
    color: "bg-amber-50 border-amber-200 text-amber-700"
  },
  low: {
    icon: CheckCircle2,
    label: "Low Risk",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700"
  }
};

const FLAG_DESCRIPTIONS = {
  low_confidence_evidence: "AI confidence is low or unknown — evidence is insufficient",
  only_brand_sources: "Evidence relies mostly on brand-owned sources without independent verification",
  contradiction_detected: "Sources contradict each other — claims are conflicting",
  factory_names_withheld: "Factory locations not disclosed despite worker practice claims",
  vague_language: "Claims use vague terms ('sustainable', 'eco-friendly') without specifics",
  outdated_evidence: "Oldest evidence is older than 18 months — may need refresh",
  staged_imagery: "Evidence appears to be staged or marketing-focused rather than substantive"
};

export default function GreenwashingDetectionUI({ brandId, categoryKey }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissedFlags, setDismissedFlags] = useState({});

  useEffect(() => {
    loadReport();
  }, [brandId, categoryKey]);

  const loadReport = async () => {
    setLoading(true);
    const reports = await base44.entities.BrandCategoryReport.filter({
      brand_id: brandId,
      category_key: categoryKey
    }).catch(() => []);
    setReport(reports[0] || null);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Loading detection data...</div>;
  }

  if (!report) {
    return <p className="text-sm text-muted-foreground">No report found for greenwashing analysis.</p>;
  }

  const config = RISK_CONFIG[report.greenwashing_risk] || RISK_CONFIG.medium;
  const Icon = config.icon;
  const flags = report.greenwashing_flags || [];
  const claims = report.claims_needing_manual_review || [];

  return (
    <div className="space-y-5">
      {/* Risk summary */}
      <div className={`border rounded-xl p-5 space-y-3 ${config.color}`}>
        <div className="flex items-start gap-3">
          <Icon size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{config.label} — Greenwashing</p>
            <p className="text-xs leading-relaxed mt-1 opacity-90">
              {report.greenwashing_risk === "high"
                ? "Multiple red flags detected. Recommend detailed admin review and evidence gathering before publication."
                : report.greenwashing_risk === "medium"
                ? "Some concerning indicators present. Additional verification recommended for critical claims."
                : "Evidence is credible and from multiple sources. Low risk of greenwashing."}
            </p>
          </div>
        </div>
      </div>

      {/* Detected flags */}
      {flags.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Detected Flags ({flags.length})</p>
          <div className="space-y-2">
            {flags.map(flag => (
              <button
                key={flag}
                onClick={() => setDismissedFlags(prev => ({ ...prev, [flag]: !prev[flag] }))}
                className={`w-full text-left p-3 rounded-lg border transition-all ${dismissedFlags[flag] ? 'opacity-50 line-through' : ''} ${
                  report.greenwashing_risk === 'high'
                    ? 'bg-red-50 border-red-200 hover:bg-red-100'
                    : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${report.greenwashing_risk === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm capitalize">{flag.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{FLAG_DESCRIPTIONS[flag] || "Flag detected"}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Claims needing review */}
      {claims.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Claims Needing Manual Review ({claims.length})</p>
          <div className="space-y-2">
            {claims.map((claim, i) => (
              <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <HelpCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground mb-1">{claim.claim}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      {claim.reason?.replace(/_/g, " ") || "unverified"}
                    </span>
                    <span className={`text-xs font-semibold ${claim.priority === 'high' ? 'text-destructive' : 'text-amber-700'}`}>
                      {claim.priority} priority
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No issues */}
      {flags.length === 0 && claims.length === 0 && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800">No greenwashing flags or claims detected. Report appears clear.</p>
        </div>
      )}

      {/* Confidence breakdown */}
      {report.evidence_confidence && (
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Evidence Confidence</p>
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground font-medium capitalize">{report.evidence_confidence}</p>
            <div className={`text-xs px-2.5 py-1 rounded font-medium ${
              report.evidence_confidence === 'high' ? 'bg-emerald-50 text-emerald-700' :
              report.evidence_confidence === 'medium' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'
            }`}>
              {report.evidence_confidence}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}