import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";

export default function AdminClaimQueue() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [approving, setApproving] = useState({});

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const all = await base44.entities.BrandCategoryReport.filter(
      { status: "claims_pending_review" },
      "-created_date",
      50
    ).catch(() => []);
    setReports(all);
    setLoading(false);
  };

  const handleApproveAll = async (reportId) => {
    setApproving(prev => ({ ...prev, [reportId]: true }));
    const report = reports.find(r => r.id === reportId);
    
    await base44.functions.invoke("adminClaimReview", {
      report_id: reportId,
      action: "approve_claims",
      approved_claims: (report.claims_needing_manual_review || []).map(c => c.claim),
      publish: true
    });

    setReports(prev => prev.map(r => 
      r.id === reportId ? { ...r, status: "published" } : r
    ));
    setApproving(prev => ({ ...prev, [reportId]: false }));
  };

  const handleRejectClaim = async (reportId, claimIndex) => {
    const report = reports.find(r => r.id === reportId);
    const claimsToApprove = report.claims_needing_manual_review
      .filter((_, i) => i !== claimIndex)
      .map(c => c.claim);

    setApproving(prev => ({ ...prev, [reportId]: true }));
    await base44.functions.invoke("adminClaimReview", {
      report_id: reportId,
      action: "approve_claims",
      approved_claims: claimsToApprove
    });

    setReports(prev => prev.map(r => 
      r.id === reportId 
        ? { 
            ...r, 
            claims_needing_manual_review: r.claims_needing_manual_review.filter((_, i) => i !== claimIndex)
          } 
        : r
    ));
    setApproving(prev => ({ ...prev, [reportId]: false }));
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground py-6"><Loader2 size={14} className="animate-spin" /> Loading claims queue...</div>;
  }

  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground py-6">No pending claims to review.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">{reports.length} reports with pending claims</div>
      {reports.map(report => (
        <div key={report.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <button
            onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
            className="w-full text-left flex items-center justify-between hover:text-primary transition-colors"
          >
            <div>
              <p className="font-medium text-foreground">{report.brand_name} - {report.category}</p>
              <p className="text-xs text-muted-foreground">{report.claims_needing_manual_review?.length || 0} claims pending</p>
            </div>
            <div className="text-xs text-muted-foreground">→</div>
          </button>

          {expandedReportId === report.id && (
            <div className="space-y-3 pt-3 border-t border-border">
              {(report.claims_needing_manual_review || []).map((claim, i) => (
                <div key={i} className="flex items-start gap-3 bg-muted/40 rounded-lg p-3">
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground mb-1">{claim.claim}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${claim.reason === 'unverified_wage_claim' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        {claim.reason.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-xs font-semibold ${claim.priority === 'high' ? 'text-destructive' : 'text-amber-600'}`}>
                        {claim.priority} priority
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRejectClaim(report.id, i)}
                    disabled={approving[report.id]}
                    className="flex-shrink-0 p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                  >
                    <XCircle size={16} className="text-destructive" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => handleApproveAll(report.id)}
                disabled={approving[report.id]}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {approving[report.id] ? <><Loader2 size={13} className="animate-spin" /> Publishing...</> : <><CheckCircle size={13} /> Approve & Publish</>}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}