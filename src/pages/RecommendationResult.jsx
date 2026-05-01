import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import MobileHeader from "@/components/MobileHeader";
import { motion } from "framer-motion";
import RecommendationBlock from "@/components/recommendation/RecommendationBlock";
import DetailedTable from "@/components/recommendation/DetailedTable";
import SummaryHeader from "@/components/recommendation/SummaryHeader";
import SecondHandSection from "@/components/recommendation/SecondHandSection";
import ResultFeedback from "@/components/recommendation/ResultFeedback";
import CommunitySection from "@/components/recommendation/CommunitySection";
import LifecycleStages from "@/components/recommendation/LifecycleStages";
import GreenwashingRiskBadge from "@/components/recommendation/GreenwashingRiskBadge";
import WorkerEthicsBlock from "@/components/recommendation/WorkerEthicsBlock";
import DurabilityLogger from "@/components/DurabilityLogger";

export default function RecommendationResult() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const country = searchParams.get("country") || "Norway";
  const preference = searchParams.get("preference") || "either";
  const budget = searchParams.get("budget") || "mid";

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError(null);
    base44.functions.invoke("getJacketRecommendation", { query, country, preference, budget })
      .then(res => setResult(res.data?.result || res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [query, country, preference, budget]);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title={query ? `"${query}"` : "Results"} />
      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center justify-between px-6 py-5 max-w-5xl mx-auto border-b border-border">
        <div>
          <span className="font-syne text-base font-bold text-foreground tracking-tight">Worth Wearing</span>
          <span className="block text-[10px] text-muted-foreground tracking-widest uppercase">by Patrick Olsen.tech</span>
        </div>
        <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> New search
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Query header */}
        <div className="mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2 font-inter">Worth Wearing research</p>
          <h1 className="font-syne text-3xl md:text-4xl font-bold text-foreground">"{query}"</h1>
          <p className="text-sm text-muted-foreground mt-1">{country} · {preference === "secondhand" ? "Second-hand only" : preference === "new" ? "Buying new" : "New or second-hand"} · {budget} budget</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="animate-spin text-primary mb-4" size={36} />
            <p className="font-syne text-xl font-semibold text-foreground mb-2">Researching brands…</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Looking for solid evidence — not just marketing claims. This takes a moment.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center">
            <p className="text-destructive font-medium mb-2">Research failed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link to="/" className="mt-4 inline-block text-sm text-primary underline underline-offset-2">Try again</Link>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">

            {/* Summary header with greenwashing risk */}
            <div className="space-y-4">
              <SummaryHeader result={result} />
              {result.greenwashing_risk && (
                <GreenwashingRiskBadge riskLevel={result.greenwashing_risk} explanation={result.confidence_explanation} />
              )}
            </div>

            {/* Lifecycle stages */}
            {result.lifecycle_stages && (
              <LifecycleStages lifecycleData={result.lifecycle_stages} />
            )}

            {/* Recommendation blocks */}
            <div className="space-y-4">
              <h2 className="font-syne text-2xl font-semibold text-foreground">Our picks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.best_overall && (
                  <RecommendationBlock block={result.best_overall} label="Worth Wearing pick" highlight />
                )}
                {result.best_for_durability && (
                  <RecommendationBlock block={result.best_for_durability} label="Built to last" />
                )}
                {result.best_for_transparency && (
                  <RecommendationBlock block={result.best_for_transparency} label="Most transparent" />
                )}
                {result.best_for_worker_ethics && (
                  <WorkerEthicsBlock block={result.best_for_worker_ethics} />
                )}
                {result.best_for_circular_economy && (
                  <RecommendationBlock block={result.best_for_circular_economy} label="Best circular economy" icon="circular" />
                )}
                {result.best_second_hand_choice && (
                  <RecommendationBlock block={result.best_second_hand_choice} label="Best found second-hand" icon="secondhand" />
                )}
              </div>
              {result.independent_brand_spotlight && (
                <RecommendationBlock block={result.independent_brand_spotlight} label="Independent brand spotlight" icon="independent" fullWidth />
              )}
              {result.biggest_unknown && (
                <RecommendationBlock block={result.biggest_unknown} label="What we still don't know" icon="unknown" fullWidth />
              )}
            </div>

            {/* Editorial principle */}
            <div className="bg-secondary/40 border border-border rounded-2xl px-6 py-5">
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                "Not enough evidence is not the same as bad practice. Worth Wearing separates evidence gaps from actual concerns."
              </p>
            </div>

            {/* Second-hand section — shown prominently */}
            {(result.second_hand_links?.length > 0 || result.second_hand_advice) && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <SecondHandSection result={result} />
              </div>
            )}

            {/* Detailed table */}
            {result.detailed_table?.length > 0 && (
              <DetailedTable rows={result.detailed_table} />
            )}

            {/* Evidence notes */}
            {result.evidence_notes && (
              <div className="bg-muted border border-border rounded-2xl p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">About this research</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{result.evidence_notes}</p>
              </div>
            )}

            {/* Unreviewed notice */}
            {result.is_cached === false && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">
                  This is freshly AI-generated research that has not yet been reviewed by our team. Treat it as a starting point — not a final verdict.
                </p>
              </div>
            )}

            {/* Durability logger */}
            {result.best_overall?.brand_name && (
              <DurabilityLogger 
                brandName={result.best_overall.brand_name}
                brandId={result.best_overall.brand_name.toLowerCase().replace(/\s+/g, '_')}
                categoryKey={result.normalized_category}
              />
            )}

            {/* User feedback */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <ResultFeedback query={query} recommendationSetId={result.recommendation_set_id} />
            </div>

            {/* Community suggestions */}
            <CommunitySection category={result.normalized_category} />

            {/* Footer */}
            <div className="border-t border-border pt-6 flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-syne font-medium text-foreground">Worth Wearing</span> — by Patrick Olsen.tech
              </p>
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <ArrowLeft size={14} /> New search
              </Link>
            </div>
          </motion.div>
        )}
      </div>
      <div className="mobile-bottom-spacer md:hidden" />
    </div>
  );
}