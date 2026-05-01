import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Save, Send, Archive, RefreshCw, Loader2, AlertTriangle } from "lucide-react";

export default function ReportPublishWorkflow({ report, onPublished }) {
  const [showOverrides, setShowOverrides] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [notes, setNotes] = useState(report.admin_notes || "");
  const [publishing, setPublishing] = useState(false);

  const handleAddOverride = (scoreField) => {
    setOverrides(prev => ({
      ...prev,
      [scoreField]: { new_score: report[scoreField], reason: "" }
    }));
  };

  const handleUpdateOverride = (scoreField, newScore, reason) => {
    setOverrides(prev => ({
      ...prev,
      [scoreField]: { new_score: newScore, reason }
    }));
  };

  const handlePublish = async () => {
    setPublishing(true);
    await base44.functions.invoke("adminClaimReview", {
      report_id: report.id,
      action: "override_scores",
      score_overrides: overrides,
      publish: true
    });
    await base44.entities.BrandCategoryReport.update(report.id, {
      admin_notes: notes,
      published_at: new Date().toISOString()
    });
    setPublishing(false);
    onPublished?.();
  };

  const handleArchive = async () => {
    setPublishing(true);
    await base44.functions.invoke("adminClaimReview", {
      report_id: report.id,
      action: "archive"
    });
    setPublishing(false);
    onPublished?.();
  };

  const handleRefresh = async () => {
    setPublishing(true);
    await base44.functions.invoke("adminClaimReview", {
      report_id: report.id,
      action: "request_refresh"
    });
    setPublishing(false);
    onPublished?.();
  };

  const scoreFields = [
    { key: "overall_grade", label: "Overall Grade", type: "select", options: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"] },
    { key: "material_score", label: "Material Score", type: "number", min: 0, max: 10 },
    { key: "manufacturing_score", label: "Manufacturing Score", type: "number", min: 0, max: 10 },
    { key: "worker_score", label: "Worker Score", type: "number", min: 0, max: 10 },
    { key: "durability_score", label: "Durability Score", type: "number", min: 0, max: 10 },
    { key: "transparency_score", label: "Transparency Score", type: "number", min: 0, max: 10 },
    { key: "circularity_score", label: "Circularity Score", type: "number", min: 0, max: 10 }
  ];

  return (
    <div className="space-y-5">
      {/* Scores overview */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium text-foreground">Core Scores</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {scoreFields.slice(1).map(field => (
            <div key={field.key} className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-lg text-foreground">{report[field.key] || "—"}</span>
                {overrides[field.key] && (
                  <span className="text-xs text-amber-600 font-medium">→ {overrides[field.key].new_score}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Override controls */}
      <div className="space-y-3">
        <button
          onClick={() => setShowOverrides(!showOverrides)}
          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
        >
          {showOverrides ? "Hide" : "Show"} score overrides
        </button>

        {showOverrides && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
            <p className="text-xs text-amber-800">Override individual scores with admin rationale</p>
            {scoreFields.slice(1).map(field => (
              <div key={field.key} className="space-y-2">
                <label className="block text-xs font-medium text-foreground">{field.label}</label>
                {!overrides[field.key] ? (
                  <button
                    onClick={() => handleAddOverride(field.key)}
                    className="text-xs text-amber-700 hover:text-amber-900 underline underline-offset-2"
                  >
                    + Override
                  </button>
                ) : (
                  <div className="flex gap-2 items-end">
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={overrides[field.key].new_score}
                      onChange={(e) => handleUpdateOverride(field.key, field.type === "number" ? parseFloat(e.target.value) : e.target.value, overrides[field.key].reason)}
                      min={field.min}
                      max={field.max}
                      className="flex-1 bg-white border border-amber-300 rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      onClick={() => setOverrides(prev => { const next = { ...prev }; delete next[field.key]; return next; })}
                      className="text-xs text-amber-600 hover:text-amber-800 underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {overrides[field.key] && (
                  <input
                    type="text"
                    placeholder="Reason for override..."
                    value={overrides[field.key].reason}
                    onChange={(e) => handleUpdateOverride(field.key, overrides[field.key].new_score, e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-amber-400"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin notes */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium text-foreground">Admin Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add review notes, decision rationale, or follow-up items..."
          rows={3}
          className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {/* Greenwashing alerts */}
      {report.greenwashing_risk === "high" && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">High greenwashing risk</p>
            <p className="text-xs text-red-800 mt-1">{report.greenwashing_flags?.join(", ") || "Flags detected"}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-4 border-t border-border flex-wrap">
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {publishing ? <><Loader2 size={14} className="animate-spin" /> Publishing...</> : <><Send size={14} /> Publish Report</>}
        </button>
        <button
          onClick={handleRefresh}
          disabled={publishing}
          className="py-3 px-4 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:text-foreground transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
        <button
          onClick={handleArchive}
          disabled={publishing}
          className="py-3 px-4 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:text-destructive transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Archive size={14} /> Archive
        </button>
      </div>
    </div>
  );
}