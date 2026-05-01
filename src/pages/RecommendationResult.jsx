import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useFetchData } from "@/hooks/useFetchData";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import MobileHeader from "@/components/MobileHeader";
import { motion } from "framer-motion";
import LazySection from "@/components/LazySection";
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
import ContentFlagForm from "@/components/recommendation/ContentFlagForm";
import DataFreshnessBadge from "@/components/recommendation/DataFreshnessBadge";
import CircularEconomyFilter from "@/components/recommendation/CircularEconomyFilter";
import SmallBrandTransparencyView from "@/components/recommendation/SmallBrandTransparencyView";

export default function RecommendationResult() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const country = searchParams.get("country") || "Norway";
  const preference = searchParams.get("preference") || "either";
  const budget = searchParams.get("budget") || "mid";

  const [circularFilter, setCircularFilter] = useState(false);
  const [crawlData, setCrawlData] = useState(null);
  const [progress, setProgress] = useState(0);

  const { data: result, loading, error, refetch } = useFetchData(
    async () => {
      if (!query) return null;
      const res = await base44.functions.invoke("getJacketRecommendation", { query, country, preference, budget });
      const recommendation = res.data?.result || res.data;
      
      // Fetch brand website crawl data if independent brand spotlight exists
      if (recommendation?.independent_brand_spotlight?.brand_name) {
        base44.entities.BrandWebsiteCrawl.filter(
          { brand_name: recommendation.independent_brand_spotlight.brand_name },
          "-crawl_date",
          1
        )
          .then(crawls => {
            if (crawls?.length > 0) setCrawlData(crawls[0]);
          })
          .catch(() => {});
      }
      
      return recommendation;
    },
    [query, country, preference, budget]
  );

  useEffect(() => {
    if (!loading) return;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 25;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [loading]);

  return (
    <div className="min-h-screen bg-background">
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

        {/* Loading with progress */}
        {loading && (
          <div className="space-y-6 py-16">
            <div className="space-y-3">
              <p className="font-syne text-2xl font-semibold text-foreground">Researching brands…</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Analyzing durability, worker ethics, transparency, and supply chains. This typically takes <strong>15-40 seconds</strong>.
              </p>
            </div>

            <div className="space-y-3">
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Progress stages */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Gathering data", threshold: 25 },
                  { label: "Checking evidence", threshold: 50 },
                  { label: "Analyzing supply chains", threshold: 75 },
                  { label: "Finalizing report", threshold: 90 }
                ].map((stage) => (
                  <div key={stage.label} className="text-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full mx-auto mb-2 ${progress >= stage.threshold ? "bg-emerald-100" : "bg-muted"}`}>
                      <span className={`text-xs font-bold ${progress >= stage.threshold ? "text-emerald-700" : "text-muted-foreground"}`}>
                        {progress >= stage.threshold ? "✓" : "●"}
                      </span>
                    </div>
                    <p className={`text-xs font-medium ${progress >= stage.threshold ? "text-foreground" : "text-muted-foreground"}`}>
                      {stage.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
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

            {/* Data freshness badge */}
            {result.last_researched_at && (
              <DataFreshnessBadge 
                lastResearched={result.last_researched_at}
                evidenceFreshness={result.evidence_freshness}
                onRefresh={async () => {
                  try {
                    await base44.functions.invoke("researchBrand", {
                      brand_name: result.best_overall?.brand_name,
                      category: result.normalized_category
                    });
                    refetch();
                  } catch (err) {
                    console.error("Refresh failed:", err);
                  }
                }}
              />
            )}

            {/* Lifecycle stages — lazy load */}
            <LazySection fallback={<div className="h-64 bg-muted rounded-2xl animate-pulse" />}>
              {result.lifecycle_stages && (
                <LifecycleStages lifecycleData={result.lifecycle_stages} />
              )}
            </LazySection>

            {/* Circular economy filter — lazy load */}
            <LazySection fallback={<div className="h-20 bg-muted rounded-2xl animate-pulse" />}>
              {result.detailed_table && (
                <CircularEconomyFilter
                  isActive={circularFilter}
                  onToggle={() => setCircularFilter(!circularFilter)}
                  brandsWithCircular={
                    !circularFilter ? null : result.detailed_table.filter(b => (b.circularity_score || 0) > 7)
                  }
                />
              )}
            </LazySection>

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
                {(result.best_for_worker_ethics || result.best_for_circular_economy || result.best_second_hand_choice) && (
                  <div className="md:hidden space-y-4">
                    {result.best_for_worker_ethics && <WorkerEthicsBlock block={result.best_for_worker_ethics} />}
                    {result.best_for_circular_economy && <RecommendationBlock block={result.best_for_circular_economy} label="Best circular economy" icon="circular" />}
                    {result.best_second_hand_choice && <RecommendationBlock block={result.best_second_hand_choice} label="Best found second-hand" icon="secondhand" />}
                  </div>
                )}
                {(result.best_for_worker_ethics || result.best_for_circular_economy || result.best_second_hand_choice) && (
                  <div className="hidden md:grid md:grid-cols-2 gap-4">
                    {result.best_for_worker_ethics && <WorkerEthicsBlock block={result.best_for_worker_ethics} />}
                    {result.best_for_circular_economy && <RecommendationBlock block={result.best_for_circular_economy} label="Best circular economy" icon="circular" />}
                    {result.best_second_hand_choice && <RecommendationBlock block={result.best_second_hand_choice} label="Best found second-hand" icon="secondhand" />}
                  </div>
                )}
              </div>
              {result.independent_brand_spotlight && (
                <RecommendationBlock block={result.independent_brand_spotlight} label="Independent brand spotlight" icon="independent" fullWidth />
              )}
              {result.biggest_unknown && (
                <RecommendationBlock block={result.biggest_unknown} label="What we still don't know" icon="unknown" fullWidth />
              )}
            </div>

            {/* Small brand transparency — lazy load */}
            <LazySection fallback={<div className="h-80 bg-secondary/20 rounded-2xl animate-pulse" />}>
              {result.independent_brand_spotlight && crawlData && (
                <SmallBrandTransparencyView 
                  brand={result.independent_brand_spotlight.brand_name} 
                  crawlData={crawlData}
                />
              )}
            </LazySection>

            {/* Editorial principle */}
            <div className="bg-secondary/40 border border-border rounded-2xl px-6 py-5">
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                "Not enough evidence is not the same as bad practice. Worth Wearing separates evidence gaps from actual concerns."
              </p>
            </div>

            {/* Second-hand section — lazy load */}
            <LazySection fallback={<div className="h-40 bg-amber-50 rounded-2xl animate-pulse" />}>
              {(result.second_hand_links?.length > 0 || result.second_hand_advice) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                  <SecondHandSection result={result} />
                </div>
              )}
            </LazySection>

            {/* Detailed table — lazy load */}
            <LazySection fallback={<div className="h-96 bg-muted rounded-2xl animate-pulse" />}>
              {result.detailed_table?.length > 0 && (
                <DetailedTable rows={result.detailed_table} />
              )}
            </LazySection>

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

            {/* Durability logger — lazy load */}
            <LazySection fallback={<div className="h-48 bg-card rounded-2xl animate-pulse" />}>
              {result.best_overall?.brand_name && (
                <DurabilityLogger 
                  brandName={result.best_overall.brand_name}
                  brandId={result.best_overall.brand_id || result.best_overall.brand_name.toLowerCase().replace(/\s+/g, '_')}
                  categoryKey={result.normalized_category}
                />
              )}
            </LazySection>

            {/* Content flag form — lazy load */}
            <LazySection fallback={null}>
              <div className="flex justify-center">
                <ContentFlagForm 
                  brandName={result.best_overall?.brand_name || query}
                  reportId={result.recommendation_set_id}
                />
              </div>
            </LazySection>

            {/* User feedback — lazy load */}
            <LazySection fallback={<div className="h-32 bg-card rounded-2xl animate-pulse" />}>
              <div className="bg-card border border-border rounded-2xl p-5">
                <ResultFeedback query={query} recommendationSetId={result.recommendation_set_id} />
              </div>
            </LazySection>

            {/* Community suggestions — lazy load */}
            <LazySection fallback={<div className="h-64 bg-muted rounded-2xl animate-pulse" />}>
              <CommunitySection category={result.normalized_category} />
            </LazySection>

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