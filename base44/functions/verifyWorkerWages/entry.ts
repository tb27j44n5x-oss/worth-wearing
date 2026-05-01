import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Worker Wage Verification
 * Checks evidence sources for actual wage data vs vague claims
 * Updates greenwashing detection with wage-specific penalties
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { brand_id, category_key } = await req.json();

  if (!brand_id || !category_key) {
    return Response.json({ error: 'brand_id and category_key required' }, { status: 400 });
  }

  try {
    const evidenceSources = await base44.asServiceRole.entities.EvidenceSource.filter({
      brand_id,
      category_key,
      claim_category: 'worker_ethics'
    }).catch(() => []);

    const flags = [];
    const wageData = {
      has_published_wage_data: false,
      wage_transparency_level: 'unknown',
      living_wage_verified: false,
      wage_sources: [],
      concerns: []
    };

    // Analyze evidence sources for wage claims
    for (const source of evidenceSources) {
      const summary = (source.summary || '').toLowerCase();
      const sourceType = source.source_type;

      // Check for actual wage data
      if (summary.includes('wage') || summary.includes('hourly') || summary.includes('salary') || summary.includes('€') || summary.includes('$')) {
        if (sourceType === 'third_party_audit' || sourceType === 'certification_body') {
          wageData.has_published_wage_data = true;
          wageData.wage_transparency_level = 'high';
          wageData.wage_sources.push({
            source_type: sourceType,
            credibility: source.credibility_score,
            claim: source.summary
          });
        } else if (sourceType === 'brand_owned') {
          wageData.wage_sources.push({
            source_type: sourceType,
            credibility: source.credibility_score,
            claim: source.summary
          });
        }
      }

      // Check for living wage certification
      if (summary.includes('fair trade') || summary.includes('sa8000') || summary.includes('living wage')) {
        wageData.living_wage_verified = true;
      }

      // Flag vague language
      const vagueTerms = ['ethical', 'responsible', 'fair', 'commitment to'];
      const hasVague = vagueTerms.some(term => summary.includes(term));
      const hasSpecific = summary.includes('wage') || summary.includes('hour') || summary.includes('€') || summary.includes('$');

      if (hasVague && !hasSpecific) {
        flags.push('vague_wage_claims');
        wageData.concerns.push('Claims use vague language ("ethical", "responsible") without publishing actual wage data');
      }
    }

    // Check if factory locations are disclosed (prerequisite for wage verification)
    const crawl = await base44.asServiceRole.entities.BrandWebsiteCrawl.filter({
      brand_id
    }).then(results => results[0]).catch(() => null);

    const factoryLocations = crawl?.key_findings?.factory_information?.named_factories || [];
    if (evidenceSources.length > 0 && !wageData.has_published_wage_data && (!factoryLocations || factoryLocations.length === 0)) {
      flags.push('factory_names_withheld_from_wages');
      wageData.concerns.push('Brand does not disclose factory locations, making wage verification impossible');
    }

    // Check for labor certifications
    const certifications = await base44.asServiceRole.entities.Certification.filter({
      brand_id,
      category_key
    }).catch(() => []);

    const workerCerts = certifications.filter(c => 
      c.certification_name.includes('Fair Trade') ||
      c.certification_name.includes('SA8000') ||
      c.certification_name.includes('GOTS')
    );

    if (workerCerts.length === 0 && !wageData.has_published_wage_data) {
      flags.push('no_labor_certifications');
      wageData.concerns.push('No third-party labor certifications found and no published wage data');
    }

    // Determine wage verification score adjustment
    let scoreAdjustment = 0;
    if (wageData.has_published_wage_data && wageData.living_wage_verified) {
      scoreAdjustment = 2; // +2 points if data is public and verified
    } else if (wageData.has_published_wage_data) {
      scoreAdjustment = 1; // +1 point if data exists but not certified
    } else if (flags.includes('vague_wage_claims')) {
      scoreAdjustment = -2; // -2 points for vague claims
    } else if (flags.includes('factory_names_withheld_from_wages')) {
      scoreAdjustment = -3; // -3 points if brand hides factory info
    }

    return Response.json({
      success: true,
      brand_id,
      wage_verification: wageData,
      worker_score_adjustment: scoreAdjustment,
      greenwashing_flags: flags,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});