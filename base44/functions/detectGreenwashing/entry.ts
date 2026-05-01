import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { brand_id, category_key, report_data } = await req.json();

  if (!brand_id || !category_key || !report_data) {
    return Response.json({ error: 'brand_id, category_key, report_data required' }, { status: 400 });
  }

  try {
    const flags = [];
    const claimsNeedingReview = [];
    let greenwashingRisk = 'low';

    // Check evidence confidence
    if (report_data.evidence_confidence === 'low' || report_data.evidence_confidence === 'unknown') {
      flags.push('low_confidence_evidence');
      greenwashingRisk = 'high';
    }

    // Check for only brand-owned sources
    const evidenceSources = await base44.asServiceRole.entities.EvidenceSource.filter({
      brand_id,
      category_key
    });

    const brandOwnedCount = evidenceSources.filter(e => e.is_brand_owned).length;
    const totalCount = evidenceSources.length;
    if (totalCount > 0 && brandOwnedCount / totalCount > 0.8) {
      flags.push('only_brand_sources');
      greenwashingRisk = greenwashingRisk === 'high' ? 'high' : 'medium';
    }

    // Check for contradictions
    const contradictions = evidenceSources.filter(e => e.contradicting_source_ids && e.contradicting_source_ids.length > 0);
    if (contradictions.length > 0) {
      flags.push('contradiction_detected');
      greenwashingRisk = 'high';
    }

    // Check for vague language in arguments
    const vaguePhrases = ['sustainable', 'eco-friendly', 'responsible', 'ethical', 'commitment', 'effort'];
    const argFields = [
      report_data.material_argument,
      report_data.manufacturing_argument,
      report_data.worker_argument,
      report_data.circularity_argument
    ];

    for (const arg of argFields) {
      if (!arg) continue;
      const vagueCount = vaguePhrases.filter(phrase => arg.toLowerCase().includes(phrase)).length;
      if (vagueCount > 3 && arg.toLowerCase().split(/\d+/).length < 3) {
        flags.push('vague_language');
        greenwashingRisk = greenwashingRisk === 'low' ? 'medium' : greenwashingRisk;
        break;
      }
    }

    // Flag factory information gaps for worker score (CRITICAL)
    const crawl = await base44.asServiceRole.entities.BrandWebsiteCrawl.filter({
      brand_id
    }).then(results => results[0]).catch(() => null);

    const namedFactories = crawl?.key_findings?.factory_information?.named_factories?.length || 0;
    
    if (report_data.worker_argument && namedFactories === 0) {
      flags.push('factory_names_withheld');
      greenwashingRisk = 'high'; // Auto-elevate to high if worker claims exist but no factory disclosure
      claimsNeedingReview.push({
        claim: `Worker ethics claimed ("${report_data.worker_argument?.substring(0, 50)}...") but factory locations not disclosed`,
        reason: 'unverified_wage_claim',
        priority: 'high'
      });
    }
    
    // Check if worker_score > 5 but no wage data published
    if (report_data.worker_score > 5) {
      const workerSources = evidenceSources.filter(e => e.claim_category === 'worker_ethics');
      const hasWageData = workerSources.some(s => 
        s.summary?.includes('wage') || 
        s.summary?.includes('hourly') || 
        s.summary?.includes('salary') ||
        s.summary?.includes('€') ||
        s.summary?.includes('$')
      );
      
      if (!hasWageData && namedFactories === 0) {
        flags.push('wage_claim_greenwashing');
        greenwashingRisk = greenwashingRisk === 'high' ? 'high' : 'medium';
        claimsNeedingReview.push({
          claim: `Worker score ${report_data.worker_score}/10 claimed but no wage data found and factories not named`,
          reason: 'unverified_wage_claim',
          priority: 'high'
        });
      }
    }

    // Check for single-source claims
    if (report_data.worker_argument && evidenceSources.length < 3) {
      claimsNeedingReview.push({
        claim: 'Worker practices claim',
        reason: 'single_source_only',
        priority: 'high'
      });
    }

    // Check evidence freshness
    if (report_data.evidence_sources_map) {
      const sourceIds = Object.values(report_data.evidence_sources_map).flat();
      const oldestDate = Math.min(
        ...sourceIds.map(id => {
          const src = evidenceSources.find(s => s.id === id);
          return src?.date_accessed ? new Date(src.date_accessed).getTime() : Date.now();
        })
      );

      const ageMonths = (Date.now() - oldestDate) / (1000 * 60 * 60 * 24 * 30);
      if (ageMonths > 18) {
        flags.push('outdated_evidence');
        greenwashingRisk = greenwashingRisk === 'low' ? 'medium' : greenwashingRisk;
      }
    }

    // Compile results
    const result = {
      brand_id,
      category_key,
      greenwashing_flags: flags,
      greenwashing_risk: greenwashingRisk,
      claims_needing_manual_review: claimsNeedingReview,
      detection_timestamp: new Date().toISOString()
    };

    return Response.json({
      success: true,
      result
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});