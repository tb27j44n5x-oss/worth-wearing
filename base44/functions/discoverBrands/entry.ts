import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { query, user_country } = await req.json();

  const prompt = `
You are a sustainability research agent for ClaimCheck. A user has searched for: "${query}"

Your job is to discover ALL relevant clothing brands — big, medium, small, and niche — that make products matching this search.

CRITICAL: Do NOT only list obvious large brands. Actively search for and include:
- Small European brands
- Niche outdoor brands
- Norwegian/Nordic brands if relevant
- Independent makers with strong sustainability signals
- Lesser-known brands doing genuinely good work

For wetsuits also include: Patagonia, Finisterre, Picture Organic, Two Thirds, Vissla, Matuse, Srface, Isurus, Rip Curl (for sustainability efforts), and any small wetsuit makers.

For each brand, assess its likely sustainability profile based on what you know or can find.

User is located in: ${user_country || 'Norway'}

ALSO FIND:
- Direct product links (URLs) to the actual specific product pages that match "${query}" on each brand's website (e.g. link to the exact product page, not just the homepage). Only include links you are confident are real and specific to the product.
- Second-hand product listings: find direct search URLs for "${query}" on second-hand platforms relevant to ${user_country || 'Norway'} such as Finn.no, eBay, Vinted, Facebook Marketplace, Tradera, Blocket, DBA. The URL should have the search query pre-filled so the user lands on relevant results.

OUTPUT JSON:
{
  "search_query": string,
  "product_category": string,
  "brands": [
    {
      "name": string,
      "website": string,
      "country": string,
      "size_estimate": "small"|"medium"|"large"|"niche",
      "categories": string[],
      "description": string (1-2 sentences),
      "why_shown": string (why this brand is relevant to the search),
      "preliminary_grade": "A+"|"A"|"A-"|"B+"|"B"|"B-"|"C+"|"C"|"C-"|"D"|"F"|"unknown",
      "preliminary_confidence": "high"|"medium"|"low"|"unknown",
      "standout_practice": string (one key thing this brand does well, if known),
      "main_concern": string (one key concern, if known),
      "second_hand_available": boolean,
      "is_small_brand_spotlight": boolean,
      "spotlight_reason": string,
      "result_group": "lower_impact"|"small_discovery"|"second_hand_first"|"repairable_durable"|"caution",
      "shipping_origin": string,
      "product_url": string (direct URL to the specific product matching the search on this brand's site, or empty string if not found)
    }
  ],
  "product_links": [
    {
      "brand": string,
      "product_name": string,
      "url": string,
      "price_approx": string,
      "note": string
    }
  ],
  "second_hand_links": [
    {
      "platform": string,
      "search_url": string,
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
              note: { type: 'string' }
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

  return Response.json({ success: true, data: result });
});