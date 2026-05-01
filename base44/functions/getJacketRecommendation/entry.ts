import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BRAND_CACHE_TTL_DAYS = 90;

// Normalize query for cache key
function normalizeQuery(query) {
  return query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(a|an|the|for|and|or|with|in|of|best|good|cheap|quality)\b/g, '')
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

// Save brand insights from AI result into BrandCategoryInsight
async function saveBrandInsights(base44, categoryKey, aiResult) {
  const rows = aiResult.detailed_table || [];
  const now = new Date().toISOString();
  const refreshAt = new Date(Date.now() + BRAND_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const saves = rows.map(async (row) => {
    if (!row.brand_name) return;
    // Check for existing insight to update
    const existing = await base44.asServiceRole.entities.BrandCategoryInsight.filter({
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
      return base44.asServiceRole.entities.BrandCategoryInsight.update(existing[0].id, payload).catch(() => null);
    } else {
      return base44.asServiceRole.entities.BrandCategoryInsight.create({ ...payload, brand_id: row.brand_name.toLowerCase().replace(/\s+/g, '_') }).catch(() => null);
    }
  });

  await Promise.allSettled(saves);
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

  // ── 2. Load known brand insights for this category ───────────────────────────
  // Derive category key from query for brand lookup (best-effort before AI runs)
  const roughCategoryKey = normalizedQuery;

  const knownInsights = await base44.asServiceRole.entities.BrandCategoryInsight.filter({
    category_key: roughCategoryKey,
    is_current: true,
  }).catch(() => []);

  const freshInsights = knownInsights.filter(isBrandFresh);

  // Build the "already known" context block to inject into the prompt
  let knownBrandsContext = '';
  if (freshInsights.length > 0) {
    const lines = freshInsights.map(b => {
      return `- ${b.brand_name}: overall=${b.overall_score}, durability=${b.durability_score}, transparency=${b.transparency_score}, repairability=${b.repairability_score}, secondhand=${b.secondhand_score}, mfg_clarity=${b.manufacturing_clarity_score}, confidence=${b.confidence_level}, route=${b.recommended_buying_route}, website=${b.website}. Summary: ${b.summary_verdict || 'N/A'}`;
    });
    knownBrandsContext = `
PREVIOUSLY RESEARCHED BRANDS (valid for up to ${BRAND_CACHE_TTL_DAYS} days — do NOT re-research these from scratch):
The following brands have already been researched for the "${roughCategoryKey}" category. Re-use these scores and notes directly in your detailed_table output. Only update them if you have strong new contradicting evidence.

${lines.join('\n')}

For brands listed above: copy their scores into detailed_table as-is. Focus your live internet research time on brands NOT listed above, or on finding a product_url for the top picks.
`;
  }

  // ── 3. Build prompt ──────────────────────────────────────────────────────────
  const budgetNote = budget === 'low' ? 'Focus on affordable options under €150.' :
    budget === 'premium' ? 'Include premium/high-end options €300+.' :
    'Mid-range options €100–300.';

  const preferenceNote = preference === 'secondhand' ? 'User prefers second-hand. Prioritise secondhand availability and resale value.' :
    preference === 'new' ? 'User wants to buy new.' :
    'User is open to buying new or second-hand.';

  const prompt = `
You are a rigorous sustainability buying advisor for Worth Wearing. A user in ${userCountry} is looking for: "${query}".

Context:
- ${preferenceNote}
- ${budgetNote}
- Be skeptical. Separate verified evidence from brand marketing claims.
- Use careful language: "Based on available evidence", "Limited evidence", "Unverified claim".
- Do NOT assume a brand is bad because data is missing — separate lack of evidence from evidence of bad practice.
- Small/independent brands should NOT be penalised for lacking big sustainability reports or expensive certifications. What matters is honest, specific communication about what they know and don't know.
- For smaller brands: actively crawl their website for blog posts, founders' notes, factory pages, or pricing breakdowns that show genuine transparency — even imperfect transparency beats polished silence.
- Confidence levels: "high" = verified third-party evidence, "medium" = partial evidence or honest first-party specifics, "low" = mostly vague brand claims, "unknown" = insufficient data.
- WORKER TREATMENT IS A CORE SUSTAINABILITY METRIC. Research factory working conditions, wages, working hours, safety standards, union representation, and labor certification (Fair Trade, SA8000, etc.). Penalise brands with documented labor abuses or refusal to disclose factory conditions.

LIFECYCLE STAGE ANALYSIS (Required for all brands):
Evaluate each stage separately:
1. RAW MATERIAL: Fiber type (synthetic vs natural), certifications (GOTS, OEKO-TEX), water footprint, pesticide use, recyclability
2. MANUFACTURING: Location, energy sources, emissions, chemical processes, wastewater treatment, worker wages/conditions
3. TRANSPORT: Distance from ${userCountry}, shipping mode (air/sea), estimated CO2 (sea shipping ~20x lower CO2 than air)
4. USE/DURABILITY: Expected lifespan, user repair data, design-for-longevity, warranty policies, repairability
5. END-OF-LIFE: Recyclability, take-back programs, microfiber shedding, biodegradability, circular economy initiatives

EVIDENCE SOURCE WEIGHTING (Critical):
Weight sources by credibility, NOT equally:
- Third-party audit (9-10): Independent certifier, audited supply chain, verifiable claims
- Certification body (8-9): Official cert provider (GOTS, Fair Trade, Bluesign, SA8000)
- Brand transparency page (5-7): Published data, supply chain list, wage info (if detailed and specific)
- Brand marketing/PDF (3-4): Glossy claims without specifics, vague "ethical sourcing"
- News article (5-7): Depends on source quality; reputable outlets score higher
- Reddit (1-3): Self-selected opinions, unverified, extreme views; use only for "product popularity" NOT sustainability claims

When citing evidence, ALWAYS mention the source type and why you trust it. Flags greenwashing when:
- Brand makes claims but refuses to name factories
- Uses vague language ("eco-friendly" without definition)
- Has low credibility evidence but high confidence
- No independent verification available

WORKER ETHICS SCORE (0-10):
- 9-10: Published wage data, named factories, Fair Trade/SA8000 cert, union support
- 7-8: Named factories, decent working condition reports, active compliance monitoring
- 5-6: Audited suppliers but limited transparency, some wage info available
- 3-4: Vague "ethical sourcing" claims, no specific factory names
- 1-2: Documented labor violations, refusal to disclose, greenwashing on workers
- 0: Active labor abuse, forced labor evidence

GREENWASHING RISK FLAG:
Return "low" if: high confidence, weighted evidence, multiple independent sources
Return "medium" if: some conflicting info, mixed evidence credibility, limited transparency
Return "high" if: low confidence, only brand-owned sources, vague claims, zero independent verification

${knownBrandsContext}

YOUR TASKS:
1. Identify the product category from the query.
2. Research 8-10 relevant brands — MUST include a mix of well-known brands AND small/independent brands.
3. For each brand NOT already listed above: fabric/material type and environmental impact, durability evidence, supply chain transparency, repair/warranty policy, secondhand availability, manufacturing location (PROXIMITY TO ${userCountry} is important for transport CO2), AND FACTORY WORKER TREATMENT (wages, conditions, certifications, documented labor practices).
4. For top brands, find a direct product URL for "${query}" on their website.
5. REDDIT RESEARCH (MANDATORY for any brand NOT in the pre-researched list above): Search Reddit (r/BuyItForLife, r/MaleFashionAdvice, r/femalefashionadvice, r/Fitness, r/Ultralight, r/skiing, r/surfing, r/Wetsuit or relevant subreddits) for genuine user sentiment. Note specific praised strengths AND complaints about quality, durability, customer service, greenwashing, or labor practices.

SMALL BRAND DEEP RESEARCH (MANDATORY):
You MUST identify at least one small/independent brand for "independent_brand_spotlight". This is a brand NOT in the same league as Norrøna, Rab, Houdini, Peak Performance, Patagonia, Arc'teryx, Fjällräven, Mammut, or similar large established brands.

For the small brand spotlight, you MUST actively visit their website and look for:
- Pages titled: "Our story", "Impact", "Transparency", "How we make it", "Materials", "Supply chain", "Factory visits", "Pricing breakdown", "B Corp journey", "Our footprint"
- Blog posts or journal entries where founders or team members discuss trade-offs, challenges, or limitations honestly
- Specific language like: "we're not there yet", "here's what we couldn't afford to fix", "we chose X even though Y would be better because Z"
- Named factories or production partners with location data (proximity to ${userCountry} is a bonus)
- Fabric/material sourcing transparency and environmental impact claims
- Any pricing cost-breakdown transparency

SCORING FOR SMALL BRANDS — apply a different lens:
- A small brand that openly says "our zippers come from YKK but we're researching alternatives" scores HIGHER on transparency than a large brand with a glossy PDF that says nothing specific.
- A small brand that documents a factory visit on their blog scores HIGHER than a large brand with a vague "audited suppliers" claim.
- Do NOT penalise a small brand for not having Bluesign or Fair Trade certification — these cost tens of thousands of euros. Instead, reward honest acknowledgment of this gap.
- DO penalise greenwashing even from small brands — vague "eco-friendly" or "sustainable materials" claims with zero specifics are a red flag at any size.
- For worker treatment: a small brand that names its factories and publishes wage data or working condition notes scores HIGHER than a large brand claiming "ethical sourcing" with no specifics. Documented labor violations or refusal to disclose factory conditions are serious red flags at any size.
- TRANSPORT CO2: Be honest about CO2 calculations. Include these factors:
  * Manufacturing location distance from ${userCountry}
  * Shipping mode (air ~1000g CO2/kg, sea ~50g CO2/kg)
  * Supply chain origins (where raw materials come from)
  * Admit limitations: "Estimated based on typical sea shipping" vs "Calculated from published data"
  * Distinguish between "we found limited info" and "manufacturing is far so high CO2"

why_chosen for the independent_brand_spotlight must quote or closely paraphrase SPECIFIC language found on their website — not generic praise. If you find a specific page or blog post where they discuss limitations, cite it.

TONE RULES:
- Write like a trusted friend who has done the research, not a corporate sustainability report.
- Be honest about unknowns. Uncertainty is not weakness — hiding it is.
- "second_hand_advice": practical, specific — where to look, what to check, what to avoid.
- "evidence_snippets": concrete citable facts only (e.g. "Patagonia publishes a full supplier list at patagonia.com/sourcing").
- reddit_sentiment: summarise what real users say — good and bad. Do not sanitise negative feedback.
- Include worker treatment insights in all relevant sections. Brands that hide factory conditions or have documented labor abuses deserve skepticism.
- MATERIAL STAGE: Always specify fiber type, durability (years of expected use), certifications (credibility score), recyclability, toxins (dyes, PFOA, etc.), water footprint. Distinguish: 100% polyester that lasts 10 years can have LOWER total footprint than 100% organic cotton lasting 2 years.
- MANUFACTURING STAGE: Location, energy sources, chemical/dye processes, water treatment, worker wages/conditions (dedicated worker_score).
- TRANSPORT STAGE: Manufacturing origin distance, shipping mode, estimated CO2. Admit limits: "Assuming sea shipping" vs "Verified" mode.
- USE STAGE: Lifespan expectation, repair services, warranty, design-for-longevity, user durability data (from DurabilityLog entity).
- END-OF-LIFE STAGE: Recycling programs, take-back schemes, microfiber risk, biodegradability, circular economy design.
- SOURCE WEIGHTING: Cite source credibility. If a claim relies only on brand marketing, say "Brand claims (unverified)" not "Evidence shows..."

Keep all text fields concise. Limit detailed_table to max 8 brands. Limit evidence_snippets to max 2 items per brand block.

OUTPUT as JSON:
{
  "normalized_category": string,
  "summary_verdict": string (2-3 sentences, honest and direct),
  "confidence_level": "high"|"medium"|"low"|"unknown",
  "confidence_explanation": string (1-2 sentences — WHY this confidence level),
  "greenwashing_risk": "low"|"medium"|"high" (flag where confidence is low or sources are weak),
  "evidence_notes": string,
  "what_we_know": string[] (3-4 concrete things with solid evidence — cite source type),
  "what_we_dont_know": string[] (3-4 specific gaps),
  "second_hand_advice": string (2-3 sentences, practical),
  "best_overall": {
    "brand_name": string, "verdict": string, "why_chosen": string,
    "main_known_evidence": string, "main_unknown": string,
    "evidence_snippets": string[] (max 2, include source credibility),
    "evidence_confidence": "high"|"medium"|"low"|"unknown",
    "recommended_buying_route": "buy_new"|"buy_secondhand"|"research_further",
    "product_url": string, "website": string
  },
  "best_for_durability": { (same shape as best_overall) },
  "best_for_transparency": { (same shape as best_overall) },
  "best_for_worker_ethics": {
    (same shape as best_overall)
    "worker_score": number (0-10),
    "wage_transparency": string,
    "factory_conditions": string,
    "labor_certifications": string
  },
  "best_for_circular_economy": {
    (same shape as best_overall)
    "repair_programs": string,
    "take_back_schemes": string,
    "recycling_initiatives": string
  },
  "best_second_hand_choice": {
    (same shape as best_overall, plus:)
    "secondhand_why": string, "secondhand_tips": string
  },
  "biggest_unknown": { (same shape as best_overall) },
  "detailed_table": [
    {
      "brand_name": string,
      "overall_score": number,
      "material_score": number,
      "manufacturing_score": number,
      "worker_score": number,
      "durability_score": number,
      "transparency_score": number,
      "circularity_score": number,
      "confidence_level": "high"|"medium"|"low"|"unknown",
      "greenwashing_risk": "low"|"medium"|"high",
      "recommended_buying_route": string,
      "website": string
    }
  ],
  "lifecycle_stages": {
    "raw_material": string (fiber type, certifications, water/pesticide impact),
    "manufacturing": string (location, energy, emissions, worker practices),
    "transport": string (distance, mode, estimated CO2 with assumptions noted),
    "use_durability": string (lifespan, repair-ability, warranty),
    "end_of_life": string (recyclability, take-back, microfiber risk)
  },
  "second_hand_links": [
    { "platform": string, "search_url": string, "note": string }
  ],
  "independent_brand_spotlight": {
    "brand_name": string,
    "verdict": string,
    "why_chosen": string,
    "reddit_sentiment": string,
    "main_known_evidence": string,
    "main_unknown": string,
    "evidence_confidence": "high"|"medium"|"low"|"unknown",
    "recommended_buying_route": "buy_new"|"buy_secondhand"|"research_further",
    "product_url": string,
    "website": string
  }
}

REDDIT SENTIMENT — for each brand block in detailed_table NOT already in the pre-researched list, also include:
  "reddit_sentiment": string (1-2 sentences — what r/BuyItForLife and relevant subreddits actually say. Include specific praise AND complaints.)
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
  try {
    aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: jsonSchema
    });
  } catch (firstErr) {
    try {
      aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: jsonSchema
      });
    } catch (secondErr) {
      return Response.json({
        error: 'Research failed after retry. Please try again.',
        detail: secondErr.message
      }, { status: 500 });
    }
  }

  // ── 5. Guarantee second-hand links ──────────────────────────────────────────
  const encodedQuery = encodeURIComponent(query);
  const guaranteedLinks = [
    { platform: 'Finn.no', search_url: `https://www.finn.no/bap/forsale/search.html?q=${encodedQuery}`, note: 'Norwegian marketplace' },
    { platform: 'eBay', search_url: `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}`, note: 'International' },
    { platform: 'Vinted', search_url: `https://www.vinted.no/catalog?search_text=${encodedQuery}`, note: 'Clothing-focused' },
    { platform: 'Facebook Marketplace', search_url: `https://www.facebook.com/marketplace/search/?query=${encodedQuery}`, note: 'Local listings' },
  ];
  const existingPlatforms = new Set((aiResult.second_hand_links || []).filter(l => l?.platform).map(l => l.platform.toLowerCase()));
  const mergedLinks = [
    ...(aiResult.second_hand_links || []),
    ...guaranteedLinks.filter(g => !existingPlatforms.has(g.platform.toLowerCase()))
  ];

  const finalResult = { ...aiResult, second_hand_links: mergedLinks };

  // ── 6. Save per-brand insights + full result cache (in parallel) ─────────────
  const categoryKey = (aiResult.normalized_category || query).toLowerCase().replace(/\s+/g, '_');

  const [savedSet] = await Promise.all([
    base44.asServiceRole.entities.RecommendationSet.create({
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