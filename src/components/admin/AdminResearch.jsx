import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle } from "lucide-react";
import GradeBadge from "@/components/GradeBadge";
import ConfidenceBadge from "@/components/ConfidenceBadge";

export default function AdminResearch() {
  const [form, setForm] = useState({ brand_name: "", brand_website: "", category: "outdoor clothing" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const run = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setSaved(false);
    const res = await base44.functions.invoke("researchBrand", {
      brand_name: form.brand_name,
      brand_website: form.brand_website,
      category: form.category,
      user_country: "Norway",
    });
    setResult(res.data?.report);
    setLoading(false);
  };

  const saveReport = async () => {
    setSaving(true);
    // Upsert brand
    const brands = await base44.entities.Brand.filter({ name: result.brand_name });
    let brandId;
    if (brands.length > 0) {
      brandId = brands[0].id;
    } else {
      const brand = await base44.entities.Brand.create({
        name: result.brand_name,
        website: form.brand_website,
        status: "active",
        categories: [result.category],
        is_small_brand_spotlight: result.is_small_brand_spotlight,
        spotlight_reason: result.spotlight_reason,
        last_researched_at: new Date().toISOString(),
        next_refresh_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
      });
      brandId = brand.id;
    }
    // Save report as pending_review
    await base44.entities.BrandCategoryReport.create({
      ...result,
      brand_id: brandId,
      status: "pending_review",
      last_researched_at: new Date().toISOString(),
      next_refresh_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
    });
    setSaving(false);
    setSaved(true);
  };

  const publish = async () => {
    setSaving(true);
    const brands = await base44.entities.Brand.filter({ name: result.brand_name });
    let brandId;
    if (brands.length > 0) {
      brandId = brands[0].id;
    } else {
      const brand = await base44.entities.Brand.create({
        name: result.brand_name, website: form.brand_website, status: "active",
        categories: [result.category], is_small_brand_spotlight: result.is_small_brand_spotlight,
        spotlight_reason: result.spotlight_reason, last_researched_at: new Date().toISOString(),
        next_refresh_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
      });
      brandId = brand.id;
    }
    await base44.entities.BrandCategoryReport.create({
      ...result, brand_id: brandId, status: "published",
      last_researched_at: new Date().toISOString(), published_at: new Date().toISOString(),
      next_refresh_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
    });
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={run} className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-playfair text-xl font-semibold text-foreground">Run AI brand research</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Brand name *</label>
            <input required value={form.brand_name} onChange={e => setForm({ ...form, brand_name: e.target.value })}
              placeholder="e.g. Northern Playground" className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Website</label>
            <input value={form.brand_website} onChange={e => setForm({ ...form, brand_website: e.target.value })}
              placeholder="https://..." className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Category</label>
            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. mens 5mm wetsuit" className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Researching (this takes ~30s)...</> : "Run research agent"}
        </button>
        <p className="text-xs text-muted-foreground">Uses Gemini Pro + web search. Costs integration credits. Results go to admin review before publishing.</p>
      </form>

      {result && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-playfair text-2xl font-bold text-foreground">{result.brand_name}</h2>
              <p className="text-muted-foreground text-sm">{result.category}</p>
            </div>
            <div className="flex items-center gap-3">
              <GradeBadge grade={result.overall_grade} />
              <ConfidenceBadge confidence={result.evidence_confidence} />
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed bg-muted rounded-xl p-4">{result.short_summary}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["material", "transparency", "climate", "worker", "repair", "durability", "circularity"].map(k => (
              <div key={k} className="bg-muted rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground capitalize mb-1">{k}</p>
                <p className="text-lg font-bold font-playfair text-foreground">{result[`${k}_score`] ?? "—"}</p>
              </div>
            ))}
          </div>

          {!saved && (
            <div className="flex gap-3 pt-2">
              <button onClick={saveReport} disabled={saving}
                className="px-5 py-2.5 bg-muted border border-border text-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save as draft (pending review)"}
              </button>
              <button onClick={publish} disabled={saving}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? "Publishing..." : "Approve & publish now"}
              </button>
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle size={16} /> Report saved successfully.
            </div>
          )}
        </div>
      )}
    </div>
  );
}