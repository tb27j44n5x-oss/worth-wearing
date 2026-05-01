import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Small Brand Transparency Metrics
 * Scores small brands on honesty, specificity, and accessibility (not just certifications)
 * Criteria weighted to value: founder accessibility, honest limitations, supply chain detail
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { brand_id, brand_name, category_key, crawl_data, size_category } = await req.json();

  if (!brand_id || !brand_name || !category_key || !crawl_data) {
    return Response.json({ error: 'brand_id, brand_name, category_key, crawl_data required' }, { status: 400 });
  }

  try {
    const findings = crawl_data.key_findings || {};
    const metrics = {
      founder_accessibility: 0,
      honest_about_limitations: 0,
      specific_over_certified: 0,
      supply_chain_detail: 0,
      price_transparency: 0,
      product_traceability: 0,
      community_engagement: 0,
      repair_first_mindset: 0
    };

    const strengths = [];
    const gaps = [];
    const honestExamples = [];

    // ── 1. Founder Accessibility ──────────────────────────────────────
    const founderText = findings.founder_notes || '';
    if (founderText.match(/founder|owner|team/i) && founderText.length > 100) {
      metrics.founder_accessibility = 8;
      strengths.push('Founder/owner publicly visible with detailed personal notes');
    } else if (founderText.match(/founder|owner/i)) {
      metrics.founder_accessibility = 5;
      strengths.push('Founder name mentioned');
    } else {
      metrics.founder_accessibility = 2;
      gaps.push('No visible founder/owner information (add founder story to build trust)');
    }

    // ── 2. Honest About Limitations ──────────────────────────────────
    const honestMarkers = [
      'we\'re not there yet',
      'here\'s what we couldn\'t',
      'limitation',
      'challenge',
      'can\'t afford',
      'working towards',
      'not yet',
      'future goal',
      'trade-off',
      'compromise'
    ];

    const hasHonest = honestMarkers.some(marker => founderText.toLowerCase().includes(marker));
    if (hasHonest) {
      metrics.honest_about_limitations = 9;
      strengths.push('Openly discusses limitations and future goals');
      
      // Extract examples
      const matches = founderText.match(/(?:we're not there yet|can't afford|limitation)[^.!?]*[.!?]/gi);
      if (matches) {
        honestExamples.push(...matches.slice(0, 3));
      }
    } else {
      metrics.honest_about_limitations = 2;
      gaps.push('No acknowledgment of limitations (adds trust: admit what you can\'t do yet)');
    }

    // ── 3. Specific Over Certified ───────────────────────────────────
    const hasSpecific = founderText.match(/\d+%|factory|supplier|hours|fair wage|€|certif|audit/gi);
    const hasVague = founderText.match(/sustainable|eco|ethical|responsible|commitment/gi);

    const specCount = hasSpecific?.length || 0;
    const vagueCount = hasVague?.length || 0;

    if (specCount > vagueCount && specCount > 0) {
      metrics.specific_over_certified = 8;
      strengths.push('Prioritizes specific facts over vague sustainability terms');
    } else if (specCount > 0) {
      metrics.specific_over_certified = 5;
      gaps.push('Mix of specific and vague language (focus more on numbers, names, processes)');
    } else {
      metrics.specific_over_certified = 2;
      gaps.push('Mostly vague terms without specifics (replace with concrete facts)');
    }

    // ── 4. Supply Chain Detail ──────────────────────────────────────
    const factoryInfo = findings.factory_information || {};
    const namedFactories = (Array.isArray(factoryInfo.named_factories) ? factoryInfo.named_factories : []);
    const factoryCount = namedFactories.length;
    
    if (factoryCount > 2) {
      metrics.supply_chain_detail = 9;
      strengths.push(`Named ${factoryCount} factories with locations`);
    } else if (factoryCount === 2) {
      metrics.supply_chain_detail = 8;
      strengths.push(`Named ${factoryCount} factories: ${namedFactories.join(', ')}`);
    } else if (factoryCount === 1) {
      metrics.supply_chain_detail = 6;
      strengths.push(`Named 1 factory: ${namedFactories[0]}`);
    } else if (findings.supply_chain_detail) {
      metrics.supply_chain_detail = 4;
    } else {
      metrics.supply_chain_detail = 1;
      gaps.push('No factory/supplier transparency (publish names and locations)');
    }

    // ── 5. Price Transparency ──────────────────────────────────────
    if (founderText.match(/cost|price|breakdown|markup|margin/i)) {
      metrics.price_transparency = 8;
      strengths.push('Publishes pricing breakdown or cost rationale');
    } else if (findings.material_sourcing?.match(/cost|price/i)) {
      metrics.price_transparency = 5;
    } else {
      metrics.price_transparency = 2;
      gaps.push('No price transparency (show cost breakdown to justify pricing)');
    }

    // ── 6. Product Traceability ────────────────────────────────────
    if (founderText.match(/batch|serial|lot|trace|sku/i)) {
      metrics.product_traceability = 7;
      strengths.push('Product traceability/serialization available');
    } else {
      metrics.product_traceability = 2;
      gaps.push('No product traceability system (batch/serial numbers help verify authenticity)');
    }

    // ── 7. Community Engagement ────────────────────────────────────
    if (founderText.match(/community|feedback|response|customer|user|story|review|repair story|testimonial/i)) {
      metrics.community_engagement = 7;
      strengths.push('Active community engagement and customer feedback integration');
    } else {
      metrics.community_engagement = 2;
      gaps.push('Limited community visibility (show customer stories and repair examples)');
    }

    // ── 8. Repair-First Mindset ────────────────────────────────────
    const repairInfo = findings.repair_programs || {};
    if (repairInfo.exists && repairInfo.name) {
      metrics.repair_first_mindset = 9;
      strengths.push(`Active repair program: "${repairInfo.name}"`);
    } else if (findings.circular_initiatives?.match(/repair|return|recycle/i)) {
      metrics.repair_first_mindset = 6;
    } else {
      metrics.repair_first_mindset = 2;
      gaps.push('No repair program (offer guides, parts, or services)');
    }

    // ── Weighted Score Calculation ─────────────────────────────────
    // Weights: honesty + specificity > certifications, accessibility, repair
    const weights = {
      founder_accessibility: 0.12,
      honest_about_limitations: 0.18,        // Highest weight
      specific_over_certified: 0.16,         // High weight
      supply_chain_detail: 0.15,
      price_transparency: 0.12,
      product_traceability: 0.08,
      community_engagement: 0.10,
      repair_first_mindset: 0.09
    };

    const weightedScore = Object.entries(metrics).reduce((sum, [key, value]) => {
      return sum + (value * (weights[key] || 0));
    }, 0);

    // Save to database
    const existing = await base44.asServiceRole.entities.SmallBrandTransparencyMetrics.filter({
      brand_id,
      category_key
    }).catch(() => []);

    const payload = {
      brand_id,
      brand_name,
      category_key,
      size_category: size_category || 'small',
      ...metrics,
      weighted_transparency_score: Math.round(weightedScore * 10) / 10,
      score_breakdown: weights,
      key_strengths: strengths,
      gaps_for_growth: gaps,
      honest_limitations_examples: honestExamples,
      last_scored_at: new Date().toISOString(),
      next_review_date: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    if (existing.length > 0) {
      await base44.asServiceRole.entities.SmallBrandTransparencyMetrics.update(existing[0].id, payload).catch(() => null);
    } else {
      await base44.asServiceRole.entities.SmallBrandTransparencyMetrics.create(payload).catch(() => null);
    }

    return Response.json({
      success: true,
      brand_id,
      brand_name,
      category_key,
      weighted_transparency_score: Math.round(weightedScore * 10) / 10,
      individual_scores: metrics,
      key_strengths: strengths,
      gaps_for_growth: gaps,
      transparent_verdict: weightedScore > 7 ? 'high_transparency' : weightedScore > 4 ? 'medium_transparency' : 'low_transparency'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});