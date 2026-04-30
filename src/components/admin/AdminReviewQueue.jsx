import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Eye, Archive, CheckCircle, RefreshCw, AlertTriangle } from "lucide-react";
import AdminReviewEditor from "./AdminReviewEditor";

const STATUS_STYLE = {
  published: "bg-emerald-100 text-emerald-700",
  pending:   "bg-amber-100 text-amber-700",
  archived:  "bg-muted text-muted-foreground",
};

export default function AdminReviewQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("unreviewed");
  const [editing, setEditing] = useState(null); // RecommendationSet record

  const load = async () => {
    setLoading(true);
    let results;
    if (filter === "unreviewed") {
      results = await base44.entities.RecommendationSet.filter({ is_ai_unreviewed: true }, "-created_date", 50);
    } else {
      results = await base44.entities.RecommendationSet.list("-created_date", 50);
    }
    setItems(results);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const archive = async (item) => {
    await base44.entities.RecommendationSet.update(item.id, { is_ai_unreviewed: false, confidence_level: "low" });
    load();
  };

  const markReviewed = async (item) => {
    await base44.entities.RecommendationSet.update(item.id, { is_ai_unreviewed: false });
    load();
  };

  if (editing) {
    return (
      <AdminReviewEditor
        item={editing}
        onBack={() => { setEditing(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {["unreviewed", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {f === "unreviewed" ? "Pending review" : "All"}
            </button>
          ))}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Warning banner */}
      {filter === "unreviewed" && items.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>These results are AI-generated and have not been reviewed. They are served to users with an "unreviewed" warning. Review, edit, and mark as reviewed to improve trust.</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
          <Loader2 size={16} className="animate-spin" /> Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle size={32} className="mx-auto mb-3 text-emerald-500" />
          <p className="font-medium text-foreground mb-1">All caught up</p>
          <p className="text-sm">No items pending review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const parsed = (() => { try { return JSON.parse(item.result_json || "{}"); } catch { return {}; } })();
            return (
              <div key={item.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-playfair text-lg font-semibold text-foreground">"{item.query}"</h3>
                      {item.is_ai_unreviewed && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">unreviewed</span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[item.confidence_level] || STATUS_STYLE.pending}`}>
                        {item.confidence_level || "unknown"} confidence
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Category: <span className="text-foreground">{item.category_key || "—"}</span>
                      {" · "}Researched: <span className="text-foreground">{new Date(item.created_date).toLocaleDateString("en-GB")}</span>
                      {item.last_used_at && <span> · Last used: {new Date(item.last_used_at).toLocaleDateString("en-GB")}</span>}
                    </p>
                    {item.summary_verdict && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{item.summary_verdict}</p>
                    )}
                    {/* Best overall brand quick preview */}
                    {parsed.best_overall?.brand_name && (
                      <p className="text-xs text-primary mt-1.5">Best overall: <span className="font-medium">{parsed.best_overall.brand_name}</span></p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <button onClick={() => setEditing(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                      <Eye size={12} /> Review & Edit
                    </button>
                    {item.is_ai_unreviewed && (
                      <button onClick={() => markReviewed(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                        <CheckCircle size={12} /> Mark reviewed
                      </button>
                    )}
                    <button onClick={() => archive(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:text-foreground transition-colors">
                      <Archive size={12} /> Archive
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}