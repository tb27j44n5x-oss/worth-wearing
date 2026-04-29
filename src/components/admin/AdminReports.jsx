import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import GradeBadge from "@/components/GradeBadge";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import { CheckCircle, Archive } from "lucide-react";

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending_review");

  const load = async () => {
    setLoading(true);
    const all = filter === "all"
      ? await base44.entities.BrandCategoryReport.list("-created_date", 50)
      : await base44.entities.BrandCategoryReport.filter({ status: filter }, "-created_date", 50);
    setReports(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const publish = async (r) => {
    await base44.entities.BrandCategoryReport.update(r.id, { status: "published", published_at: new Date().toISOString() });
    load();
  };

  const archive = async (r) => {
    await base44.entities.BrandCategoryReport.update(r.id, { status: "archived" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {["pending_review", "published", "draft", "all"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
        <div className="space-y-3">
          {reports.length === 0 && <p className="text-muted-foreground text-sm">No reports with status: {filter}</p>}
          {reports.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="font-playfair text-lg font-semibold text-foreground">{r.brand_name}</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{r.category}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "published" ? "bg-emerald-100 text-emerald-700" : r.status === "pending_review" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{r.short_summary}</p>
                <div className="flex items-center gap-3 mt-2">
                  <ConfidenceBadge confidence={r.evidence_confidence} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <GradeBadge grade={r.overall_grade} size="sm" />
                {r.status !== "published" && (
                  <button onClick={() => publish(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                    <CheckCircle size={12} /> Publish
                  </button>
                )}
                <button onClick={() => archive(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:text-foreground transition-colors">
                  <Archive size={12} /> Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}