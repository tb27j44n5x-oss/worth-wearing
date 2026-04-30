import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CheckCircle, Loader2, ExternalLink } from "lucide-react";

const SCORES = ["overall_score", "durability_score", "transparency_score", "repairability_score", "secondhand_score", "manufacturing_clarity_score"];
const SCORE_LABELS = {
  overall_score: "Overall",
  durability_score: "Durability",
  transparency_score: "Transparency",
  repairability_score: "Repairability",
  secondhand_score: "2nd hand",
  manufacturing_clarity_score: "Mfg clarity",
};

const CONFIDENCE_OPTIONS = ["high", "medium", "low", "unknown"];

function ScoreInput({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <input
        type="number" min="0" max="10" step="0.5"
        value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
        className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 font-playfair text-center"
      />
    </div>
  );
}

export default function AdminReviewEditor({ item, onBack }) {
  const initialParsed = (() => { try { return JSON.parse(item.result_json || "{}"); } catch { return {}; } })();

  const [verdict, setVerdict] = useState(item.summary_verdict || "");
  const [confidence, setConfidence] = useState(item.confidence_level || "unknown");
  const [evidenceNotes, setEvidenceNotes] = useState(initialParsed.evidence_notes || "");

  // Editable detailed_table rows
  const [tableRows, setTableRows] = useState(
    (initialParsed.detailed_table || []).map(r => ({ ...r }))
  );

  // Editable best_overall/durability/transparency/secondhand/biggest_unknown verdicts
  const [blocks, setBlocks] = useState({
    best_overall: initialParsed.best_overall || {},
    best_for_durability: initialParsed.best_for_durability || {},
    best_for_transparency: initialParsed.best_for_transparency || {},
    best_second_hand_choice: initialParsed.best_second_hand_choice || {},
    biggest_unknown: initialParsed.biggest_unknown || {},
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateRow = (idx, field, value) => {
    setTableRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const updateBlock = (blockKey, field, value) => {
    setBlocks(prev => ({ ...prev, [blockKey]: { ...prev[blockKey], [field]: value } }));
  };

  const save = async (markReviewed) => {
    setSaving(true);
    const updatedResult = {
      ...initialParsed,
      summary_verdict: verdict,
      confidence_level: confidence,
      evidence_notes: evidenceNotes,
      detailed_table: tableRows,
      ...blocks,
    };
    await base44.entities.RecommendationSet.update(item.id, {
      summary_verdict: verdict,
      confidence_level: confidence,
      result_json: JSON.stringify(updatedResult),
      is_ai_unreviewed: markReviewed ? false : item.is_ai_unreviewed,
      last_used_at: item.last_used_at,
    });
    setSaving(false);
    setSaved(true);
    if (markReviewed) setTimeout(onBack, 800);
  };

  const BLOCK_LABELS = {
    best_overall: "Best overall",
    best_for_durability: "Best for durability",
    best_for_transparency: "Best for transparency",
    best_second_hand_choice: "Best second-hand",
    biggest_unknown: "Biggest unknown",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Back to queue
        </button>
        <div className="flex-1">
          <h2 className="font-playfair text-2xl font-bold text-foreground">"{item.query}"</h2>
          <p className="text-xs text-muted-foreground">Category: {item.category_key} · Created: {new Date(item.created_date).toLocaleDateString("en-GB")}</p>
        </div>
        {item.is_ai_unreviewed && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">AI unreviewed</span>
        )}
      </div>

      {/* Summary verdict */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">Summary verdict</h3>
        <textarea
          value={verdict}
          onChange={e => setVerdict(e.target.value)}
          rows={3}
          className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-foreground">Confidence:</label>
          <div className="flex gap-2">
            {CONFIDENCE_OPTIONS.map(opt => (
              <button key={opt} onClick={() => setConfidence(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${confidence === opt ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Evidence notes</label>
          <textarea
            value={evidenceNotes}
            onChange={e => setEvidenceNotes(e.target.value)}
            rows={2}
            placeholder="Describe what sources were found, what is uncertain..."
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>
      </div>

      {/* Recommendation blocks */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">Recommendation blocks</h3>
        {Object.entries(BLOCK_LABELS).map(([blockKey, blockLabel]) => {
          const block = blocks[blockKey];
          return (
            <div key={blockKey} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{blockLabel}</p>
                <span className="text-sm font-semibold text-foreground">{block.brand_name || "—"}</span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Brand name</label>
                <input value={block.brand_name || ""} onChange={e => updateBlock(blockKey, "brand_name", e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Verdict</label>
                <textarea value={block.verdict || ""} onChange={e => updateBlock(blockKey, "verdict", e.target.value)}
                  rows={2} className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Known evidence</label>
                  <textarea value={block.main_known_evidence || ""} onChange={e => updateBlock(blockKey, "main_known_evidence", e.target.value)}
                    rows={2} className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Main unknown</label>
                  <textarea value={block.main_unknown || ""} onChange={e => updateBlock(blockKey, "main_unknown", e.target.value)}
                    rows={2} className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Confidence</label>
                  <select value={block.evidence_confidence || "unknown"} onChange={e => updateBlock(blockKey, "evidence_confidence", e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30">
                    {CONFIDENCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Buying route</label>
                  <select value={block.recommended_buying_route || "research_further"} onChange={e => updateBlock(blockKey, "recommended_buying_route", e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="buy_new">Buy new</option>
                    <option value="buy_secondhand">Buy second-hand</option>
                    <option value="research_further">Research further</option>
                  </select>
                </div>
              </div>
              {block.website && (
                <a href={block.website} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  {block.website} <ExternalLink size={10} />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed table score editor */}
      {tableRows.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">Brand scores</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-2 py-2 text-xs text-muted-foreground font-medium">Brand</th>
                  {SCORES.map(s => (
                    <th key={s} className="text-center px-2 py-2 text-xs text-muted-foreground font-medium">{SCORE_LABELS[s]}</th>
                  ))}
                  <th className="text-center px-2 py-2 text-xs text-muted-foreground font-medium">Confidence</th>
                  <th className="text-center px-2 py-2 text-xs text-muted-foreground font-medium">Route</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="px-2 py-2">
                      <input value={row.brand_name || ""} onChange={e => updateRow(idx, "brand_name", e.target.value)}
                        className="w-28 bg-muted border border-border rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/30" />
                    </td>
                    {SCORES.map(s => (
                      <td key={s} className="px-2 py-2">
                        <input type="number" min="0" max="10" step="0.5"
                          value={row[s] ?? ""} onChange={e => updateRow(idx, s, e.target.value === "" ? null : parseFloat(e.target.value))}
                          className="w-14 bg-muted border border-border rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/30 text-center font-playfair" />
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      <select value={row.confidence_level || "unknown"} onChange={e => updateRow(idx, "confidence_level", e.target.value)}
                        className="bg-muted border border-border rounded-lg px-2 py-1 text-xs outline-none">
                        {CONFIDENCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select value={row.recommended_buying_route || "research_further"} onChange={e => updateRow(idx, "recommended_buying_route", e.target.value)}
                        className="bg-muted border border-border rounded-lg px-2 py-1 text-xs outline-none">
                        <option value="buy_new">New</option>
                        <option value="buy_secondhand">2nd hand</option>
                        <option value="research_further">Research</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evidence sources preview */}
      {initialParsed.second_hand_links?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
          <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">Second-hand links (read-only)</h3>
          <div className="space-y-1.5">
            {initialParsed.second_hand_links.map((l, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-medium text-foreground w-36 flex-shrink-0">{l.platform}</span>
                <a href={l.search_url} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs truncate flex items-center gap-1">
                  {l.search_url} <ExternalLink size={10} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
        {saved && !saving && (
          <span className="flex items-center gap-1.5 text-emerald-600 text-sm">
            <CheckCircle size={14} /> Saved
          </span>
        )}
        <div className="flex gap-3 ml-auto">
          <button onClick={() => save(false)} disabled={saving}
            className="px-5 py-2.5 bg-muted border border-border text-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Save draft
          </button>
          <button onClick={() => save(true)} disabled={saving}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            Save & mark reviewed
          </button>
        </div>
      </div>
    </div>
  );
}