import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { query, country, preference, budget } = await req.json();

  if (!query) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  const userCountry = country || 'Norway';

  // ── 1. Check cache ──────────────────────────────────────────────────────────
  // Normalize the query to a simple key for cache lookup
  const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').trim();

  const existing = await base44.asServiceRole.entities.RecommendationSet.filter({ normalized_query: normalizedQuery });

  if (existing.length > 0) {
    const cached = existing[0];
    // Update last_used_at in background (don't await)
    base44.asServiceRole.entities.RecommendationSet.update(cached.id, {
      last_used_at: new Date().toISOString()
    }).catch(() => {});

    let parsedResult;
    try {
      parsedResult = JSON.parse(cached.result_json);
    } catch (_) {
      parsedResult = null;
    }

    if (parsedResult) {
      return Response.json({
        success: true,
        result: {
          ...parsedResult,
          is_cached: true,
          is_ai_unreviewed: cached.is_ai_unreviewed,
          last_researched_at: cached.updated_date,
        }
      });
    }
  }

  // ── 2. Run AI research ──────────────────────────────────────────────────────
  const budgetNote = budget === 'low' ? 'Focus on affordable options under €150.' :
    budget === 'premium' ? 'Include premium/high-end options €300+.' :
    'Mid-range options €100–300.';

  const preferenceNote = preference === 'secondhand' ? 'User prefers to buy second-hand. Prioritise second-hand availability and resale value.' :
    preference === 'new' ? 'User wants to buy new.' :
    'User is open to buying new or second-hand.';

  const prompt = `
You are a rigorous sustainability buying advisor for ClaimCheck. A user in ${userCountry} is looking for: "${query}".

Context:
- ${preferenceNote}
- ${budgetNote}
- Be skeptical. Separate verified evidence from brand marketing.
- Use careful language: "Based on available evidence", "Limited evidence", "Unverified claim".
- Do NOT assume a brand is bad because data is missing. Separate lack of evidence from evidence of bad practice.
- Small brands should NOT be penalised for lacking big sustainability reports.
- Score each brand on: overall (0-10), durability (0-10), transparency (0-10), repairability (0-10), secondhand availability (0-10), manufacturing clarity (0-10).
- Confidence levels: "high" = verified third-party evidence, "medium" = partial evidence, "low" = mostly brand claims or little info, "unknown" = insufficient data.

YOUR TASKS:
1. Identify the product category from the query (e.g. "waterproof shell jacket", "5mm wetsuit", "merino base layer").
2. Research 8-15 relevant brands making this product — including niche, small, and European brands, not just big names.
3. For each brand, look for: durability evidence, supply chain transparency, repair/warranty policy, second-hand availability, manufacturing location.
4. For the TOP brands, try to find a direct product URL for "${query}" on their website.
5. Generate second-hand marketplace search links.

IMPORTANT SCORING RULES:
- Scores reflect evidence quality, not just marketing claims.
- A brand with excellent durability evidence but weak transparency gets high durability, low transparency.
- "recommended_buying_route": "buy_new" | "buy_secondhand" | "research_further"

TONE RULES:
- Write like a trusted friend who has done the research, not a marketing machine.
- Be honest about what is not known. Uncertainty is not weakness — hiding it is.
- "second_hand_advice" should be practical and specific: where to look, what to search, what to watch out for.
- "evidence_snippets" are concrete, citable facts — not summaries. E.g. "Patagonia publishes a full supplier list at patagonia.com/sourcing."

OUTPUT as JSON:
{
  "normalized_category": string (e.g. "waterproof shell jacket"),
  "summary_verdict": string (2-3 sentences, what the user should know before buying — honest, direct, no fluff),
  "confidence_level": "high"|"medium"|"low"|"unknown",
  "confidence_explanation": string (1-2 sentences explaining WHY this confidence level — what sources exist, what is missing),
  "evidence_notes": string (explain what sources were available, what is uncertain),
  "what_we_know": string[] (3-5 concrete things we found solid evidence for, across all brands researched),
  "what_we_dont_know": string[] (3-5 specific gaps — what data is missing, what brands hide, what is unverifiable),
  "second_hand_advice": string (2-3 sentences of practical, specific advice for buying this product type second-hand — what to look for, what to avoid, best platforms for this category),
  "best_overall": {
    "brand_name": string,
    "verdict": string (honest, direct — what makes this brand the best overall option),
    "why_chosen": string,
    "main_known_evidence": string (the most solid evidence for this brand),
    "main_unknown": string (the biggest thing we could not verify),
    "evidence_snippets": string[] (1-3 specific, citable facts — e.g. "Brand X publishes full factory list at..."),
    "evidence_confidence": "high"|"medium"|"low"|"unknown",
    "recommended_buying_route": string,
    "product_url": string,
    "website": string
  },
  "best_for_durability": { same shape as best_overall },
  "best_for_transparency": { same shape as best_overall },
  "best_second_hand_choice": { same shape as best_overall, plus: "secondhand_why": string (why this brand is particularly good value second-hand), "secondhand_tips": string (what to look for when buying this brand used) },
  "biggest_unknown": {
    "brand_name": string,
    "verdict": string,
    "why_chosen": string (why this brand is interesting despite unknowns),
    "main_known_evidence": string,
    "main_unknown": string,
    "evidence_snippets": string[],
    "evidence_confidence": "high"|"medium"|"low"|"unknown",
    "recommended_buying_route": string,
    "product_url": string,
    "website": string
  },
  "detailed_table": [
    {
      "brand_name": string,
      "overall_score": number,
      "durability_score": number,
      "transparency_score": number,
      "repairability_score": number,
      "secondhand_score": number,
      "manufacturing_clarity_score": number,
      "confidence_level": "high"|"medium"|"low"|"unknown",
      "recommended_buying_route": string,
      "is_reviewed": false,
      "website": string
    }
  ],
  "second_hand_links": [
    { "platform": string, "search_url": string, "note": string }
  ]
}
`;

  const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    model: 'gemini_3_1_pro',
    response_json_schema: {
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
            brand_name: { type: 'string' },
            verdict: { type: 'string' },
            why_chosen: { type: 'string' },
            main_known_evidence: { type: 'string' },
            main_unknown: { type: 'string' },
            evidence_snippets: { type: 'array', items: { type: 'string' } },
            evidence_confidence: { type: 'string' },
            recommended_buying_route: { type: 'string' },
            product_url: { type: 'string' },
            website: { type: 'string' }
          }
        },
        best_for_durability: {
          type: 'object',
          properties: {
            brand_name: { type: 'string' },
            verdict: { type: 'string' },
            why_chosen: { type: 'string' },
            main_known_evidence: { type: 'string' },
            main_unknown: { type: 'string' },
            evidence_snippets: { type: 'array', items: { type: 'string' } },
            evidence_confidence: { type: 'string' },
            recommended_buying_route: { type: 'string' },
            product_url: { type: 'string' },
            website: { type: 'string' }
          }
        },
        best_for_transparency: {
          type: 'object',
          properties: {
            brand_name: { type: 'string' },
            verdict: { type: 'string' },
            why_chosen: { type: 'string' },
            main_known_evidence: { type: 'string' },
            main_unknown: { type: 'string' },
            evidence_snippets: { type: 'array', items: { type: 'string' } },
            evidence_confidence: { type: 'string' },
            recommended_buying_route: { type: 'string' },
            product_url: { type: 'string' },
            website: { type: 'string' }
          }
        },
        best_second_hand_choice: {
          type: 'object',
          properties: {
            brand_name: { type: 'string' },
            verdict: { type: 'string' },
            why_chosen: { type: 'string' },
            main_known_evidence: { type: 'string' },
            main_unknown: { type: 'string' },
            evidence_snippets: { type: 'array', items: { type: 'string' } },
            secondhand_why: { type: 'string' },
            secondhand_tips: { type: 'string' },
            evidence_confidence: { type: 'string' },
            recommended_buying_route: { type: 'string' },
            product_url: { type: 'string' },
            website: { type: 'string' }
          }
        },
        biggest_unknown: {
          type: 'object',
          properties: {
            brand_name: { type: 'string' },
            verdict: { type: 'string' },
            why_chosen: { type: 'string' },
            main_known_evidence: { type: 'string' },
            main_unknown: { type: 'string' },
            evidence_snippets: { type: 'array', items: { type: 'string' } },
            evidence_confidence: { type: 'string' },
            recommended_buying_route: { type: 'string' },
            product_url: { type: 'string' },
            website: { type: 'string' }
          }
        },
        detailed_table: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              brand_name: { type: 'string' },
              overall_score: { type: 'number' },
              durability_score: { type: 'number' },
              transparency_score: { type: 'number' },
              repairability_score: { type: 'number' },
              secondhand_score: { type: 'number' },
              manufacturing_clarity_score: { type: 'number' },
              confidence_level: { type: 'string' },
              recommended_buying_route: { type: 'string' },
              is_reviewed: { type: 'boolean' },
              website: { type: 'string' }
            }
          }
        },
        second_hand_links: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              platform: { type: 'string' },
              search_url: { type: 'string' },
              note: { type: 'string' }
            }
          }
        }
      }
    }
  });

  // ── 3. Guarantee second-hand links ──────────────────────────────────────────
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

  // ── 4. Cache result ─────────────────────────────────────────────────────────
  base44.asServiceRole.entities.RecommendationSet.create({
    query,
    normalized_query: normalizedQuery,
    category_key: (aiResult.normalized_category || query).toLowerCase().replace(/\s+/g, '_'),
    country_context: userCountry,
    summary_verdict: aiResult.summary_verdict,
    confidence_level: aiResult.confidence_level || 'unknown',
    result_json: JSON.stringify(finalResult),
    is_ai_unreviewed: true,
    last_used_at: new Date().toISOString(),
  }).catch(() => {});

  return Response.json({
    success: true,
    result: {
      ...finalResult,
      is_cached: false,
      is_ai_unreviewed: true,
    }
  });
});