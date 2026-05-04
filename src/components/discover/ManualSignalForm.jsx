import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Loader2 } from "lucide-react";

const SIGNAL_TYPES = [
  "material", "production_location", "factory", "repair", "warranty",
  "durability", "circularity", "worker_ethics", "sustainability_claim",
  "greenwashing_risk", "stockist", "founder_note", "other",
];

const EVIDENCE_STRENGTHS = ["strong", "medium", "weak", "unverified"];

export default function ManualSignalForm({ brandId, brandName, baseUrl, onSaved, onCancel }) {
  const [form, setForm] = useState({
    signal_type: "sustainability_claim",
    claim_text: "",
    source_url: baseUrl || "",
    evidence_strength: "medium",
    needs_manual_review: false,
    review_note: "",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.functions.invoke("createManualBrandSignal", {
      candidate_brand_id: brandId,
      signal_type: form.signal_type,
      claim_text: form.claim_text,
      source_url: form.source_url || baseUrl || "",
      evidence_strength: form.evidence_strength,
      needs_manual_review: form.needs_manual_review,
      review_note: form.review_note,
    });
    setSaved(true);
    setLoading(false);
    setTimeout(() => onSaved(), 800);
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
        <CheckCircle size={14} /> Signal saved successfully.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-secondary/30 border border-border rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Add manual evidence signal</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Signal type *</label>
          <select
            required
            value={form.signal_type}
            onChange={e => setForm({ ...form, signal_type: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
          >
            {SIGNAL_TYPES.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Evidence strength *</label>
          <select
            required
            value={form.evidence_strength}
            onChange={e => setForm({ ...form, evidence_strength: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
          >
            {EVIDENCE_STRENGTHS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground block mb-1">Claim text *</label>
        <textarea
          required
          value={form.claim_text}
          onChange={e => setForm({ ...form, claim_text: e.target.value })}
          placeholder="e.g. 'Made in Portugal using merino wool from certified farms'"
          rows={3}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-foreground block mb-1">Source URL</label>
        <input
          type="url"
          value={form.source_url}
          onChange={e => setForm({ ...form, source_url: e.target.value })}
          placeholder="https://..."
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="needs_review"
          checked={form.needs_manual_review}
          onChange={e => setForm({ ...form, needs_manual_review: e.target.checked })}
          className="accent-primary"
        />
        <label htmlFor="needs_review" className="text-xs text-foreground">Flag for manual review</label>
      </div>

      {form.needs_manual_review && (
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Review note</label>
          <input
            value={form.review_note}
            onChange={e => setForm({ ...form, review_note: e.target.value })}
            placeholder="Why does this need review?"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !form.claim_text.trim()}
          className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
        >
          {loading ? <><Loader2 size={11} className="animate-spin" /> Saving…</> : "Save signal"}
        </button>
      </div>
    </form>
  );
}