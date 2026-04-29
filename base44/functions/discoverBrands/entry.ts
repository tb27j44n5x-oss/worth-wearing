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
      "shipping_origin": string
    }
  ],
  "second_hand_suggestions": [
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
              shipping_origin: { type: 'string' }
            }
          }
        },
        second_hand_suggestions: {
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