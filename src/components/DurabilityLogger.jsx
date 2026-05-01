import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle } from "lucide-react";

const EVENT_TYPES = [
  { value: "repair", label: "Report a repair" },
  { value: "failure", label: "Product failed" },
  { value: "still_wearing", label: "Still wearing (milestone)" },
  { value: "longevity_milestone", label: "Longevity milestone" },
];

const REPAIR_TYPES = [
  "zipper",
  "seam",
  "fabric tear",
  "waterproofing failed",
  "elastic worn",
  "button/snap failure",
  "other"
];

export default function DurabilityLogger({ brandName, brandId, categoryKey }) {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    event_type: "repair",
    months_owned: "",
    repair_type: "",
    repair_success: true,
    repair_cost: "",
    used_brand_repair_service: false,
    failure_type: "",
    notes: ""
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

      await base44.entities.DurabilityLog.create({
        brand_id: brandId,
        brand_name: brandName,
        category_key: categoryKey,
        user_email: user.email,
        ...form,
        months_owned: parseInt(form.months_owned) || 0,
        repair_cost: form.repair_cost ? parseFloat(form.repair_cost) : null
      });

      setSubmitted(true);
      setTimeout(() => {
        setShowForm(false);
        setSubmitted(false);
        setForm({
          event_type: "repair",
          months_owned: "",
          repair_type: "",
          repair_success: true,
          repair_cost: "",
          used_brand_repair_service: false,
          failure_type: "",
          notes: ""
        });
      }, 2000);
    } catch (err) {
      console.error("Error submitting durability log:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="font-syne text-lg font-semibold text-foreground">Share durability data</h3>
        <p className="text-sm text-muted-foreground mt-1">Help us verify real-world longevity — report repairs, failures, or milestone achievements.</p>
      </div>

      {submitted && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
          <CheckCircle size={16} /> Thank you! Your data helps improve recommendations.
        </div>
      )}

      {!showForm && !submitted && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Log durability data
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">What are you reporting?</label>
            <div className="space-y-2">
              {EVENT_TYPES.map(t => (
                <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="event_type"
                    value={t.value}
                    checked={form.event_type === t.value}
                    onChange={e => setForm({ ...form, event_type: e.target.value })}
                    className="accent-primary"
                  />
                  <span className="text-sm text-foreground">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">How many months have you owned this?</label>
            <input
              type="number"
              min="0"
              value={form.months_owned}
              onChange={e => setForm({ ...form, months_owned: e.target.value })}
              placeholder="e.g. 12"
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {form.event_type === "repair" && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What broke?</label>
                <select
                  value={form.repair_type}
                  onChange={e => setForm({ ...form, repair_type: e.target.value })}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select...</option>
                  {REPAIR_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.repair_success}
                  onChange={e => setForm({ ...form, repair_success: e.target.checked })}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">Repair was successful (still usable)</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Repair cost (EUR, optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.repair_cost}
                  onChange={e => setForm({ ...form, repair_cost: e.target.value })}
                  placeholder="e.g. 45.50"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.used_brand_repair_service}
                  onChange={e => setForm({ ...form, used_brand_repair_service: e.target.checked })}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">Used the brand's repair service</span>
              </label>
            </>
          )}

          {form.event_type === "failure" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">How did it fail?</label>
              <textarea
                value={form.failure_type}
                onChange={e => setForm({ ...form, failure_type: e.target.value })}
                placeholder="e.g. zipper broke permanently, fabric deteriorated, waterproofing failed"
                rows={2}
                className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Additional notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="How did you use it? Weather conditions? Washing frequency? Any other observations?"
              rows={2}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl font-medium hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.months_owned}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Submitting</> : "Submit"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}