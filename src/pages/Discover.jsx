import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import NavBar from "@/components/NavBar";
import { RefreshCw, Globe, Users, Star, Search, ChevronRight, XCircle, CheckCircle } from "lucide-react";
import CandidateDetailPanel from "@/components/discover/CandidateDetailPanel";

const TABS = [
  { key: "published",  label: "Published" },
  { key: "candidates", label: "New Candidates" },
  { key: "review",     label: "Needs Review" },
  { key: "community",  label: "Community" },
];

const STATUS_STYLES = {
  new:          "bg-blue-50 text-blue-700 border-blue-200",
  crawled:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  needs_review: "bg-amber-50 text-amber-700 border-amber-200",
  promoted:     "bg-purple-50 text-purple-700 border-purple-200",
  rejected:     "bg-red-50 text-red-700 border-red-200",
};

function CandidateCard({ brand, onOpenDetail }) {
  const statusStyle = STATUS_STYLES[brand.verification_status] || STATUS_STYLES.new;
  const isActionable = brand.verification_status !== "promoted" && brand.verification_status !== "rejected";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-syne text-base font-bold text-foreground truncate">{brand.name}</h3>
          {(brand.city_or_region || brand.country) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {[brand.city_or_region, brand.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${statusStyle}`}>
          {brand.verification_status || "new"}
        </span>
      </div>

      {brand.website && (
        <a
          href={brand.website.startsWith("http") ? brand.website : `https://${brand.website}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          onClick={e => e.stopPropagation()}
        >
          <Globe size={11} /> {brand.normalized_domain || brand.website}
        </a>
      )}

      {brand.sustainability_claims_raw?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {brand.sustainability_claims_raw.slice(0, 3).map((claim, i) => (
            <span key={i} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{claim}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border mt-auto">
        <span>Source: {brand.discovery_source || "unknown"}</span>
        {brand.confidence_level && <span className="font-medium">{brand.confidence_level} confidence</span>}
      </div>

      {/* Action row */}
      <button
        onClick={() => onOpenDetail(brand)}
        className="w-full flex items-center justify-center gap-1.5 py-2 bg-muted hover:bg-secondary text-foreground rounded-xl text-xs font-medium transition-colors"
      >
        {isActionable ? "Review & manage" : "View details"}
        <ChevronRight size={12} />
      </button>
    </div>
  );
}

function SuggestionCard({ suggestion }) {
  const statusStyle = {
    pending:           "bg-muted text-muted-foreground border-border",
    running:           "bg-blue-50 text-blue-700 border-blue-200",
    verified:          "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected:          "bg-red-50 text-red-700 border-red-200",
    insufficient_data: "bg-amber-50 text-amber-700 border-amber-200",
  }[suggestion.ai_verification_status] || "bg-muted text-muted-foreground border-border";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-syne text-base font-bold text-foreground">{suggestion.brand_name}</h3>
          {suggestion.category && <p className="text-xs text-muted-foreground mt-0.5">{suggestion.category}</p>}
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

function PublishedCard({ report }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-syne text-base font-bold text-foreground">{report.brand_name}</h3>
          {report.category && <p className="text-xs text-muted-foreground mt-0.5">{report.category}</p>}
        </div>
        <div className="flex items-center gap-1 text-amber-600">
          <Star size={13} fill="currentColor" />
          <span className="text-xs font-medium">{report.overall_grade || "—"}</span>
        </div>
      </div>
      {report.short_summary && (
        <p className="text-sm text-muted-foreground leading-relaxed">{report.short_summary}</p>
      )}
      {report.standout_practices?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {report.standout_practices.slice(0, 3).map((p, i) => (
            <span key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{p}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
        {report.evidence_confidence && <span>{report.evidence_confidence} confidence</span>}
        {report.published_at && (
          <span>Published {new Date(report.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
        )}
      </div>
    </div>
  );
}

export default function Discover() {
  const [activeTab, setActiveTab] = useState("candidates");
  const [published, setPublished]   = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [reviewNeeded, setReviewNeeded] = useState([]);
  const [suggestions, setSuggestions]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Discovery form state
  const [discoverQuery, setDiscoverQuery]     = useState("thin puffer jacket");
  const [discoverCountry, setDiscoverCountry] = useState("Norway");
  const [discoverCategory, setDiscoverCategory] = useState("outerwear");
  const [discoverMax, setDiscoverMax]         = useState(20);
  const [showForm, setShowForm]               = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [allCandidates, allSuggestions, publishedReports] = await Promise.all([
      base44.entities.CandidateBrand.list("-last_discovered_at", 100).catch(() => []),
      base44.entities.BrandSuggestion.list("-created_date", 30).catch(() => []),
      base44.entities.BrandCategoryReport.filter({ status: "published" }, "-published_at", 20).catch(() => []),
    ]);

    setCandidates(allCandidates.filter(c => c.verification_status === "new" || c.verification_status === "crawled"));
    setReviewNeeded(allCandidates.filter(c => c.verification_status === "needs_review"));
    setSuggestions(allSuggestions);
    setPublished(publishedReports);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      await base44.functions.invoke("discoverLocalBrands", {
        query: discoverQuery,
        country: discoverCountry,
        category: discoverCategory,
        max_candidates: discoverMax,
      });
      await loadData();
    } catch (err) {
      console.error("Discovery error:", err);
    } finally {
      setDiscovering(false);
      setShowForm(false);
    }
  };

  const handleOpenDetail = (brand) => {
    setSelectedBrand(brand);
  };

  const handleCloseDetail = () => {
    setSelectedBrand(null);
  };

  const handleRefreshAfterAction = async () => {
    await loadData();
    // Refresh the selected brand data if still open
    if (selectedBrand) {
      // Re-fetch the updated brand
      base44.entities.CandidateBrand.filter({ id: selectedBrand.id })
        .then(updated => { if (updated?.[0]) setSelectedBrand(updated[0]); })
        .catch(() => {});
    }
  };

  const tabData = {
    published,
    candidates,
    review: reviewNeeded,
    community: suggestions,
  };

  const currentItems = tabData[activeTab] || [];

  return (
    <div className="min-h-screen bg-background pb-safe">
      <NavBar />
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Research</p>
            <h1 className="font-syne text-4xl font-bold text-foreground">Discover</h1>
            <p className="text-muted-foreground mt-2">Pipeline of local & independent brands under evaluation.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw size={14} />
            Run discovery
          </button>
        </div>

        {/* Discovery form */}
        {showForm && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
            <h2 className="font-syne text-lg font-semibold text-foreground">Discovery parameters</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Query</label>
                <input
                  value={discoverQuery}
                  onChange={e => setDiscoverQuery(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="thin puffer jacket"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Country</label>
                <input
                  value={discoverCountry}
                  onChange={e => setDiscoverCountry(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Norway"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Category</label>
                <input
                  value={discoverCategory}
                  onChange={e => setDiscoverCategory(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="outerwear"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Max candidates</label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={discoverMax}
                  onChange={e => setDiscoverMax(Number(e.target.value))}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl font-medium hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscover}
                disabled={discovering || !discoverQuery.trim()}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} className={discovering ? "animate-spin" : ""} />
                {discovering ? "Discovering…" : "Run"}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-max py-2 px-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
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

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No items here yet</p>
            <p className="text-sm mt-1">
              {activeTab === "published"  && "No published brand reports yet."}
              {activeTab === "candidates" && "Run discovery to find new local brands."}
              {activeTab === "review"     && "No brands need review right now."}
              {activeTab === "community"  && "No community suggestions yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTab === "community"
              ? currentItems.map(s => <SuggestionCard key={s.id} suggestion={s} />)
              : activeTab === "published"
              ? currentItems.map(r => <PublishedCard key={r.id} report={r} />)
              : currentItems.map(b => (
                  <CandidateCard
                    key={b.id}
                    brand={b}
                    onOpenDetail={handleOpenDetail}
                  />
                ))
            }
          </div>
        )}
      </div>

      {/* Candidate detail panel */}
      {selectedBrand && (
        <CandidateDetailPanel
          brand={selectedBrand}
          onClose={handleCloseDetail}
          onRefresh={handleRefreshAfterAction}
        />
      )}

      <div className="mobile-bottom-spacer md:hidden" />
    </div>
  );
}