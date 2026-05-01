import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Flag, X, Loader2, CheckCircle } from "lucide-react";

const FLAG_TYPES = [
  { value: "greenwashing", label: "Possible greenwashing" },
  { value: "outdated_info", label: "Information seems outdated" },
  { value: "missing_context", label: "Missing important context" },
  { value: "contradicts_evidence", label: "Contradicts other evidence" },
  { value: "factually_wrong", label: "Factually incorrect" },
  { value: "biased_assessment", label: "Biased or unfair assessment" },
  { value: "other", label: "Other issue" }
];

export default function ContentFlagForm({ brandName, reportId }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    flag_type: "greenwashing",
    description: "",
    evidence_url: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await base44.auth.me();
      if (!user) {
        base44.auth.redirectToLogin();
        return;
      }

      // Hash email for GDPR compliance
      const hashedEmail = await base44.functions.invoke("hashEmail", {
        emails: [user.email]
      }).then(res => res.data.hashes[0]);

      await base44.entities.ContentFlag.create({
        brand_id: brandName.toLowerCase().replace(/\s+/g, "_"),
        brand_name: brandName,
        report_id: reportId,
        flagged_by_email: hashedEmail,
        flag_type: form.flag_type,
        description: form.description,
        evidence_url: form.evidence_url || null,
        status: "pending",
        severity: form.description.length > 200 ? "high" : "medium"
      });

      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setForm({ flag_type: "greenwashing", description: "", evidence_url: "" });
      }, 2500);
    } catch (err) {
      console.error("Error submitting flag:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => !submitted && setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-muted text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border"
      >
        <Flag size={14} /> Report issue
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl max-w-sm w-full shadow-lg space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-syne text-lg font-semibold text-foreground">Report an issue</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle size={32} className="text-emerald-600 mx-auto" />
                <p className="text-sm text-foreground font-medium">Thank you for the report</p>
                <p className="text-xs text-muted-foreground">Our team will review this shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">Issue type *</label>
                  <select
                    required
                    value={form.flag_type}
                    onChange={(e) => setForm({ ...form, flag_type: e.target.value })}
                    className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {FLAG_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">Description *</label>
                  <textarea
                    required
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Explain the issue in detail..."
                    rows={3}
                    className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">Link to evidence (optional)</label>
                  <input
                    type="url"
                    value={form.evidence_url}
                    onChange={(e) => setForm({ ...form, evidence_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg font-medium hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !form.description.trim()}
                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? <><Loader2 size={13} className="animate-spin" /> Submitting</> : "Submit report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}