import { CheckCircle, AlertTriangle, HelpCircle, Wrench, Star } from "lucide-react";

export default function ReportSections({ report }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Standout practices */}
      {report.standout_practices?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-foreground">What this brand does well</h3>
          </div>
          <ul className="space-y-2">
            {report.standout_practices.map((p, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-snug flex items-start gap-2">
                <span className="text-emerald-500 mt-1 flex-shrink-0">✓</span>{p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Concerns */}
      {report.concerns?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="font-semibold text-foreground">Main concerns</h3>
          </div>
          <ul className="space-y-2">
            {report.concerns.map((c, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-snug flex items-start gap-2">
                <span className="text-amber-500 mt-1 flex-shrink-0">△</span>{c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unknowns */}
      {report.unknowns?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={18} className="text-muted-foreground" />
            <h3 className="font-semibold text-foreground">What is still unknown</h3>
          </div>
          <ul className="space-y-2">
            {report.unknowns.map((u, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-snug flex items-start gap-2">
                <span className="text-muted-foreground mt-1 flex-shrink-0">?</span>{u}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Repair & Warranty */}
      {report.repair_warranty_review && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">Repair & warranty</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{report.repair_warranty_review}</p>
        </div>
      )}

      {/* Quality & Durability */}
      {report.quality_durability_review && (
        <div className="bg-card border border-border rounded-2xl p-6 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Star size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">Quality & durability</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{report.quality_durability_review}</p>
        </div>
      )}

      {/* Recommendation */}
      {report.recommendation && (
        <div className="bg-primary text-primary-foreground rounded-2xl p-6 md:col-span-2">
          <h3 className="font-playfair text-xl font-semibold mb-3">Our assessment</h3>
          <p className="text-primary-foreground/85 leading-relaxed text-sm">{report.recommendation}</p>
        </div>
      )}
    </div>
  );
}