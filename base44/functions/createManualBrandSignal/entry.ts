import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VALID_SIGNAL_TYPES = new Set([
  'material', 'production_location', 'factory', 'repair', 'warranty',
  'durability', 'circularity', 'worker_ethics', 'sustainability_claim',
  'greenwashing_risk', 'stockist', 'founder_note', 'other',
]);

const VALID_EVIDENCE_STRENGTHS = new Set(['strong', 'medium', 'weak', 'unverified']);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const {
    candidate_brand_id,
    signal_type,
    claim_text,
    source_url,
    evidence_strength,
    needs_manual_review,
    review_note,
  } = await req.json();

  if (!candidate_brand_id || !claim_text) {
    return Response.json({ error: 'candidate_brand_id and claim_text are required' }, { status: 400 });
  }

  // Validate enums
  const safeSignalType = VALID_SIGNAL_TYPES.has(signal_type) ? signal_type : 'other';
  const safeEvidenceStrength = VALID_EVIDENCE_STRENGTHS.has(evidence_strength) ? evidence_strength : 'unverified';

  const candidates = await base44.asServiceRole.entities.CandidateBrand.filter({ id: candidate_brand_id }).catch(() => []);
  const candidate = candidates[0];
  if (!candidate) {
    return Response.json({ error: 'CandidateBrand not found' }, { status: 404 });
  }

  const now = new Date().toISOString();

  const signal = await base44.asServiceRole.entities.BrandSignal.create({
    candidate_brand_id,
    brand_name: candidate.name,
    signal_type: safeSignalType,
    claim_text,
    source_url: source_url || candidate.website || '',
    source_platform: 'brand_website',
    evidence_strength: safeEvidenceStrength,
    is_brand_owned: true,
    extracted_at: now,
    needs_manual_review: needs_manual_review || false,
    review_note: review_note || '',
  });

  // Update candidate status: needs_review if flagged, else crawled (so it's visible as having data)
  const newStatus = needs_manual_review ? 'needs_review' : 'crawled';
  if (candidate.verification_status === 'new') {
    await base44.asServiceRole.entities.CandidateBrand.update(candidate_brand_id, {
      verification_status: newStatus,
    });
  }

  await base44.asServiceRole.entities.Audit.create({
    action: 'create',
    entity_type: 'BrandSignal',
    entity_id: signal.id,
    performed_by_email: user.email,
    changes: { signal_type: safeSignalType, evidence_strength: safeEvidenceStrength, claim_text },
    reason: 'Manual evidence entry by admin',
    timestamp: now,
  }).catch(() => null);

  return Response.json({ success: true, signal_id: signal.id, signal_type: safeSignalType, evidence_strength: safeEvidenceStrength });
});