import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'internal.',
  '192.168.',
  '10.0.',
  '172.16.'
];

/**
 * Validate source URL format
 */
function validateSourceURL(url) {
  if (!url) return true; // null/empty URLs are ok
  try {
    const parsed = new URL(url);
    // Check protocol
    if (!parsed.protocol.startsWith('http')) return false;
    // Check hostname against blocked domains
    const hostname = parsed.hostname;
    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname.includes(blocked)) return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { brand_name, brand_website, category, user_country } = await req.json();
  
  // Validate brand_website URL
  if (brand_website && !validateSourceURL(brand_website)) {
    return Response.json({ error: 'Invalid or blocked website URL' }, { status: 400 });
  }

  const researchPrompt = `
You are a rigorous sustainability research agent for ClaimCheck — a platform that helps consumers find lower-impact clothing choices.

Your job is to deeply research the brand "${brand_name}" (website: ${brand_website || 'unknown'}) for the product category: "${category}".

CRITICAL RULES:
- Be skeptical. Brand-owned claims are claims, not proof.
- Treat vague terms like "eco-conscious", "planet-friendly", "responsible", "green" as weak unless supported by specific evidence.
- Do NOT assume a brand is bad because data is missing. Separate lack of evidence from evidence of bad practice.
- Do NOT assume a brand is good because it has polished sustainability marketing.
- Small brands must NOT be penalised for lacking annual reports. Look for genuine signals: repair policies, transparent materials, local sourcing, product durability, customer feedback.
- Use careful language: "Based on available evidence", "Limited evidence for", "Unverified claim", "Potential concern".
- Do NOT say a brand is "the most sustainable" or make absolute claims.
- Include Reddit, forums, customer reviews as anecdotal evidence signals (label them as such).
- Actively search for small and niche brands beyond the obvious big names.

RESEARCH SCOPE:
1. Materials & Fabric: fabric types, recycled vs virgin, organic/regenerative, chemical treatment, dyeing, microplastics, durability, end-of-life. For wetsuits: petroleum vs limestone neoprene vs natural rubber, solvent-free lamination.
2. Supply Chain Transparency: factory disclosure, fabric mill, raw material origin, supplier lists, specificity of claims.
3. CO2 / Climate: published emissions, Scope 1/2/3, manufacturing location, fabric origin, shipping origin, distance to ${user_country || 'Norway'}. Use ranges where exact data unavailable. Do NOT fake precision.
4. Worker Conditions: factory conditions, labour standards, living wage, supplier audits, certifications, known controversies.
5. Repairability & Warranty: warranty length, repair service, repair cost, ease of repair process, customer repair feedback, spare parts.
6. Quality & Durability: customer feedback, long-term durability, common failure points, design longevity vs trend-based.
7. Circularity & Second-Hand: second-hand availability, resale value, take-back schemes, recyclability.
8. Consumption Model: encourages overconsumption? constant new drops? made-to-order? timeless design?

ALSO RESEARCH:
- Whether buying this brand second-hand is a better option
- Whether there are lesser-known alternatives worth discovering in this category
- Whether the brand ships to/from Europe or has EU warehouse (relevant for ${user_country || 'Norway'})

OUTPUT FORMAT (JSON):
{
  "brand_name": string,
  "category": string,
  "overall_grade": "A+"|"A"|"A-"|"B+"|"B"|"B-"|"C+"|"C"|"C-"|"D"|"F",
  "evidence_confidence": "high"|"medium"|"low"|"unknown",
  "short_summary": string (2-3 sentences, careful language),
  "standout_practices": string[] (specific, evidence-backed),
  "concerns": string[] (specific, with evidence strength noted),
  "unknowns": string[] (what we could not find),
  "recommendation": string (argued recommendation),
  "material_score": number (0-10),
  "material_argument": string,
  "transparency_score": number (0-10),
  "transparency_argument": string,
  "climate_score": number (0-10),
  "climate_argument": string,
  "worker_score": number (0-10),
  "worker_argument": string,
  "repair_score": number (0-10),
  "repair_argument": string,
  "durability_score": number (0-10),
  "durability_argument": string,
  "circularity_score": number (0-10),
  "circularity_argument": string,
  "consumption_model_score": number (0-10),
  "consumption_argument": string,
  "repair_warranty_review": string,
  "quality_durability_review": string,
  "second_hand_notes": string,
  "country_context": string (shipping/practical context for ${user_country || 'Norway'}),
  "shipping_origin": string,
  "sources": [{ "url": string, "title": string, "source_type": "brand_owned"|"third_party"|"certification"|"media"|"forum"|"customer_review", "reliability": "high"|"medium"|"low" }],
  "is_small_brand_spotlight": boolean,
  "spotlight_reason": string
}
`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: researchPrompt,
    add_context_from_internet: true,
    model: 'gemini_3_1_pro',
    response_json_schema: {
      type: 'object',
      properties: {
        brand_name: { type: 'string' },
        category: { type: 'string' },
        overall_grade: { type: 'string' },
        evidence_confidence: { type: 'string' },
        short_summary: { type: 'string' },
        standout_practices: { type: 'array', items: { type: 'string' } },
        concerns: { type: 'array', items: { type: 'string' } },
        unknowns: { type: 'array', items: { type: 'string' } },
        recommendation: { type: 'string' },
        material_score: { type: 'number' },
        material_argument: { type: 'string' },
        transparency_score: { type: 'number' },
        transparency_argument: { type: 'string' },
        climate_score: { type: 'number' },
        climate_argument: { type: 'string' },
        worker_score: { type: 'number' },
        worker_argument: { type: 'string' },
        repair_score: { type: 'number' },
        repair_argument: { type: 'string' },
        durability_score: { type: 'number' },
        durability_argument: { type: 'string' },
        circularity_score: { type: 'number' },
        circularity_argument: { type: 'string' },
        consumption_model_score: { type: 'number' },
        consumption_argument: { type: 'string' },
        repair_warranty_review: { type: 'string' },
        quality_durability_review: { type: 'string' },
        second_hand_notes: { type: 'string' },
        country_context: { type: 'string' },
        shipping_origin: { type: 'string' },
        sources: { type: 'array', items: { type: 'object' } },
        is_small_brand_spotlight: { type: 'boolean' },
        spotlight_reason: { type: 'string' }
      }
    }
  });

  return Response.json({ success: true, report: result });
});