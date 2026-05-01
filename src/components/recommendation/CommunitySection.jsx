import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronUp, Loader2, CheckCircle, Plus, X } from "lucide-react";

const STATUS_CONFIG = {
  pending:           { label: "Pending review",      color: "text-muted-foreground bg-muted border-border" },
  running:           { label: "AI researching...",   color: "text-amber-700 bg-amber-50 border-amber-200" },
  verified:          { label: "Verified & added",    color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  rejected:          { label: "Not added",           color: "text-red-700 bg-red-50 border-red-200" },
  insufficient_data: { label: "Needs more data",     color: "text-orange-700 bg-orange-50 border-orange-200" },
};

export default function CommunitySection({ category }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ brand_name: "", brand_website: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.auth.me().then(setUser).catch(() => {});
    });
    loadSuggestions();
  }, [category]);

  const loadSuggestions = async () => {
    setLoading(true);
    const all = await base44.entities.BrandSuggestion.filter(
      category ? { category } : {},
      "-upvotes",
      20
    ).catch(() => []);
    setSuggestions(all);
    setLoading(false);
  };

  const handleUpvote = async (s) => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    if ((s.upvoted_by || []).includes(user.email)) return;
    const updated = await base44.entities.BrandSuggestion.update(s.id, {
      upvotes: (s.upvotes || 0) + 1,
      upvoted_by: [...(s.upvoted_by || []), user.email],
    });
    setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, upvotes: (x.upvotes || 0) + 1, upvoted_by: [...(x.upvoted_by || []), user.email] } : x));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { base44.auth.redirectToLogin(); return; }
    setSubmitting(true);

    const suggestion = await base44.entities.BrandSuggestion.create({
      brand_name: form.brand_name,
      brand_website: form.brand_website,
      category: category || form.category || "general",
      note: form.note,
      submitted_by: user.email,
      upvotes: 1,
      upvoted_by: [user.email],
      ai_verification_status: "pending",
    });

    // Trigger AI verification immediately
    base44.functions.invoke("verifySuggestion", { suggestion_id: suggestion.id })
      .catch(() => {});

    setSubmitting(false);
    setSubmitted(true);
    setShowForm(false);
    setForm({ brand_name: "", brand_website: "", note: "" });
    loadSuggestions();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-playfair text-2xl font-semibold text-foreground">Community suggestions</h2>
          <p className="text-sm text-muted-foreground mt-1">Know a brand we missed? Suggest it — we'll research it automatically.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => user ? setShowForm(true) : base44.auth.redirectToLogin()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} /> Suggest a brand
          </button>
        )}
      </div>

      {/* Suggestion form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-foreground">Suggest a brand</p>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              placeholder="Brand name *"
              value={form.brand_name}
              onChange={e => setForm({ ...form, brand_name: e.target.value })}
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              placeholder="Website (optional)"
              value={form.brand_website}
              onChange={e => setForm({ ...form, brand_website: e.target.value })}
              className="bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <textarea
            placeholder="Why should we include this brand? (optional)"
            value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
            rows={2}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? <><Loader2 size={13} className="animate-spin" /> Submitting...</> : "Submit & research"}
            </button>
            <p className="text-xs text-muted-foreground">AI will research this immediately.</p>
          </div>
        </form>
      )}

      {submitted && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle size={14} /> Suggestion submitted — AI is researching it now.
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 size={14} className="animate-spin" /> Loading suggestions...
        </div>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No suggestions yet — be the first!</p>
      ) : (
        <div className="space-y-2">
          {suggestions.map(s => {
            const statusCfg = STATUS_CONFIG[s.ai_verification_status] || STATUS_CONFIG.pending;
            const alreadyVoted = user && (s.upvoted_by || []).includes(user.email);
            return (
              <div key={s.id} className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
                {/* Upvote */}
                <button
                  onClick={() => handleUpvote(s)}
                  disabled={alreadyVoted}
                  className={`flex flex-col items-center gap-0.5 min-w-[36px] pt-0.5 ${alreadyVoted ? "text-primary" : "text-muted-foreground hover:text-primary"} transition-colors disabled:cursor-default`}
                >
                  <ChevronUp size={16} />
                  <span className="text-xs font-semibold">{s.upvotes || 0}</span>
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{s.brand_name}</p>
                    <span className="text-xs text-muted-foreground">{s.category}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  {s.note && <p className="text-xs text-muted-foreground mt-1">{s.note}</p>}
                  {s.ai_verdict && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{s.ai_verdict}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}