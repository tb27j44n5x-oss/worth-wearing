import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { candidate_brand_id } = await req.json();
  if (!candidate_brand_id) {
    return Response.json({ error: 'candidate_brand_id is required' }, { status: 400 });
  }

  // Fetch candidate
  const candidates = await base44.asServiceRole.entities.CandidateBrand.filter({ id: candidate_brand_id }).catch(() => []);
  const candidate = candidates[0];
  if (!candidate) {
    return Response.json({ error: 'CandidateBrand not found' }, { status: 404 });
  }

  // Fetch all BrandSignal records for this candidate
  const signals = await base44.asServiceRole.entities.BrandSignal.filter({ candidate_brand_id }).catch(() => []);

  const now = new Date().toISOString();

  // Determine confidence based on signal count and quality
  const strongSignals = signals.filter(s => s.evidence_strength === 'strong' || s.evidence_strength === 'medium');
  let promotedConfidence = 'low';
  let unknowns = ['Limited evidence — needs manual research'];

  if (strongSignals.length >= 5) {
    promotedConfidence = 'high';
    unknowns = [];
  } else if (strongSignals.length >= 2) {
    promotedConfidence = 'medium';
    unknowns = ['Partial evidence — some supply chain details missing'];
  } else {
    promotedConfidence = 'low';
    unknowns = ['Insufficient evidence — manual review recommended before publishing'];
  }

  // Derive category key from candidate
  const categoryKey = (candidate.category_tags || [])[0] || candidate.created_from_query || 'unknown';
  const normalizedCategoryKey = categoryKey.toLowerCase().replace(/\s+/g, '_');

  // Map CandidateBrand size_estimate → Brand size_estimate (Brand doesn't support micro/unknown)
  const SIZE_MAP = { micro: 'niche', small: 'small', medium: 'medium', large: 'large' };
  const brandSizeEstimate = SIZE_MAP[candidate.size_estimate] || null; // omit if unknown

  // Create or update Brand
  const existingBrands = await base44.asServiceRole.entities.Brand.filter({ name: candidate.name }).catch(() => []);
  let brandId;
  if (existingBrands.length > 0) {
    brandId = existingBrands[0].id;
    const sizeUpdate = brandSizeEstimate ? { size_estimate: brandSizeEstimate } : {};
    await base44.asServiceRole.entities.Brand.update(brandId, {
      website: candidate.website || existingBrands[0].website,
      country: candidate.country || existingBrands[0].country,
      categories: [...new Set([...(existingBrands[0].categories || []), normalizedCategoryKey])],
      ...sizeUpdate,
      status: 'pending',
      last_researched_at: now,
    });
  } else {
    const createPayload = {
      name: candidate.name,
      website: candidate.website || '',
      country: candidate.country || '',
      categories: [normalizedCategoryKey],
      status: 'pending',
      last_researched_at: now,
    };
    if (brandSizeEstimate) createPayload.size_estimate = brandSizeEstimate;
    const newBrand = await base44.asServiceRole.entities.Brand.create(createPayload);
    brandId = newBrand.id;
  }

  // Build insight data from signals
  const sustainabilityClaims = signals.map(s => s.claim_text).filter(Boolean);
  const materialSignals = signals.filter(s => s.signal_type === 'material').map(s => s.claim_text);
  const repairSignals = signals.filter(s => s.signal_type === 'repair' || s.signal_type === 'warranty').map(s => s.claim_text);
  const productionSignals = signals.filter(s => s.signal_type === 'production_location' || s.signal_type === 'factory').map(s => s.claim_text);
  const workerSignals = signals.filter(s => s.signal_type === 'worker_ethics').map(s => s.claim_text);

  // Derive rough scores from signal strength
  function scoreFromSignals(sigs) {
    if (!sigs.length) return null;
    const strong = sigs.filter(s => signals.find(sig => sig.claim_text === s && sig.evidence_strength === 'strong'));
    const medium = sigs.filter(s => signals.find(sig => sig.claim_text === s && sig.evidence_strength === 'medium'));
    if (strong.length >= 2) return 7;
    if (strong.length >= 1 || medium.length >= 2) return 5;
    return 3;
  }

  const overallScore = promotedConfidence === 'high' ? 7 : promotedConfidence === 'medium' ? 5 : 3;

  // Create or update BrandCategoryInsight
  const existingInsights = await base44.asServiceRole.entities.BrandCategoryInsight.filter({
    brand_name: candidate.name,
    category_key: normalizedCategoryKey,
  }).catch(() => []);

  const insightPayload = {
    brand_name: candidate.name,
    brand_id: brandId,
    category_key: normalizedCategoryKey,
    overall_score: overallScore,
    transparency_score: scoreFromSignals(sustainabilityClaims),
    durability_score: scoreFromSignals(repairSignals),
    repairability_score: repairSignals.length > 0 ? 6 : null,
    manufacturing_clarity_score: scoreFromSignals(productionSignals),
    confidence_level: promotedConfidence,
    summary_verdict: `${candidate.name} — promoted from discovery pipeline with ${signals.length} signal(s). Confidence: ${promotedConfidence}.`,
    durability_notes: repairSignals.join('; ') || '',
    main_unknowns: unknowns,
    main_concerns: [],
    website: candidate.website || '',
    status: 'draft',
    is_current: true,
    last_researched_at: now,
    next_refresh_due: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  };

  if (existingInsights.length > 0) {
    await base44.asServiceRole.entities.BrandCategoryInsight.update(existingInsights[0].id, insightPayload);
  } else {
    await base44.asServiceRole.entities.BrandCategoryInsight.create(insightPayload);
  }

  // Mark candidate as promoted
  await base44.asServiceRole.entities.CandidateBrand.update(candidate_brand_id, {
    verification_status: 'promoted',
    admin_notes: [
      candidate.admin_notes || '',
      `\n\nPromoted by ${user.email} at ${now}`,
      `Confidence: ${promotedConfidence} (${signals.length} signals, ${strongSignals.length} strong/medium)`,
    ].join('\n').trim(),
  });

  // Log to audit trail
  await base44.asServiceRole.entities.Audit.create({
    action: 'create',
    entity_type: 'Brand',
    entity_id: brandId,
    performed_by_email: user.email,
    changes: { promoted_from: candidate_brand_id, confidence: promotedConfidence, signals_count: signals.length },
    reason: `Promoted from CandidateBrand pipeline`,
    timestamp: now,
  }).catch(() => null);

  return Response.json({
    success: true,
    brand_id: brandId,
    brand_name: candidate.name,
    confidence: promotedConfidence,
    signals_used: signals.length,
    strong_signals: strongSignals.length,
    category_key: normalizedCategoryKey,
  });
});