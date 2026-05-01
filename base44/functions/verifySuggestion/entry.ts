import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Login required to submit suggestions' }, { status: 401 });
  }

  const { suggestion_id } = await req.json();
  if (!suggestion_id) {
    return Response.json({ error: 'suggestion_id is required' }, { status: 400 });
  }

  // Fetch the suggestion
  const suggestions = await base44.asServiceRole.entities.BrandSuggestion.filter({ id: suggestion_id });
  if (!suggestions.length) {
    return Response.json({ error: 'Suggestion not found' }, { status: 404 });
  }
  const suggestion = suggestions[0];

  // Mark as running
  await base44.asServiceRole.entities.BrandSuggestion.update(suggestion_id, {
    ai_verification_status: 'running'
  });

  const prompt = `
You are a sustainability research agent for ClaimCheck. A user has suggested the brand "${suggestion.brand_name}" for the category "${suggestion.category}".
${suggestion.brand_website ? `Website: ${suggestion.brand_website}` : ''}
${suggestion.note ? `User note: ${suggestion.note}` : ''}

Your job:
1. Research this brand's sustainability practices for the given category.
2. Evaluate whether you have ENOUGH evidence to produce a reliable report.
3. If yes (confidence is "high" or "medium"), produce a full report.
4. If no (confidence is "low" or "unknown"), set verified=false and explain why.

Be skeptical. Distinguish verified third-party evidence from brand marketing claims.

Output JSON:
{
  "verified": boolean,
  "rejection_reason": string (if verified=false, explain what's missing),
  "brand_name": string,
  "category": string,
  "overall_grade": "A+"|"A"|"A-"|"B+"|"B"|"B-"|"C+"|"C"|"C-"|"D"|"F",
  "evidence_confidence": "high"|"medium"|"low"|"unknown",
  "short_summary": string,
  "material_score": number,
  "transparency_score": number,
  "climate_score": number,
  "worker_score": number,
  "repair_score": number,
  "durability_score": number,
  "circularity_score": number,
  "standout_practices": string[],
  "concerns": string[],
  "unknowns": string[],
  "recommendation": string,
  "second_hand_notes": string,
  "repair_warranty_review": string,
  "quality_durability_review": string,
  "is_small_brand_spotlight": boolean,
  "spotlight_reason": string
}
`;

  let aiResult;
  try {
    aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          verified: { type: 'boolean' },
          rejection_reason: { type: 'string' },
          brand_name: { type: 'string' },
          category: { type: 'string' },
          overall_grade: { type: 'string' },
          evidence_confidence: { type: 'string' },
          short_summary: { type: 'string' },
          material_score: { type: 'number' },
          transparency_score: { type: 'number' },
          climate_score: { type: 'number' },
          worker_score: { type: 'number' },
          repair_score: { type: 'number' },
          durability_score: { type: 'number' },
          circularity_score: { type: 'number' },
          standout_practices: { type: 'array', items: { type: 'string' } },
          concerns: { type: 'array', items: { type: 'string' } },
          unknowns: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' },
          second_hand_notes: { type: 'string' },
          repair_warranty_review: { type: 'string' },
          quality_durability_review: { type: 'string' },
          is_small_brand_spotlight: { type: 'boolean' },
          spotlight_reason: { type: 'string' }
        }
      }
    });
  } catch (err) {
    await base44.asServiceRole.entities.BrandSuggestion.update(suggestion_id, {
      ai_verification_status: 'insufficient_data',
      ai_verdict: 'AI research failed: ' + err.message
    });
    return Response.json({ error: 'AI research failed', detail: err.message }, { status: 500 });
  }

  if (!aiResult.verified) {
    await base44.asServiceRole.entities.BrandSuggestion.update(suggestion_id, {
      ai_verification_status: 'insufficient_data',
      ai_verdict: aiResult.rejection_reason || 'Not enough evidence found.'
    });
    return Response.json({ success: true, verified: false, reason: aiResult.rejection_reason });
  }

  // Upsert brand
  const existingBrands = await base44.asServiceRole.entities.Brand.filter({ name: aiResult.brand_name });
  let brandId;
  if (existingBrands.length > 0) {
    brandId = existingBrands[0].id;
  } else {
    const brand = await base44.asServiceRole.entities.Brand.create({
      name: aiResult.brand_name,
      website: suggestion.brand_website || '',
      status: 'active',
      categories: [aiResult.category],
      is_small_brand_spotlight: aiResult.is_small_brand_spotlight || false,
      spotlight_reason: aiResult.spotlight_reason || '',
      last_researched_at: new Date().toISOString(),
      next_refresh_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
      suggested_by: suggestion.submitted_by,
    });
    brandId = brand.id;
  }

  // Create report (published immediately since AI is confident)
  const report = await base44.asServiceRole.entities.BrandCategoryReport.create({
    brand_id: brandId,
    brand_name: aiResult.brand_name,
    category: aiResult.category,
    overall_grade: aiResult.overall_grade,
    evidence_confidence: aiResult.evidence_confidence,
    short_summary: aiResult.short_summary,
    material_score: aiResult.material_score,
    transparency_score: aiResult.transparency_score,
    climate_score: aiResult.climate_score,
    worker_score: aiResult.worker_score,
    repair_score: aiResult.repair_score,
    durability_score: aiResult.durability_score,
    circularity_score: aiResult.circularity_score,
    standout_practices: aiResult.standout_practices || [],
    concerns: aiResult.concerns || [],
    unknowns: aiResult.unknowns || [],
    recommendation: aiResult.recommendation,
    second_hand_notes: aiResult.second_hand_notes,
    repair_warranty_review: aiResult.repair_warranty_review,
    quality_durability_review: aiResult.quality_durability_review,
    status: 'published',
    last_researched_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    next_refresh_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
  });

  // Mark suggestion as verified
  await base44.asServiceRole.entities.BrandSuggestion.update(suggestion_id, {
    ai_verification_status: 'verified',
    ai_verdict: `Report created with grade ${aiResult.overall_grade} and ${aiResult.evidence_confidence} confidence.`,
    report_id: report.id,
  });

  return Response.json({ success: true, verified: true, report_id: report.id });
});