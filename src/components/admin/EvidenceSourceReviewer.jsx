import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ExternalLink, Flag, CheckCircle, Loader2, AlertCircle } from "lucide-react";

const CREDIBILITY_COLOR = (score) => {
  if (score >= 8) return "text-emerald-600 bg-emerald-50";
  if (score >= 6) return "text-amber-600 bg-amber-50";
  if (score >= 4) return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
};

export default function EvidenceSourceReviewer({ brandId, categoryKey }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flagging, setFlagging] = useState({});

  useEffect(() => {
    loadSources();
  }, [brandId, categoryKey]);

  const loadSources = async () => {
    setLoading(true);
    const all = await base44.entities.EvidenceSource.filter({
      brand_id: brandId,
      category_key: categoryKey
    }, "-credibility_score", 50).catch(() => []);
    setSources(all);
    setLoading(false);
  };

  const handleFlagSource = async (sourceId) => {
    setFlagging(prev => ({ ...prev, [sourceId]: true }));
    await base44.entities.EvidenceSource.update(sourceId, {
      manual_review_flag: true,
      manual_review_note: "Admin flagged for verification"
    });
    setSources(prev => prev.map(s => 
      s.id === sourceId ? { ...s, manual_review_flag: true } : s
    ));
    setFlagging(prev => ({ ...prev, [sourceId]: false }));
  };

  const handleVerifySource = async (sourceId) => {
    await base44.entities.EvidenceSource.update(sourceId, {
      is_verified: true,
      manual_review_flag: false
    });
    setSources(prev => prev.map(s => 
      s.id === sourceId ? { ...s, is_verified: true, manual_review_flag: false } : s
    ));
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Loading evidence sources...</div>;
  }

  if (sources.length === 0) {
    return <p className="text-sm text-muted-foreground">No evidence sources found.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">{sources.length} evidence sources</div>
      {sources.map(source => (
        <div key={source.id} className={`border rounded-lg p-4 space-y-2 ${source.is_verified ? 'border-emerald-200 bg-emerald-50/30' : source.manual_review_flag ? 'border-red-200 bg-red-50/30' : 'border-border'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{source.source_title}</p>
              <p className="text-xs text-muted-foreground mt-1">{source.summary?.substring(0, 150)}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className={`text-xs font-bold px-2 py-1 rounded ${CREDIBILITY_COLOR(source.credibility_score)}`}>
                {source.credibility_score}/10
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-muted-foreground bg-muted px-2 py-1 rounded">
              {source.source_type.replace(/_/g, ' ')}
            </span>
            {source.is_brand_owned && (
              <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded">Brand-owned</span>
            )}
            {source.claim_direction && (
              <span className={`px-2 py-1 rounded text-xs ${source.claim_direction === 'supports' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {source.claim_direction}
              </span>
            )}
            {source.date_accessed && (
              <span className="text-muted-foreground text-xs">
                {new Date(source.date_accessed).toLocaleDateString()}
              </span>
            )}
          </div>

          {source.url && (
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary text-xs hover:underline">
              View source <ExternalLink size={11} />
            </a>
          )}

          <div className="flex gap-2 pt-2 border-t border-border/50">
            {!source.is_verified ? (
              <>
                <button
                  onClick={() => handleVerifySource(source.id)}
                  className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                >
                  <CheckCircle size={12} /> Verify
                </button>
                <button
                  onClick={() => handleFlagSource(source.id)}
                  disabled={flagging[source.id]}
                  className="flex-1 py-1.5 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Flag size={12} /> Flag
                </button>
              </>
            ) : (
              <div className="text-xs text-emerald-700 flex items-center gap-1 py-1.5 px-3 bg-emerald-50 rounded w-full">
                <CheckCircle size={12} /> Verified
              </div>
            )}
          </div>

          {source.manual_review_flag && source.manual_review_note && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-2">
              {source.manual_review_note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}