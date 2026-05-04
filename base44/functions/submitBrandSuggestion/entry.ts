import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function normalizeDomain(url) {
  if (!url) return null;
  try {
    const withProto = url.startsWith('http') ? url : `https://${url}`;
    return new URL(withProto).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { correction_type, brand_name, note, submitted_source_url, category } = await req.json();

  if (!note?.trim()) {
    return Response.json({ error: 'note is required' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Always create UserCorrection
  await base44.asServiceRole.entities.UserCorrection.create({
    correction_type: correction_type || 'new_brand',
    brand_name: brand_name || '',
    note,
    submitted_source_url: submitted_source_url || '',
    status: 'pending',
  });

  // Only handle CandidateBrand pipeline for new brand suggestions
  if (correction_type === 'new_brand' && brand_name?.trim()) {
    // Create BrandSuggestion
    const suggestion = await base44.asServiceRole.entities.BrandSuggestion.create({
      brand_name: brand_name.trim(),
      brand_website: submitted_source_url || '',
      category: category || '',
      note,
      submitted_by: user.email,
      ai_verification_status: 'pending',
    }).catch(() => null);

    const normalizedDomain = normalizeDomain(submitted_source_url);

    // Deduplicate CandidateBrand by normalized_domain
    let existingCandidate = null;
    if (normalizedDomain) {
      const byDomain = await base44.asServiceRole.entities.CandidateBrand.filter({
        normalized_domain: normalizedDomain,
      }).catch(() => []);
      existingCandidate = byDomain[0] || null;
    }

    if (existingCandidate) {
      // Update existing candidate safely
      const updatedClaims = [
        ...new Set([...(existingCandidate.sustainability_claims_raw || []), ...(note ? [note] : [])]),
      ];
      await base44.asServiceRole.entities.CandidateBrand.update(existingCandidate.id, {
        sustainability_claims_raw: updatedClaims,
        last_discovered_at: now,
        admin_notes:
          (existingCandidate.admin_notes || '') +
          `\n[Re-suggested by ${user.email} at ${now}]`,
      });

      await base44.asServiceRole.entities.Audit.create({
        action: 'update',
        entity_type: 'CandidateBrand',
        entity_id: existingCandidate.id,
        performed_by_email: user.email,
        changes: { sustainability_claims_raw: updatedClaims },
        reason: 'User brand suggestion (re-suggestion)',
        timestamp: now,
      }).catch(() => null);
    } else {
      // Create new CandidateBrand
      const newCandidate = await base44.asServiceRole.entities.CandidateBrand.create({
        name: brand_name.trim(),
        website: submitted_source_url || '',
        normalized_domain: normalizedDomain,
        category_tags: category ? [category] : [],
        discovery_source: 'user_suggestion',
        source_platform: 'user_suggestion',
        sustainability_claims_raw: note ? [note] : [],
        confidence_level: 'unknown',
        verification_status: 'new',
        created_from_query: note,
        last_discovered_at: now,
      });

      await base44.asServiceRole.entities.Audit.create({
        action: 'create',
        entity_type: 'CandidateBrand',
        entity_id: newCandidate.id,
        performed_by_email: user.email,
        changes: { name: brand_name.trim(), normalized_domain: normalizedDomain },
        reason: 'User brand suggestion',
        timestamp: now,
      }).catch(() => null);
    }

    // Trigger AI verification
    if (suggestion?.id) {
      base44.asServiceRole.functions.invoke('verifySuggestion', { suggestion_id: suggestion.id }).catch(() => {});
    }
  }

  return Response.json({ success: true });
});