import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brand_id, report_data, crawl_data } = await req.json();
    
    if (!brand_id || !report_data) {
      return Response.json({ error: 'Missing brand_id or report_data' }, { status: 400 });
    }

    const flags = [];
    const score_adjustment = 0;
    const greenwashing_indicators = [];

    // ── 1. Durability vs Marketing Disconnect ───────────────────────────────
    if (report_data.durability_score < 5 && report_data.claimed_lifespan) {
      // Brand claims long lifespan but durability data shows otherwise
      if (report_data.claimed_lifespan.includes('year') || report_data.claimed_lifespan.includes('lifetime')) {
        flags.push('planned_obsolescence_despite_durability_claims');
        greenwashing_indicators.push(
          'Brand markets durability/longevity but user data and repairs suggest high failure rate'
        );
      }
    }

    // ── 2. Seasonal Collection Patterns (Fast Fashion Indicator) ──────────────
    if (crawl_data?.key_findings) {
      const content = JSON.stringify(crawl_data.key_findings).toLowerCase();
      
      const fastFashionKeywords = [
        'seasonal collection',
        'new season',
        'spring collection',
        'fall collection',
        'limited edition',
        'drop',
        'exclusive release',
        'trend',
        'trendy'
      ];

      const seasonalIndicators = fastFashionKeywords.filter(kw => content.includes(kw));
      
      if (seasonalIndicators.length > 2) {
        flags.push('seasonal_fast_fashion_model');
        greenwashing_indicators.push(
          `Brand markets ${seasonalIndicators.length} seasonal/trend-driven collections — contradicts sustainability narrative`
        );
      }
    }

    // ── 3. Repair Service vs Expected Replacement Cadence ──────────────────
    const hasRepairProgram = report_data.repair_programs?.exists;
    const avg_months_to_failure = report_data.durability_data?.avg_months_to_failure;
    
    if (hasRepairProgram && avg_months_to_failure && avg_months_to_failure < 18) {
      greenwashing_indicators.push(
        'Brand offers repair service but average product lifespan is ~18 months (suggests designed for replacement)'
      );
      flags.push('repair_service_window_dressing');
    }

    // ── 4. Marketing Language Analysis ────────────────────────────────────
    if (crawl_data?.key_findings?.founder_notes) {
      const founderText = crawl_data.key_findings.founder_notes.toLowerCase();
      
      // Positive: specific, honest language
      const honestMarkers = [
        "we're not there yet",
        "here's what we couldn't",
        "limitation",
        "challenge",
        "trade-off",
        "compromise",
        "working towards",
        "next step"
      ];

      const vaguePhrases = [
        'eco-friendly',
        'sustainable',
        'ethical',
        'responsible',
        'green',
        'conscious'
      ];

      const hasHonestLanguage = honestMarkers.some(marker => founderText.includes(marker));
      const hasVagueLanguage = vaguePhrases.some(phrase => founderText.includes(phrase));

      if (hasVagueLanguage && !hasHonestLanguage) {
        flags.push('vague_sustainability_marketing_without_specifics');
        greenwashing_indicators.push(
          'Marketing uses vague terms ("sustainable", "ethical") without specific claims or limitations'
        );
      } else if (hasHonestLanguage) {
        // Good sign: transparent about limitations
        greenwashing_indicators.push(
          'Brand explicitly acknowledges limitations and trade-offs (positive transparency signal)'
        );
      }
    }

    // ── 5. Price Point Contradiction ──────────────────────────────────────
    // High-sustainability claims but very low prices (unsustainable business model)
    if ((report_data.worker_score && report_data.worker_score > 7) || report_data.claimed_worker_ethics === 'high') {
      if (report_data.price_point === 'low' || report_data.price_point === 'budget') {
        flags.push('unrealistic_sustainability_at_low_price');
        greenwashing_indicators.push(
          'High worker ethics score claimed, but budget pricing suggests potential labor cost-cutting'
        );
      }
    }

    // ── 6. Collection Complexity ────────────────────────────────────────────
    // Too many SKUs = harder to verify sustainability across entire line
    if (report_data.estimated_sku_count && report_data.estimated_sku_count > 50) {
      greenwashing_indicators.push(
        `Brand offers 50+ SKUs — sustainability claims harder to verify across entire range`
      );
    }

    // ── 7. Consumption Advice Contradiction ──────────────────────────────
    // Brand recommends frequent washing/care = hidden consumption
    if (crawl_data?.key_findings?.care_instructions) {
      const careText = (crawl_data.key_findings.care_instructions || '').toLowerCase();
      if (careText.includes('wash frequently') || careText.includes('dry clean')) {
        greenwashing_indicators.push(
          'Care instructions recommend frequent washing/dry cleaning — contradicts durability/sustainability narrative'
        );
      }
    }

    // ── 8. Transparency Check ────────────────────────────────────────────
    const isTransparent = report_data.transparency_score && report_data.transparency_score > 7;
    const hasGreenMarketingFlags = flags.length > 0;
    
    let consumption_model_verdict = 'standard';
    if (hasGreenMarketingFlags && !isTransparent) {
      consumption_model_verdict = 'greenwashing_consumption_model';
    } else if (isTransparent && greenwashing_indicators.some(ind => ind.includes('positive'))) {
      consumption_model_verdict = 'transparent_consumption_model';
    }

    return Response.json({
      success: true,
      brand_id,
      consumption_model_verdict,
      flags,
      greenwashing_indicators,
      consumption_model_score_adjustment: score_adjustment,
      recommendations: {
        marketing_analysis: greenwashing_indicators.length > 2 ? 'High greenwashing risk detected' : 'No marketing red flags',
        durability_fit: avg_months_to_failure && avg_months_to_failure < 24 ? 'Market as seasonal/trend item, not sustainable' : 'Durable positioning justified',
        repair_transparency: hasRepairProgram && avg_months_to_failure && avg_months_to_failure > 36 ? 'Repair program authentic' : 'Repair program contradicts durability claims'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});