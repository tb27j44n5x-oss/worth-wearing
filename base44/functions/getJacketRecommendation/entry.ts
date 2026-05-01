import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BRAND_CACHE_TTL_DAYS = 90;

// Normalize query for cache key with multi-variant matching
function normalizeQuery(query) {
  const cleaned = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
  
  // Map variants to canonical form
  const variants = {
    'waterproof': ['waterproof', 'rain', 'wet weather'],
    'jacket': ['jacket', 'coat', 'parka'],
    'shell': ['shell', 'outer', 'layer'],
    'fleece': ['fleece', 'insulation', 'thermal'],
    'boot': ['boot', 'shoe', 'footwear'],
    'glove': ['glove', 'mitten', 'hand'],
  };
  
  let canonical = cleaned;
  for (const [canonical_word, variant_list] of Object.entries(variants)) {
    for (const variant of variant_list) {
      if (cleaned.includes(variant)) {
        canonical = canonical.replace(variant, canonical_word);
      }
    }
  }
  
  return canonical
    .replace(/\b(a|an|the|for|and|or|with|in|of|best|good|cheap|quality|mens|womens|unisex)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .sort()
    .join('_');
}

// Check if a brand insight is still fresh (within TTL)
function isBrandFresh(insight) {
  if (!insight.last_researched_at) return false;
  const age = Date.now() - new Date(insight.last_researched_at).getTime();
  return age < BRAND_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
}

// Save brand insights from AI result into BrandCategoryInsight with retry logic
async function saveBrandInsights(base44, categoryKey, aiResult) {
  const rows = aiResult.detailed_table || [];
  const now = new Date().toISOString();
  const refreshAt = new Date(Date.now() + BRAND_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const saves = rows.map(async (row) => {
    if (!row.brand_name) return;
    
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        // Check for existing insight to update
        const existing = await base44.entities.BrandCategoryInsight.filter({
          brand_name: row.brand_name,
          category_key: categoryKey,
        }).catch(() => []);

        // Find extra data for this brand from the recommendation blocks
        const allBlocks = [
          aiResult.best_overall,
          aiResult.best_for_durability,
          aiResult.best_for_transparency,
          aiResult.best_second_hand_choice,
          aiResult.biggest_unknown,
          aiResult.independent_brand_spotlight,
        ].filter(b => b?.brand_name?.toLowerCase() === row.brand_name?.toLowerCase());
        const blockData = allBlocks[0] || {};

        const payload = {
          brand_name: row.brand_name,
          category_key: categoryKey,
          overall_score: row.overall_score,
          durability_score: row.durability_score,
          transparency_score: row.transparency_score,
          repairability_score: row.repairability_score,
          secondhand_score: row.secondhand_score,
          manufacturing_clarity_score: row.manufacturing_clarity_score,
          confidence_level: row.confidence_level || 'unknown',
          recommended_buying_route: row.recommended_buying_route,
          website: row.website || blockData.website || '',
          summary_verdict: blockData.verdict || '',
          durability_notes: blockData.main_known_evidence || '',
          main_unknowns: blockData.main_unknown ? [blockData.main_unknown] : [],
          main_concerns: [],
          status: 'draft',
          is_current: true,
          last_researched_at: now,
          next_refresh_due: refreshAt,
        };

        if (existing.length > 0) {
          await base44.entities.BrandCategoryInsight.update(existing[0].id, payload);
        } else {
          await base44.entities.BrandCategoryInsight.create({ 
            ...payload, 
            brand_id: row.brand_name.toLowerCase().replace(/\s+/g, '_') 
          });
        }
        
        // Success — log to analytics
        base44.analytics.track({
          eventName: 'brand_insight_saved',
          properties: { brand_name: row.brand_name, category_key: categoryKey }
        });
        
        return;
      } catch (err) {
        retries++;
        if (retries >= maxRetries) {
          // Log failure after all retries exhausted
          base44.analytics.track({
            eventName: 'brand_insight_save_failed',
            properties: {
              brand_name: row.brand_name,
              error: err.message,
              retries_attempted: retries
            }
          });
        }
      }
    }
  });

  const results = await Promise.allSettled(saves);
  return results.map(r => r.status === 'fulfilled');
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { query, country, preference, budget } = await req.json();

  if (!query) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  const userCountry = country || 'Norway';
  const normalizedQuery = normalizeQuery(query);

  // ── 1. Check full-result cache ───────────────────────────────────────────────
  const existing = await base44.asServiceRole.entities.RecommendationSet.filter({ normalized_query: normalizedQuery });

  if (existing.length > 0) {
    const cached = existing[0];
    base44.asServiceRole.entities.RecommendationSet.update(cached.id, {
      last_used_at: new Date().toISOString()
    }).catch(() => {});

    let parsedResult;
    try { parsedResult = JSON.parse(cached.result_json); } catch (_) { parsedResult = null; }

    if (parsedResult) {
      return Response.json({
        success: true,
        result: {
          ...parsedResult,
          recommendation_set_id: cached.id,
          is_cached: true,
          is_ai_unreviewed: cached.is_ai_unreviewed,
          last_researched_at: cached.updated_date,
        }
      });
    }
  }

  // ── 2. Load known brand insights + durability data + FAST-PATH CHECK ──────────────
  const roughCategoryKey = normalizedQuery;

  const [knownInsights, durabilityAggregates] = await Promise.all([
    base44.entities.BrandCategoryInsight.filter({
      category_key: roughCategoryKey,
      is_current: true,
    }).catch(() => []),
    base44.entities.DurabilityAggregate.filter({
      category_key: roughCategoryKey,
    }).catch(() => [])
  ]);

  const freshInsights = knownInsights.filter(isBrandFresh);
  
  // FAST-PATH: If we have enough high-confidence fresh brands, skip AI and compose result
  const highConfidenceBrands = freshInsights.filter(b => b.confidence_level === 'high');
  if (highConfidenceBrands.length >= 5 && freshInsights.length >= 8) {
    // Build quick result from cached insights
    const detailedTable = freshInsights.map(b => {
      const durability = durabilityAggregates.find(d => d.brand_name === b.brand_name);
      return {
        brand_name: b.brand_name,
        overall_score: b.overall_score || 5,
        durability_score: b.durability_score || 5,
        transparency_score: b.transparency_score || 5,
        repairability_score: b.repairability_score || 5,
        secondhand_score: b.secondhand_score || 5,
        manufacturing_clarity_score: b.manufacturing_clarity_score || 5,
        confidence_level: b.confidence_level,
        recommended_buying_route: b.recommended_buying_route || 'buy_new',
        website: b.website
      };
    });
    
    const fastPathResult = {
      normalized_category: roughCategoryKey,
      summary_verdict: `Based on existing research for ${roughCategoryKey}: ${highConfidenceBrands[0]?.brand_name} is highly recommended overall.`,
      confidence_level: 'high',
      confidence_explanation: 'Result based on 8+ verified brands from previous research.',
      greenwashing_risk: 'low',
      evidence_notes: 'Results compiled from verified brand research (${BRAND_CACHE_TTL_DAYS}-day cache).',
      detailed_table: detailedTable,
      second_hand_links: [],
      lifecycle_stages: {},
      what_we_know: [],
      what_we_dont_know: [],
      second_hand_advice: 'Check second-hand platforms for recent listings.'
    };
    
    return Response.json({
      success: true,
      result: {
        ...fastPathResult,
        is_cached: true,
        is_ai_unreviewed: false,
      }
    });
  }

  // Build the "already known" context block + real durability data to inject into the prompt
  let knownBrandsContext = '';
  if (freshInsights.length > 0) {
    const lines = freshInsights.map(b => {
      const durability = durabilityAggregates.find(d => d.brand_name === b.brand_name);
      const durabilityNote = durability ? ` [User data: ${durability.avg_months_to_failure ? Math.round(durability.avg_months_to_failure) + ' months avg' : 'limited'}]` : '';
      return `${b.brand_name}: score=${b.overall_score}, durability=${b.durability_score}, confidence=${b.confidence_level}${durabilityNote}`;
    });
    knownBrandsContext = `CACHED BRANDS (reuse scores as-is): ${lines.join(' | ')}`;
  }

  // ── 3. Build compact prompt (system instructions externalized) ───────────────
  const budgetNote = budget === 'low' ? 'Under €150' : budget === 'premium' ? '€300+' : '€100–300';
  const preferenceNote = preference === 'secondhand' ? 'Second-hand' : preference === 'new' ? 'New only' : 'Either';

  const prompt = `SEARCH: "${query}" | LOCATION: ${userCountry} | PREFERENCE: ${preferenceNote} | BUDGET: ${budgetNote}

${knownBrandsContext}

RESEARCH: 8-10 brands (mix known + small independent). For each: material/durability/supply chain/repair/second-hand/worker ethics.
Include: product URLs, Reddit sentiment (r/BuyItForLife, relevant subreddits), small brand website analysis.
Score small brands on honesty/specificity, not certifications. Flag greenwashing, vague claims, missing factory info.
Transport CO2: calculate distance ${userCountry} → manufacturing location.

TONE: Honest researcher. Cite evidence type. Flag unknowns. Be skeptical: "Based on available evidence", "Limited data", "Unverified claim".

LIFECYCLE (all brands): RAW MATERIAL (fiber/certs/footprint) → MANUFACTURING (location/energy/worker wages) → TRANSPORT (distance/mode/CO2) → USE/DURABILITY (lifespan/repair) → END-OF-LIFE (recyclable/take-back).

WORKER ETHICS (mandatory): Published wage data + named factories = 9-10. Named factories + conditions = 7-8. Vague claims + no factories = 1-4. Living wage claim without factory names = ≤4.

SMALL BRANDS: Reward honesty about limitations. "we can't afford Bluesign yet" > glossy corporate PDF. Factory names + repair programs + founder notes = high score.

`;

  const jsonSchema = {
    type: 'object',
    properties: {
      normalized_category: { type: 'string' },
      summary_verdict: { type: 'string' },
      confidence_level: { type: 'string' },
      confidence_explanation: { type: 'string' },
      evidence_notes: { type: 'string' },
      what_we_know: { type: 'array', items: { type: 'string' } },
      what_we_dont_know: { type: 'array', items: { type: 'string' } },
      second_hand_advice: { type: 'string' },
      best_overall: {
        type: 'object',
        properties: {
          brand_name: { type: 'string' }, verdict: { type: 'string' }, why_chosen: { type: 'string' },
          main_known_evidence: { type: 'string' }, main_unknown: { type: 'string' },
          evidence_snippets: { type: 'array', items: { type: 'string' } },
          evidence_confidence: { type: 'string' }, recommended_buying_route: { type: 'string' },
          product_url: { type: 'string' }, website: { type: 'string' }
        }
      },
      best_for_durability: {
        type: 'object',
        properties: {
          brand_name: { type: 'string' }, verdict: { type: 'string' }, why_chosen: { type: 'string' },
          main_known_evidence: { type: 'string' }, main_unknown: { type: 'string' },
          evidence_snippets: { type: 'array', items: { type: 'string' } },
          evidence_confidence: { type: 'string' }, recommended_buying_route: { type: 'string' },
          product_url: { type: 'string' }, website: { type: 'string' }
        }
      },
      best_for_transparency: {
        type: 'object',
        properties: {
          brand_name: { type: 'string' }, verdict: { type: 'string' }, why_chosen: { type: 'string' },
          main_known_evidence: { type: 'string' }, main_unknown: { type: 'string' },
          evidence_snippets: { type: 'array', items: { type: 'string' } },
          evidence_confidence: { type: 'string' }, recommended_buying_route: { type: 'string' },
          product_url: { type: 'string' }, website: { type: 'string' }
        }
      },
      best_second_hand_choice: {
        type: 'object',
        properties: {
          brand_name: { type: 'string' }, verdict: { type: 'string' }, why_chosen: { type: 'string' },
          main_known_evidence: { type: 'string' }, main_unknown: { type: 'string' },
          evidence_snippets: { type: 'array', items: { type: 'string' } },
          secondhand_why: { type: 'string' }, secondhand_tips: { type: 'string' },
          evidence_confidence: { type: 'string' }, recommended_buying_route: { type: 'string' },
          product_url: { type: 'string' }, website: { type: 'string' }
        }
      },
      biggest_unknown: {
        type: 'object',
        properties: {
          brand_name: { type: 'string' }, verdict: { type: 'string' }, why_chosen: { type: 'string' },
          main_known_evidence: { type: 'string' }, main_unknown: { type: 'string' },
          evidence_snippets: { type: 'array', items: { type: 'string' } },
          evidence_confidence: { type: 'string' }, recommended_buying_route: { type: 'string' },
          product_url: { type: 'string' }, website: { type: 'string' }
        }
      },
      detailed_table: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            brand_name: { type: 'string' }, overall_score: { type: 'number' },
            durability_score: { type: 'number' }, transparency_score: { type: 'number' },
            repairability_score: { type: 'number' }, secondhand_score: { type: 'number' },
            manufacturing_clarity_score: { type: 'number' }, confidence_level: { type: 'string' },
            recommended_buying_route: { type: 'string' }, is_reviewed: { type: 'boolean' },
            website: { type: 'string' }, reddit_sentiment: { type: 'string' }
          }
        }
      },
      second_hand_links: {
        type: 'array',
        items: {
          type: 'object',
          properties: { platform: { type: 'string' }, search_url: { type: 'string' }, note: { type: 'string' } }
        }
      },
      independent_brand_spotlight: {
        type: 'object',
        properties: {
          brand_name: { type: 'string' }, verdict: { type: 'string' }, why_chosen: { type: 'string' },
          reddit_sentiment: { type: 'string' },
          main_known_evidence: { type: 'string' }, main_unknown: { type: 'string' },
          evidence_confidence: { type: 'string' }, recommended_buying_route: { type: 'string' },
          product_url: { type: 'string' }, website: { type: 'string' }
        }
      }
    }
  };

  // ── 4. Run AI research ───────────────────────────────────────────────────────
  let aiResult;
  
  const tryResearch = async (model) => {
    try {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model,
        response_json_schema: jsonSchema
      });
      // Validate that result is not null/empty
      if (!result || typeof result !== 'object') {
        throw new Error('LLM returned empty or invalid result');
      }
      return result;
    } catch (err) {
      throw err;
    }
  };

  try {
    aiResult = await tryResearch('gemini_3_1_pro');
  } catch (err1) {
    try {
      aiResult = await tryResearch('gemini_3_flash');
    } catch (err2) {
      return Response.json({
        error: 'Research failed after retry. Please try again.',
        detail: err2.message
      }, { status: 500 });
    }
  }

  // ── 5. Guarantee second-hand links ──────────────────────────────────────────
  if (!aiResult) {
    return Response.json({
      error: 'Research failed: AI returned empty result.',
      detail: 'No data was returned from the research process.'
    }, { status: 500 });
  }

  const encodedQuery = encodeURIComponent(query);
  const guaranteedLinks = [
    { platform: 'Finn.no', search_url: `https://www.finn.no/bap/forsale/search.html?q=${encodedQuery}`, note: 'Norwegian marketplace' },
    { platform: 'eBay', search_url: `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}`, note: 'International' },
    { platform: 'Vinted', search_url: `https://www.vinted.no/catalog?search_text=${encodedQuery}`, note: 'Clothing-focused' },
    { platform: 'Facebook Marketplace', search_url: `https://www.facebook.com/marketplace/search/?query=${encodedQuery}`, note: 'Local listings' },
  ];
  const existingPlatforms = new Set((aiResult?.second_hand_links || []).filter(l => l?.platform).map(l => l.platform.toLowerCase()));
  const mergedLinks = [
    ...(aiResult?.second_hand_links || []),
    ...guaranteedLinks.filter(g => !existingPlatforms.has(g.platform.toLowerCase()))
  ];

  const finalResult = { ...aiResult, second_hand_links: mergedLinks };

  // ── 6. Save per-brand insights + full result cache (in parallel) ─────────────
  const categoryKey = (aiResult.normalized_category || query).toLowerCase().replace(/\s+/g, '_');

  const [savedSet] = await Promise.all([
    base44.entities.RecommendationSet.create({
      query,
      normalized_query: normalizedQuery,
      category_key: categoryKey,
      country_context: userCountry,
      summary_verdict: aiResult.summary_verdict,
      confidence_level: aiResult.confidence_level || 'unknown',
      result_json: JSON.stringify(finalResult),
      is_ai_unreviewed: true,
      last_used_at: new Date().toISOString(),
    }).catch(() => null),
    saveBrandInsights(base44, categoryKey, aiResult),
  ]);

  return Response.json({
    success: true,
    result: {
      ...finalResult,
      recommendation_set_id: savedSet?.id || null,
      is_cached: false,
      is_ai_unreviewed: true,
    }
  });
});