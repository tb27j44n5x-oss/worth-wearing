import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Flag, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

const SEVERITY_CONFIG = {
  high: "bg-red-50 border-red-200 text-red-700",
  medium: "bg-amber-50 border-amber-200 text-amber-700",
  low: "bg-blue-50 border-blue-200 text-blue-700"
};

export default function AdminContentFlagNotifications() {
  const [resolving, setResolving] = useState(null);

  const { data: flags, isLoading, refetch } = useQuery({
    queryKey: ["pending_content_flags"],
    queryFn: async () => {
      const all = await base44.entities.ContentFlag.filter(
        { status: "pending" },
        "-created_date",
        50
      ).catch(() => []);
      return all;
    },
    refetchInterval: 15000
  });

  const handleResolve = async (flagId) => {
    setResolving(flagId);
    try {
      await base44.entities.ContentFlag.update(flagId, {
        status: "under_review",
        severity: "medium"
      });
      refetch();
    } catch (err) {
      console.error("Flag update failed:", err);
    } finally {
      setResolving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 size={14} className="animate-spin" /> Loading flags...
      </div>
    );
  }

  const pendingCount = flags?.length || 0;

  if (pendingCount === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2">
        <CheckCircle size={14} className="text-emerald-700" />
        <p className="text-sm text-emerald-800">No pending content flags.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Flag size={14} /> Content Flags ({pendingCount} pending)
          </p>
          <p className="text-xs text-muted-foreground mt-1">User-reported issues that need review.</p>
        </div>
      </div>

      <div className="space-y-2">
        {flags.map(f => (
          <div key={f.id} className={`flex items-start gap-3 rounded-lg px-4 py-3 border ${SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.medium}`}>
            <AlertCircle size={14} className="flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{f.brand_name} — {f.flag_type.replace(/_/g, " ")}</p>
              <p className="text-xs mt-1 line-clamp-2">{f.description}</p>
              {f.evidence_url && (
                <a href={f.evidence_url} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-1 inline-block">
                  View evidence
                </a>
              )}
              <p className="text-xs text-muted-foreground mt-1">By {f.flagged_by_email?.split('@')[0]}</p>
            </div>
            <button
              onClick={() => handleResolve(f.id)}
              disabled={resolving === f.id}
              className="flex-shrink-0 px-3 py-1 bg-primary/10 text-primary rounded text-xs font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors"
            >
              {resolving === f.id ? "..." : "Review"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}