import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { query, country, preference, budget } = await req.json();

  if (!query) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  const userCountry = country || 'Norway';

  // ── 1. Check cache ──────────────────────────────────────────────────────────
  // Normalize aggressively so cache hits reliably (strip plurals, sort words, etc.)
  const normalizedQuery = query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(a|an|the|for|and|or|with|in|of|best|good|cheap|quality)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .sort()
    .join('_');

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

  // ── 2. Build prompt ─────────────────────────────────────────────────────────
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

YOUR TASKS:
1. Identify the product category from the query.
2. Research 8-10 relevant brands — MUST include a mix of well-known brands AND small/independent brands.
3. For each brand: durability evidence, supply chain transparency, repair/warranty policy, secondhand availability, manufacturing location.
4. For top brands, find a direct product URL for "${query}" on their website.
5. REDDIT RESEARCH (MANDATORY): For each shortlisted brand, search Reddit (r/BuyItForLife, r/MaleFashionAdvice, r/femalefashionadvice, r/Fitness, r/Ultralight, r/skiing, r/surfing, r/Wetsuit or relevant subreddits) for genuine user sentiment. Note specific praised strengths AND complaints about quality, durability, customer service, or greenwashing.

SMALL BRAND DEEP RESEARCH (MANDATORY):
You MUST identify at least one small/independent brand for "independent_brand_spotlight". This is a brand NOT in the same league as Norrøna, Rab, Houdini, Peak Performance, Patagonia, Arc'teryx, Fjällräven, Mammut, or similar large established brands.

For the small brand spotlight, you MUST actively visit their website and look for:
- Pages titled: "Our story", "Impact", "Transparency", "How we make it", "Materials", "Supply chain", "Factory visits", "Pricing breakdown", "B Corp journey", "Our footprint"
- Blog posts or journal entries where founders or team members discuss trade-offs, challenges, or limitations honestly
- Specific language like: "we're not there yet", "here's what we couldn't afford to fix", "we chose X even though Y would be better because Z"
- Named factories or production partners (even one named factory is significant for a small brand)
- Any pricing cost-breakdown transparency

SCORING FOR SMALL BRANDS — apply a different lens:
- A small brand that openly says "our zippers come from YKK but we're researching alternatives" scores HIGHER on transparency than a large brand with a glossy PDF that says nothing specific.
- A small brand that documents a factory visit on their blog scores HIGHER than a large brand with a vague "audited suppliers" claim.
- Do NOT penalise a small brand for not having Bluesign or Fair Trade certification — these cost tens of thousands of euros. Instead, reward honest acknowledgment of this gap.
- DO penalise greenwashing even from small brands — vague "eco-friendly" or "sustainable materials" claims with zero specifics are a red flag at any size.

why_chosen for the independent_brand_spotlight must quote or closely paraphrase SPECIFIC language found on their website — not generic praise. If you find a specific page or blog post where they discuss limitations, cite it.

TONE RULES:
- Write like a trusted friend who has done the research, not a corporate sustainability report.
- Be honest about unknowns. Uncertainty is not weakness — hiding it is.
- "second_hand_advice": practical, specific — where to look, what to check, what to avoid.
- "evidence_snippets": concrete citable facts only (e.g. "Patagonia publishes a full supplier list at patagonia.com/sourcing").
- reddit_sentiment: summarise what real users say — good and bad. Do not sanitise negative feedback.

Keep all text fields concise. Limit detailed_table to max 8 brands. Limit evidence_snippets to max 2 items per brand block.

OUTPUT as JSON:
{
  "normalized_category": string,
  "summary_verdict": string (2-3 sentences, honest and direct),
  "confidence_level": "high"|"medium"|"low"|"unknown",
  "confidence_explanation": string (1-2 sentences — WHY this confidence level),
  "evidence_notes": string,
  "what_we_know": string[] (3-4 concrete things with solid evidence),
  "what_we_dont_know": string[] (3-4 specific gaps),
  "second_hand_advice": string (2-3 sentences, practical),
  "best_overall": {
    "brand_name": string, "verdict": string, "why_chosen": string,
    "main_known_evidence": string, "main_unknown": string,
    "evidence_snippets": string[] (max 2),
    "evidence_confidence": "high"|"medium"|"low"|"unknown",
    "recommended_buying_route": "buy_new"|"buy_secondhand"|"research_further",
    "product_url": string, "website": string
  },
  "best_for_durability": { (same shape as best_overall) },
  "best_for_transparency": { (same shape as best_overall) },
  "best_second_hand_choice": {
    (same shape as best_overall, plus:)
    "secondhand_why": string, "secondhand_tips": string
  },
  "biggest_unknown": { (same shape as best_overall) },
  "detailed_table": [
    {
      "brand_name": string, "overall_score": number, "durability_score": number,
      "transparency_score": number, "repairability_score": number,
      "secondhand_score": number, "manufacturing_clarity_score": number,
      "confidence_level": "high"|"medium"|"low"|"unknown",
      "recommended_buying_route": string, "is_reviewed": false, "website": string
    }
  ],
  "second_hand_links": [
    { "platform": string, "search_url": string, "note": string }
  ],
  "independent_brand_spotlight": {
    "brand_name": string,
    "verdict": string,
    "why_chosen": string (why this small brand stands out — what they say honestly, not just what they claim),
    "reddit_sentiment": string (what Reddit/community says about them — positive AND negative),
    "main_known_evidence": string,
    "main_unknown": string,
    "evidence_confidence": "high"|"medium"|"low"|"unknown",
    "recommended_buying_route": "buy_new"|"buy_secondhand"|"research_further",
    "product_url": string,
    "website": string
  }
}

REDDIT SENTIMENT — for each brand block in detailed_table, also include:
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

  // ── 3. Run AI research (with retry on JSON failure) ─────────────────────────
  let aiResult;
  try {
    aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: jsonSchema
    });
  } catch (firstErr) {
    // Retry once with gemini as fallback
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

  // ── 4. Guarantee second-hand links ──────────────────────────────────────────
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

  // ── 5. Cache result ─────────────────────────────────────────────────────────
  const savedSet = await base44.asServiceRole.entities.RecommendationSet.create({
    query,
    normalized_query: normalizedQuery,
    category_key: (aiResult.normalized_category || query).toLowerCase().replace(/\s+/g, '_'),
    country_context: userCountry,
    summary_verdict: aiResult.summary_verdict,
    confidence_level: aiResult.confidence_level || 'unknown',
    result_json: JSON.stringify(finalResult),
    is_ai_unreviewed: true,
    last_used_at: new Date().toISOString(),
  }).catch(() => null);

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