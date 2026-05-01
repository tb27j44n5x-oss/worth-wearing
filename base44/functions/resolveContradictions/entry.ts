import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brand_id, category_key, evidence_sources } = await req.json();
    
    if (!brand_id || !evidence_sources || !Array.isArray(evidence_sources)) {
      return Response.json({ error: 'Missing brand_id or evidence_sources array' }, { status: 400 });
    }

    // Group sources by claim type
    const sourcesByClaimType = {};
    evidence_sources.forEach(src => {
      const claimType = src.claim_type || 'unknown';
      if (!sourcesByClaimType[claimType]) {
        sourcesByClaimType[claimType] = [];
      }
      sourcesByClaimType[claimType].push(src);
    });

    const contradictions = [];
    const resolutions = {};

    // For each claim type, detect contradictions and credibility analysis
    for (const [claimType, sources] of Object.entries(sourcesByClaimType)) {
      const supportSources = sources.filter(s => s.claim_direction === 'supports');
      const contradictSources = sources.filter(s => s.claim_direction === 'contradicts');

      if (supportSources.length > 0 && contradictSources.length > 0) {
        // Calculate weighted verdict based on source credibility
        const supportWeight = supportSources.reduce((sum, s) => sum + (s.credibility_score || 5), 0);
        const contradictWeight = contradictSources.reduce((sum, s) => sum + (s.credibility_score || 5), 0);
        const totalWeight = supportWeight + contradictWeight;

        const supportConfidence = (supportWeight / totalWeight) * 100;
        const contradictConfidence = (contradictWeight / totalWeight) * 100;

        contradictions.push({
          claim_type: claimType,
          supporting_sources: supportSources.length,
          contradicting_sources: contradictSources.length,
          support_weight: parseFloat(supportWeight.toFixed(1)),
          contradict_weight: parseFloat(contradictWeight.toFixed(1)),
          support_confidence_pct: parseFloat(supportConfidence.toFixed(1)),
          contradict_confidence_pct: parseFloat(contradictConfidence.toFixed(1))
        });

        // Determine weighted verdict
        let verdict = 'inconclusive';
        if (supportConfidence > 70) {
          verdict = 'supported_by_weighted_evidence';
        } else if (contradictConfidence > 70) {
          verdict = 'contradicted_by_weighted_evidence';
        }

        resolutions[claimType] = {
          verdict,
          confidence: Math.max(supportConfidence, contradictConfidence),
          top_supporting_source: supportSources.sort((a, b) => (b.credibility_score || 0) - (a.credibility_score || 0))[0],
          top_contradicting_source: contradictSources.sort((a, b) => (b.credibility_score || 0) - (a.credibility_score || 0))[0],
          recommendation: verdict === 'supported_by_weighted_evidence' 
            ? 'Use claim with confidence'
            : verdict === 'contradicted_by_weighted_evidence'
            ? 'Flag greenwashing risk — contradictory evidence found'
            : 'Requires manual review — conflicting evidence'
        };
      } else if (supportSources.length > 0) {
        // Only supporting evidence — high confidence
        const avgCredibility = supportSources.reduce((sum, s) => sum + (s.credibility_score || 5), 0) / supportSources.length;
        resolutions[claimType] = {
          verdict: 'supported_by_evidence',
          avg_credibility: parseFloat(avgCredibility.toFixed(1)),
          source_count: supportSources.length,
          recommendation: avgCredibility >= 8 ? 'High confidence — cite evidence' : 'Medium confidence — note source limitations'
        };
      }
    }



    // Flag single-source claims as requiring manual review
    const singleSourceClaims = Object.entries(sourcesByClaimType)
      .filter(([_, sources]) => sources.length === 1)
      .map(([claimType, sources]) => ({
        claim_type: claimType,
        source: sources[0],
        recommendation: 'Single source — requires corroboration'
      }));

    return Response.json({
      success: true,
      brand_id,
      category_key,
      contradiction_summary: {
        total_claim_types: Object.keys(sourcesByClaimType).length,
        contradictions_found: contradictions.length,
        single_source_claims: singleSourceClaims.length
      },
      contradictions,
      resolutions,
      single_source_claims: singleSourceClaims,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});