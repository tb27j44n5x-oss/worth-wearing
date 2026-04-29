import { useState } from "react";
import { base44 } from "@/api/base44Client";
import NavBar from "@/components/NavBar";
import GradeBadge from "@/components/GradeBadge";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import { Loader2, Plus, X } from "lucide-react";

const DIMENSIONS = [
  { key: "material", label: "Materials" },
  { key: "transparency", label: "Transparency" },
  { key: "climate", label: "Climate / CO₂" },
  { key: "worker", label: "Worker Conditions" },
  { key: "repair", label: "Repairability" },
  { key: "durability", label: "Durability" },
  { key: "circularity", label: "Circularity" },
  { key: "consumption_model", label: "Consumption Model" },
];

function ScoreCell({ score }) {
  const color = score >= 7 ? "text-emerald-600" : score >= 5 ? "text-amber-600" : score >= 3 ? "text-orange-600" : "text-destructive";
  return <span className={`text-lg font-bold font-playfair ${color}`}>{score !== undefined && score !== null ? `${score}/10` : "—"}</span>;
}

export default function Compare() {
  const [inputs, setInputs] = useState(["", ""]);
  const [category, setCategory] = useState("outdoor clothing");
  const [reports, setReports] = useState([null, null]);
  const [loading, setLoading] = useState([false, false]);

  const research = async (idx) => {
    if (!inputs[idx].trim()) return;
    const newLoading = [...loading]; newLoading[idx] = true; setLoading(newLoading);
    const res = await base44.functions.invoke("researchBrand", {
      brand_name: inputs[idx].trim(),
      category,
      user_country: "Norway",
    });
    const newReports = [...reports]; newReports[idx] = res.data?.report; setReports(newReports);
    const done = [...loading]; done[idx] = false; setLoading(done);
  };

  const clear = (idx) => {
    const newInputs = [...inputs]; newInputs[idx] = ""; setInputs(newInputs);
    const newReports = [...reports]; newReports[idx] = null; setReports(newReports);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Side-by-side comparison</p>
          <h1 className="font-playfair text-4xl font-bold text-foreground">Compare brands</h1>
          <p className="text-muted-foreground mt-2">Compare 2–3 brands across all sustainability dimensions with argued differences.</p>
        </div>

        {/* Category selector */}
        <div className="mb-8">
          <label className="text-sm font-medium text-foreground block mb-2">Product category</label>
          <input
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="e.g. mens 5mm wetsuit"
            className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 w-full max-w-sm"
          />
        </div>

        {/* Brand inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {inputs.map((val, idx) => (
            <div key={idx} className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Brand ${idx + 1} name`}
                  value={val}
                  onChange={e => { const n = [...inputs]; n[idx] = e.target.value; setInputs(n); }}
                  onKeyDown={e => e.key === 'Enter' && research(idx)}
                  className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
                {val && <button onClick={() => clear(idx)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>}
              </div>
              <button
                onClick={() => research(idx)}
                disabled={!val.trim() || loading[idx]}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading[idx] ? <><Loader2 size={14} className="animate-spin" /> Researching...</> : "Research this brand"}
              </button>
              {reports[idx] && (
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <GradeBadge grade={reports[idx].overall_grade} size="sm" />
                  <ConfidenceBadge confidence={reports[idx].evidence_confidence} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comparison table */}
        {reports.some(r => r !== null) && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground w-40">Dimension</th>
                  {reports.map((r, i) => (
                    <th key={i} className="text-left px-6 py-4">
                      {r ? (
                        <div>
                          <p className="font-playfair text-lg font-semibold text-foreground">{r.brand_name || inputs[i]}</p>
                          <ConfidenceBadge confidence={r.evidence_confidence} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border bg-muted/30">
                  <td className="px-6 py-4 text-sm font-medium text-muted-foreground">Overall grade</td>
                  {reports.map((r, i) => (
                    <td key={i} className="px-6 py-4">
                      {r ? <GradeBadge grade={r.overall_grade} size="sm" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                </tr>
                {DIMENSIONS.map(({ key, label }, di) => (
                  <tr key={key} className={`border-b border-border ${di % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="px-6 py-4 text-sm font-medium text-muted-foreground">{label}</td>
                    {reports.map((r, i) => (
                      <td key={i} className="px-6 py-4">
                        {r ? (
                          <div>
                            <ScoreCell score={r[`${key}_score`]} />
                            <p className="text-xs text-muted-foreground mt-1 leading-snug max-w-xs">
                              {r[`${key === "consumption_model" ? "consumption" : key}_argument`]?.slice(0, 120)}...
                            </p>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-border">
                  <td className="px-6 py-4 text-sm font-medium text-muted-foreground">Second-hand</td>
                  {reports.map((r, i) => (
                    <td key={i} className="px-6 py-4">
                      {r?.second_hand_notes ? <p className="text-xs text-muted-foreground max-w-xs leading-snug">{r.second_hand_notes.slice(0, 150)}...</p> : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-muted-foreground">Assessment</td>
                  {reports.map((r, i) => (
                    <td key={i} className="px-6 py-4">
                      {r?.recommendation ? <p className="text-xs text-muted-foreground max-w-xs leading-snug">{r.recommendation.slice(0, 200)}...</p> : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}