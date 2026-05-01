import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle, MessageSquare, Loader2, ExternalLink } from "lucide-react";

const SEVERITY_COLOR = {
  high: "text-red-700 bg-red-50 border-red-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  low: "text-blue-700 bg-blue-50 border-blue-200"
};

export default function ContentFlagDashboard() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [resolving, setResolving] = useState({});

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    setLoading(true);
    const all = await base44.entities.ContentFlag.filter(
      { status: "pending" },
      "-created_date",
      50
    ).catch(() => []);
    setFlags(all);
    setLoading(false);
  };

  const handleResolve = async (flagId, response) => {
    setResolving(prev => ({ ...prev, [flagId]: true }));
    await base44.entities.ContentFlag.update(flagId, {
      status: "resolved",
      admin_response: response,
      reviewed_by_email: (await base44.auth.me()).email,
      reviewed_at: new Date().toISOString(),
      severity: "high"
    });
    setFlags(prev => prev.filter(f => f.id !== flagId));
    setResolving(prev => ({ ...prev, [flagId]: false }));
  };

  const handleDismiss = async (flagId) => {
    setResolving(prev => ({ ...prev, [flagId]: true }));
    await base44.entities.ContentFlag.update(flagId, {
      status: "dismissed",
      admin_response: "Dismissed after review",
      reviewed_by_email: (await base44.auth.me()).email,
      reviewed_at: new Date().toISOString()
    });
    setFlags(prev => prev.filter(f => f.id !== flagId));
    setResolving(prev => ({ ...prev, [flagId]: false }));
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground py-6"><Loader2 size={14} className="animate-spin" /> Loading flags...</div>;
  }

  if (flags.length === 0) {
    return <p className="text-sm text-muted-foreground py-6">No pending content flags.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">{flags.length} pending content flags</div>
      {flags.map(flag => (
        <div
          key={flag.id}
          className={`border rounded-xl p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors ${SEVERITY_COLOR[flag.severity] || SEVERITY_COLOR.medium}`}
        >
          <button
            onClick={() => setExpandedId(expandedId === flag.id ? null : flag.id)}
            className="w-full text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} />
                  <p className="font-medium text-sm capitalize">{flag.flag_type.replace(/_/g, " ")}</p>
                </div>
                <p className="text-sm text-foreground">{flag.brand_name}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{flag.description}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${SEVERITY_COLOR[flag.severity]}`}>
                {flag.severity}
              </span>
            </div>
          </button>

          {expandedId === flag.id && (
            <div className="space-y-3 pt-3 border-t border-current border-opacity-20">
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Full Description</p>
                <p className="text-sm text-foreground leading-relaxed">{flag.description}</p>
              </div>

              {flag.evidence_url && (
                <a
                  href={flag.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium hover:underline mt-2"
                >
                  <ExternalLink size={12} /> View evidence
                </a>
              )}

              <div>
                <p className="text-xs font-medium text-foreground mb-2">Submitted by</p>
                <p className="text-sm text-foreground">{flag.flagged_by_email}</p>
              </div>

              <div className="flex gap-2 flex-wrap pt-2">
                <button
                  onClick={() => handleResolve(flag.id, "Report reviewed and corrections made")}
                  disabled={resolving[flag.id]}
                  className="flex-1 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {resolving[flag.id] ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Resolve
                </button>
                <button
                  onClick={() => handleDismiss(flag.id)}
                  disabled={resolving[flag.id]}
                  className="flex-1 py-2 bg-muted text-muted-foreground hover:text-foreground rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}