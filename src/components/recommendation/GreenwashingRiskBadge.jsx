import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

const RISK_CONFIG = {
  low: {
    icon: CheckCircle2,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Low greenwashing risk",
    description: "High confidence with weighted evidence from independent sources."
  },
  medium: {
    icon: AlertCircle,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Medium greenwashing risk",
    description: "Some conflicting info or mixed evidence credibility. Limited transparency."
  },
  high: {
    icon: AlertTriangle,
    color: "bg-red-50 text-red-700 border-red-200",
    label: "High greenwashing risk",
    description: "Low confidence, only brand-owned sources, or vague claims without independent verification."
  }
};

export default function GreenwashingRiskBadge({ riskLevel, explanation }) {
  const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.medium;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 border rounded-2xl px-5 py-4 ${config.color}`}>
      <Icon size={16} className="flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold">{config.label}</p>
        <p className="text-xs leading-relaxed mt-1 opacity-90">{config.description}</p>
        {explanation && (
          <p className="text-xs mt-2 italic opacity-80">{explanation}</p>
        )}
      </div>
    </div>
  );
}