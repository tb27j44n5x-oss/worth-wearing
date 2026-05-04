import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Globe, RefreshCw, CheckCircle, XCircle, Star, AlertTriangle, Plus } from "lucide-react";
import ManualSignalForm from "./ManualSignalForm";

const STATUS_STYLES = {
  new:          "bg-blue-50 text-blue-700 border-blue-200",
  crawled:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  needs_review: "bg-amber-50 text-amber-700 border-amber-200",
  promoted:     "bg-purple-50 text-purple-700 border-purple-200",
  rejected:     "bg-red-50 text-red-700 border-red-200",
};

const STRENGTH_STYLES = {
  strong:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium:     "bg-amber-50 text-amber-700 border-amber-200",
  weak:       "bg-orange-50 text-orange-700 border-orange-200",
  unverified: "bg-muted text-muted-foreground border-border",
};

export default function CandidateDetailPanel({ brand, onClose, onRefresh }) {
  const [signals, setSignals] = useState([]);
  const [crawlAttempts, setCrawlAttempts] = useState([]);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [showSignalForm, setShowSignalForm] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  useEffect(() => {
    loadSignals();
  }, [brand.id]);

  const loadSignals = async () => {
    setLoadingSignals(true);
    const [sigs, attempts] = await Promise.all([
      base44.entities.BrandSignal.filter({ candidate_brand_id: brand.id }).catch(() => []),
      base44.entities.CrawlAttempt.filter({ candidate_brand_id: brand.id }, "-attempted_at", 60).catch(() => []),
    ]);
    setSignals(sigs);
    setCrawlAttempts(attempts);
    setLoadingSignals(false);
  };

  const handleCrawl = async () => {
    setCrawling(true);
    setActionMsg(null);
    try {
      const res = await base44.functions.invoke("crawlCandidateBrand", { candidate_brand_id: brand.id });
      const data = res.data;
      setActionMsg({
        type: data.success ? "success" : "warning",
        text: data.success
          ? `Crawled ${data.pages_crawled} pages, extracted ${data.signals_extracted} signals.`
          : `Crawl failed — ${data.reason}. Try adding evidence manually.`,
      });
      await loadSignals();
      onRefresh();
    } catch (err) {
      setActionMsg({ type: "error", text: `Crawl error: ${err.message}` });
    } finally {
      setCrawling(false);
    }
  };

  const handlePromote = async () => {
    setPromoting(true);
    setActionMsg(null);
    try {
      const res = await base44.functions.invoke("promoteCandidateBrand", { candidate_brand_id: brand.id });
      const data = res.data;
      setActionMsg({
        type: "success",
        text: `Promoted! Brand created with ${data.confidence} confidence, ${data.signals_used} signals.`,
      });
      onRefresh();
    } catch (err) {
      setActionMsg({ type: "error", text: `Promotion error: ${err.message}` });
    } finally {
      setPromoting(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    setActionMsg(null);
    try {
      await base44.entities.CandidateBrand.update(brand.id, { verification_status: "rejected" });
      setActionMsg({ type: "success", text: "Candidate marked as rejected." });
      onRefresh();
    } catch (err) {
      setActionMsg({ type: "error", text: `Error: ${err.message}` });
    } finally {
      setRejecting(false);
    }
  };

  const statusStyle = STATUS_STYLES[brand.verification_status] || STATUS_STYLES.new;
  const successAttempts = crawlAttempts.filter(a => a.success);
  const failedAttempts = crawlAttempts.filter(a => !a.success);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-background border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-syne text-lg font-bold text-foreground">{brand.name}</h2>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusStyle}`}>
                {brand.verification_status || "new"}
              </span>
            </div>
            {brand.website && (
              <a href={brand.website.startsWith("http") ? brand.website : `https://${brand.website}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline mt-0.5">
                <Globe size={10} /> {brand.website}
              </a>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Action message */}
          {actionMsg && (
            <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
              actionMsg.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
              actionMsg.type === "warning" ? "bg-amber-50 text-amber-800 border border-amber-200" :
              "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              {actionMsg.type === "success" ? <CheckCircle size={15} className="flex-shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />}
              {actionMsg.text}
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={handleCrawl}
              disabled={crawling || brand.verification_status === "promoted"}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={12} className={crawling ? "animate-spin" : ""} />
              {crawling ? "Crawling…" : "Crawl"}
            </button>
            <button
              onClick={() => setShowSignalForm(!showSignalForm)}
              disabled={brand.verification_status === "promoted"}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-xs font-medium hover:bg-secondary/80 disabled:opacity-40 transition-colors border border-border"
            >
              <Plus size={12} />
              Add evidence
            </button>
            <button
              onClick={handlePromote}
              disabled={promoting || brand.verification_status === "promoted" || brand.verification_status === "rejected"}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors"
            >
              <Star size={12} />
              {promoting ? "Promoting…" : "Promote"}
            </button>
            <button
              onClick={handleReject}
              disabled={rejecting || brand.verification_status === "rejected"}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-muted text-destructive rounded-xl text-xs font-medium hover:bg-destructive/10 disabled:opacity-40 transition-colors border border-destructive/20"
            >
              <XCircle size={12} />
              {rejecting ? "Rejecting…" : "Reject"}
            </button>
          </div>

          {/* Manual signal form */}
          {showSignalForm && (
            <ManualSignalForm
              brandId={brand.id}
              brandName={brand.name}
              baseUrl={brand.website}
              onSaved={() => { setShowSignalForm(false); loadSignals(); }}
              onCancel={() => setShowSignalForm(false)}
            />
          )}

          {/* Admin notes */}
          {brand.admin_notes && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin notes</p>
              <pre className="text-xs text-muted-foreground bg-muted rounded-xl p-4 whitespace-pre-wrap leading-relaxed font-mono overflow-x-auto">
                {brand.admin_notes}
              </pre>
            </div>
          )}

          {/* BrandSignals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Brand Signals ({signals.length})
              </p>
              {loadingSignals && <RefreshCw size={12} className="animate-spin text-muted-foreground" />}
            </div>
            {signals.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No signals extracted yet. Crawl the site or add evidence manually.</p>
            ) : (
              <div className="space-y-2">
                {signals.map(sig => (
                  <div key={sig.id} className="bg-card border border-border rounded-xl p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">{sig.signal_type}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${STRENGTH_STYLES[sig.evidence_strength] || STRENGTH_STYLES.unverified}`}>
                        {sig.evidence_strength}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{sig.claim_text}</p>
                    {sig.needs_manual_review && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">⚠ {sig.review_note || "Needs manual review"}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Crawl attempts summary */}
          {crawlAttempts.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Crawl Attempts ({successAttempts.length} success / {failedAttempts.length} failed)
              </p>
              <div className="bg-muted rounded-xl p-3 space-y-1.5 max-h-48 overflow-y-auto">
                {crawlAttempts.slice(0, 30).map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.success ? "bg-emerald-500" : "bg-red-400"}`} />
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                      a.method === "tavily" ? "bg-blue-100 text-blue-700" :
                      a.method === "direct_fetch" ? "bg-amber-100 text-amber-700" :
                      "bg-purple-100 text-purple-700"
                    }`}>{a.method}</span>
                    <span className="text-muted-foreground truncate flex-1">{a.url}</span>
                    {a.success && <span className="text-emerald-600 flex-shrink-0">{a.content_length}c</span>}
                    {!a.success && a.error && <span className="text-red-500 flex-shrink-0 truncate max-w-[80px]">{a.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}