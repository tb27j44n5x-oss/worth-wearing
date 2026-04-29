import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import NavBar from "@/components/NavBar";
import GradeBadge from "@/components/GradeBadge";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import ScoreBar from "@/components/ScoreBar";
import SmallBrandSpotlight from "@/components/SmallBrandSpotlight";
import ReportSections from "@/components/ReportSections";
import { Loader2, ExternalLink, ShoppingBag, RefreshCw } from "lucide-react";

const DIMENSIONS = [
  { key: "material", label: "Materials & Fabric" },
  { key: "transparency", label: "Supply-Chain Transparency" },
  { key: "climate", label: "CO₂ & Climate" },
  { key: "worker", label: "Worker Conditions" },
  { key: "repair", label: "Repairability & Warranty" },
  { key: "durability", label: "Quality & Durability" },
  { key: "circularity", label: "Circularity & Second-Hand" },
  { key: "consumption_model", label: "Consumption Model" },
];

export default function BrandReport() {
  const { brandName } = useParams();
  const [searchParams] = useSearchParams();
  const website = searchParams.get("website") || "";
  const category = searchParams.get("category") || "outdoor clothing";

  const [report, setReport] = useState(null);
  const [existingReport, setExistingReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | loading | done

  // Check for existing published report
  useEffect(() => {
    base44.entities.BrandCategoryReport.filter({ brand_name: brandName, status: "published" })
      .then(reports => {
        if (reports?.length > 0) {
          setExistingReport(reports[0]);
          setReport(reports[0]);
          setPhase("done");
        }
      })
      .catch(() => {});
  }, [brandName]);

  const runResearch = async () => {
    setLoading(true);
    setPhase("loading");
    const res = await base44.functions.invoke("researchBrand", {
      brand_name: decodeURIComponent(brandName),
      brand_website: website,
      category,
      user_country: "Norway",
    });
    const r = res.data?.report;
    setReport(r);
    setPhase("done");
    setLoading(false);
  };

  useEffect(() => {
    if (!existingReport && phase === "idle") {
      runResearch();
    }
  }, [existingReport]);

  const name = decodeURIComponent(brandName);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="animate-spin text-primary mb-4" size={36} />
            <p className="font-playfair text-2xl text-foreground mb-2">Researching {name}...</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Reading sustainability pages, annual reports, warranty policies, customer feedback, and third-party sources.
            </p>
            <div className="mt-6 space-y-2 text-xs text-muted-foreground">
              <p>✓ Checking supply-chain transparency</p>
              <p>✓ Evaluating materials and fabric impact</p>
              <p>✓ Reviewing repair & warranty policies</p>
              <p>✓ Searching customer and forum feedback</p>
              <p>✓ Calculating shipping context for Norway</p>
            </div>
          </div>
        )}

        {phase === "done" && report && (
          <div className="space-y-10">
            {/* Header */}
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Brand Report</p>
                <h1 className="font-playfair text-4xl md:text-5xl font-bold text-foreground">{report.brand_name || name}</h1>
                <p className="text-muted-foreground mt-2">{report.category}</p>
                {existingReport && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last researched: {existingReport.last_researched_at ? new Date(existingReport.last_researched_at).toLocaleDateString() : "Recently"}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-3">
                <GradeBadge grade={report.overall_grade} size="lg" />
                <ConfidenceBadge confidence={report.evidence_confidence} />
              </div>
            </div>

            {/* Small brand spotlight */}
            {report.is_small_brand_spotlight && report.spotlight_reason && (
              <SmallBrandSpotlight reason={report.spotlight_reason} />
            )}

            {/* Summary */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-playfair text-xl font-semibold text-foreground mb-3">Summary</h2>
              <p className="text-muted-foreground leading-relaxed">{report.short_summary}</p>
            </div>

            <ReportSections report={report} />

            {/* Dimension scores */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <h2 className="font-playfair text-xl font-semibold text-foreground">Score breakdown</h2>
              <p className="text-xs text-muted-foreground -mt-4">Each score includes the reasoning behind it.</p>
              {DIMENSIONS.map(({ key, label }) => (
                <ScoreBar
                  key={key}
                  label={label}
                  score={report[`${key}_score`]}
                  argument={report[`${key === "consumption_model" ? "consumption" : key}_argument`]}
                />
              ))}
            </div>

            {/* Country context */}
            {report.country_context && (
              <div className="bg-secondary border border-border rounded-2xl p-6">
                <h2 className="font-playfair text-xl font-semibold text-foreground mb-3">Shipping context — Norway</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{report.country_context}</p>
                {report.shipping_origin && <p className="text-xs text-muted-foreground mt-2">Ships from: <span className="text-foreground font-medium">{report.shipping_origin}</span></p>}
              </div>
            )}

            {/* Second-hand */}
            {report.second_hand_notes && (
              <div className="border border-amber-200 bg-amber-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBag size={18} className="text-amber-700" />
                  <h2 className="font-playfair text-xl font-semibold text-amber-900">Second-hand options</h2>
                </div>
                <p className="text-sm text-amber-800 leading-relaxed">{report.second_hand_notes}</p>
              </div>
            )}

            {/* Sources */}
            {report.sources?.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-playfair text-xl font-semibold text-foreground mb-4">Sources</h2>
                <div className="space-y-3">
                  {report.sources.map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0 ${s.source_type === 'brand_owned' ? 'bg-amber-100 text-amber-700' : s.reliability === 'high' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                        {s.source_type?.replace(/_/g, " ")}
                      </span>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 leading-snug">
                          {s.title || s.url} <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">{s.title}</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-4">
                  Brand-owned sources are marked separately. They are claims, not independent verification.
                </p>
              </div>
            )}

            {/* Admin notice */}
            {!existingReport && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                This report is AI-generated and has not yet been reviewed and published by an admin. It is shown as a preview only.
              </div>
            )}

            {/* Suggest correction */}
            <div className="border-t border-border pt-6">
              <p className="text-sm text-muted-foreground">
                Something wrong or missing?{" "}
                <a href="/suggest" className="text-primary underline underline-offset-2 hover:text-primary/80">Submit a correction or new source</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}