import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { query, user_country } = await req.json();
  const country = user_country || 'Norway';

  const prompt = `
You are a sustainability research agent for ClaimCheck. A user has searched for: "${query}"
User is located in: ${country}

YOUR TWO JOBS:

═══ JOB 1: FIND BRANDS ═══
Find ALL relevant clothing/gear brands — big, medium, small, and niche — that make products matching "${query}".

CRITICAL: Do NOT only list obvious large brands. Actively search for and include:
- Small European/Nordic/independent brands
- Niche specialist brands in this category
- Lesser-known brands doing genuinely good work
- Any brand with notable sustainability signals

For each brand, assess its likely sustainability profile.

For each brand, try to find the DIRECT URL to their specific product page for "${query}" (not just their homepage). If you find it, include it as product_url. Construct likely product URLs based on the brand's website structure if needed.

═══ JOB 2: FIND SHOPPING LINKS ═══
This is MANDATORY. You MUST generate these links for every search.

A) NEW product links — Find 4-8 direct product or category pages for "${query}" on brand websites and/or reputable retailers. These should be real, working URLs that go to the specific product or search results for this item. Examples of what a good URL looks like:
  - https://www.patagonia.com/search/?q=wetsuit
  - https://www.finisterre.com/collections/wetsuits
  - https://www.outnorth.no/sok?q=votter

B) SECOND-HAND search links — Generate working search URLs on second-hand marketplaces, pre-filled with "${query}" as the search term. Use these exact URL patterns:
  - Finn.no: https://www.finn.no/bap/forsale/search.html?q=${encodeURIComponent(query)}
  - eBay: https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}
  - Vinted: https://www.vinted.no/catalog?search_text=${encodeURIComponent(query)}
  - Facebook Marketplace: https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(query)}
  - Tradera (SE): https://www.tradera.com/search?q=${encodeURIComponent(query)}
  - Blocket (SE): https://www.blocket.se/annonser/hela_sverige/fritid_hobby?q=${encodeURIComponent(query)}

Always include at least Finn.no, eBay, and Vinted in second_hand_links. Add others if relevant.

OUTPUT JSON:
{
  "search_query": "${query}",
  "product_category": string (normalized category name),
  "brands": [
    {
      "name": string,
      "website": string,
      "country": string,
      "size_estimate": "small"|"medium"|"large"|"niche",
      "categories": string[],
      "description": string (1-2 sentences),
      "why_shown": string (why this brand is relevant to "${query}"),
      "preliminary_grade": "A+"|"A"|"A-"|"B+"|"B"|"B-"|"C+"|"C"|"C-"|"D"|"F"|"unknown",
      "preliminary_confidence": "high"|"medium"|"low"|"unknown",
      "standout_practice": string,
      "main_concern": string,
      "second_hand_available": boolean,
      "is_small_brand_spotlight": boolean,
      "spotlight_reason": string,
      "result_group": "lower_impact"|"small_discovery"|"second_hand_first"|"repairable_durable"|"caution",
      "shipping_origin": string,
      "product_url": string (direct URL to specific product page for "${query}", or empty string)
    }
  ],
  "product_links": [
    {
      "brand": string,
      "product_name": string (describe what the link leads to, e.g. "Patagonia R1 Wetsuit collection"),
      "url": string (real, working URL),
      "price_approx": string,
      "note": string,
      "is_sustainable_retailer": boolean
    }
  ],
  "second_hand_links": [
    {
      "platform": string,
      "search_url": string (pre-filled search URL for "${query}"),
      "note": string
    }
  ]
}
`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    model: 'gemini_3_1_pro',
    response_json_schema: {
      type: 'object',
      properties: {
        search_query: { type: 'string' },
        product_category: { type: 'string' },
        brands: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              website: { type: 'string' },
              country: { type: 'string' },
              size_estimate: { type: 'string' },
              categories: { type: 'array', items: { type: 'string' } },
              description: { type: 'string' },
              why_shown: { type: 'string' },
              preliminary_grade: { type: 'string' },
              preliminary_confidence: { type: 'string' },
              standout_practice: { type: 'string' },
              main_concern: { type: 'string' },
              second_hand_available: { type: 'boolean' },
              is_small_brand_spotlight: { type: 'boolean' },
              spotlight_reason: { type: 'string' },
              result_group: { type: 'string' },
              shipping_origin: { type: 'string' },
              product_url: { type: 'string' }
            }
          }
        },
        product_links: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              brand: { type: 'string' },
              product_name: { type: 'string' },
              url: { type: 'string' },
              price_approx: { type: 'string' },
              note: { type: 'string' },
              is_sustainable_retailer: { type: 'boolean' }
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

  // Guarantee second-hand links are always present using known-good URL patterns
  const encodedQuery = encodeURIComponent(query);
  const guaranteedSecondHand = [
    { platform: 'Finn.no', search_url: `https://www.finn.no/bap/forsale/search.html?q=${encodedQuery}`, note: 'Norwegian marketplace' },
    { platform: 'eBay', search_url: `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}`, note: 'International' },
    { platform: 'Vinted', search_url: `https://www.vinted.no/catalog?search_text=${encodedQuery}`, note: 'Clothing-focused' },
    { platform: 'Facebook Marketplace', search_url: `https://www.facebook.com/marketplace/search/?query=${encodedQuery}`, note: 'Local listings' },
  ];

  // Merge: keep AI-generated ones, add guaranteed ones for platforms not already present
  const existingPlatforms = new Set((result.second_hand_links || []).map(l => l.platform.toLowerCase()));
  const merged = [
    ...(result.second_hand_links || []),
    ...guaranteedSecondHand.filter(g => !existingPlatforms.has(g.platform.toLowerCase()))
  ];

  return Response.json({ success: true, data: { ...result, second_hand_links: merged } });
});