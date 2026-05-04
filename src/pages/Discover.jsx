import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import NavBar from "@/components/NavBar";
import { RefreshCw, Globe, CheckCircle, Clock, AlertTriangle, Users } from "lucide-react";

const TABS = [
  { key: "candidates", label: "New Candidates" },
  { key: "review", label: "Needs Review" },
  { key: "community", label: "Community Suggestions" },
];

const STATUS_STYLES = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  crawled: "bg-emerald-50 text-emerald-700 border-emerald-200",
  needs_review: "bg-amber-50 text-amber-700 border-amber-200",
  promoted: "bg-purple-50 text-purple-700 border-purple-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function CandidateCard({ brand }) {
  const statusStyle = STATUS_STYLES[brand.verification_status] || STATUS_STYLES.new;
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-syne text-base font-bold text-foreground">{brand.name}</h3>
          {brand.city_or_region && (
            <p className="text-xs text-muted-foreground mt-0.5">{brand.city_or_region}{brand.country ? `, ${brand.country}` : ""}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${statusStyle}`}>
          {brand.verification_status || "new"}
        </span>
      </div>

      {brand.website && (
        <a href={brand.website.startsWith("http") ? brand.website : `https://${brand.website}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline">
          <Globe size={11} /> {brand.website}
        </a>
      )}

      {brand.sustainability_claims_raw?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Signals</p>
          <div className="flex flex-wrap gap-1.5">
            {brand.sustainability_claims_raw.slice(0, 4).map((claim, i) => (
              <span key={i} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{claim}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
        <span>Source: {brand.discovery_source || "unknown"}</span>
        {brand.confidence_level && (
          <span className="font-medium">{brand.confidence_level} confidence</span>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }) {
  const statusStyle = {
    pending: "bg-muted text-muted-foreground border-border",
    running: "bg-blue-50 text-blue-700 border-blue-200",
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    insufficient_data: "bg-amber-50 text-amber-700 border-amber-200",
  }[suggestion.ai_verification_status] || "bg-muted text-muted-foreground border-border";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-syne text-base font-bold text-foreground">{suggestion.brand_name}</h3>
          {suggestion.category && (
            <p className="text-xs text-muted-foreground mt-0.5">{suggestion.category}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${statusStyle}`}>
          {suggestion.ai_verification_status || "pending"}
        </span>
      </div>

      {suggestion.note && (
        <p className="text-sm text-muted-foreground leading-relaxed">"{suggestion.note}"</p>
      )}

      {suggestion.ai_verdict && (
        <div className="bg-muted rounded-xl p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.ai_verdict}</p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
        <span className="flex items-center gap-1"><Users size={11} /> {suggestion.upvotes || 0} upvotes</span>
        <span>by {suggestion.submitted_by}</span>
      </div>
    </div>
  );
}

export default function Discover() {
  const [activeTab, setActiveTab] = useState("candidates");
  const [candidates, setCandidates] = useState([]);
  const [reviewNeeded, setReviewNeeded] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [allCandidates, allSuggestions] = await Promise.all([
      base44.entities.CandidateBrand.list("-last_discovered_at", 50).catch(() => []),
      base44.entities.BrandSuggestion.list("-created_date", 30).catch(() => []),
    ]);
    setCandidates(allCandidates.filter(c => c.verification_status === "new" || c.verification_status === "crawled"));
    setReviewNeeded(allCandidates.filter(c => c.verification_status === "needs_review"));
    setSuggestions(allSuggestions);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      await base44.functions.invoke("discoverLocalBrands", { query: "sustainable jacket", country: "Norway", max_candidates: 10 });
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setDiscovering(false);
    }
  };

  const tabData = {
    candidates,
    review: reviewNeeded,
    community: suggestions,
  };

  const currentItems = tabData[activeTab] || [];

  return (
    <div className="min-h-screen bg-background pb-safe">
      <NavBar />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Research</p>
            <h1 className="font-syne text-4xl font-bold text-foreground">Discover</h1>
            <p className="text-muted-foreground mt-2">Pipeline of local & independent brands under evaluation.</p>
          </div>
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={discovering ? "animate-spin" : ""} />
            {discovering ? "Discovering…" : "Run discovery"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tabData[tab.key]?.length > 0 && (
                <span className="ml-1.5 text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                  {tabData[tab.key].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No items here yet</p>
            <p className="text-sm mt-1">
              {activeTab === "candidates" && "Run discovery to find new local brands."}
              {activeTab === "review" && "No brands need review right now."}
              {activeTab === "community" && "No community suggestions yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTab === "community"
              ? currentItems.map(s => <SuggestionCard key={s.id} suggestion={s} />)
              : currentItems.map(b => <CandidateCard key={b.id} brand={b} />)
            }
          </div>
        )}
      </div>
      <div className="mobile-bottom-spacer md:hidden" />
    </div>
  );
}