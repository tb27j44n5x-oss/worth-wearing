import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, X, ExternalLink } from "lucide-react";

export default function AdminSuggestions() {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const all = await base44.entities.UserCorrection.filter({ status: "pending" }, "-created_date", 50);
    setCorrections(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id, status) => {
    await base44.entities.UserCorrection.update(id, { status });
    load();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Pending submissions from users. Review and approve or reject each one.</p>
      {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
        <>
          {corrections.length === 0 && <p className="text-muted-foreground text-sm">No pending suggestions.</p>}
          {corrections.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{c.correction_type?.replace(/_/g, " ")}</span>
                    {c.brand_name && <span className="text-xs text-muted-foreground">Brand: {c.brand_name}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">{c.created_date ? new Date(c.created_date).toLocaleDateString() : ""}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{c.note}</p>
                  {c.submitted_source_url && (
                    <a href={c.submitted_source_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                      View source <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => update(c.id, "approved")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition-colors">
                    <CheckCircle size={12} /> Approve
                  </button>
                  <button onClick={() => update(c.id, "rejected")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors">
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}