import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { brand_id, brand_name, brand_website } = await req.json();

  if (!brand_id || !brand_website) {
    return Response.json({ error: 'brand_id and brand_website required' }, { status: 400 });
  }

  const crawlPrompt = `
You are analyzing the sustainability transparency of a brand's website.

Brand: ${brand_name}
Website: ${brand_website}

Visit and analyze these key pages (if they exist):
- About / Story / Mission
- Impact / Sustainability / Environmental commitment
- Transparency / Supply chain / Factory disclosure
- Repair / Warranty / Product care
- Circular / Take-back / Recycling programs
- Blog / Journal (look for founder notes about limitations)
- Press / News / Reports

EXTRACT (if found):
1. **Factory Information**: Named factories, locations, factory visit evidence
2. **Founder/Leadership Notes**: Direct quotes showing honest discussion of limitations
3. **Repair Programs**: Existence, description, URL
4. **Circular Initiatives**: Take-back schemes, recycling, design-for-longevity
5. **Transparency Statements**: Quotes about what they know/don't know
6. **Material Sourcing**: Fabric sources, certifications
7. **Worker Practices**: Wage info, working condition details, certifications
8. **Honest Limitations**: Places where brand admits gaps ("we're not there yet", "we couldn't afford X")

SCORE transparency (0-10):
- 10: Names factories, publishes wages, admits limitations, specific details
- 8: Named factories, some specifics, some honesty about gaps
- 6: Some transparency but vague, mostly brand claims
- 4: Glossy sustainability page with few specifics
- 2: Minimal info, mostly marketing
- 0: No transparency found

RED FLAGS (greenwashing indicators):
- Factories unnamed / locations withheld
- Vague language ("ethical", "sustainable" without definition)
- Staged imagery without substance
- No repair/durability info despite sustainability claims
- Contradictions between pages

OUTPUT as JSON:
{
  "crawled_pages": [
    { "url": "...", "title": "...", "content_summary": "...", "page_type": "..." }
  ],
  "key_findings": {
    "factory_information": { "named_factories": [...], "locations": [...], "factory_visit_evidence": true/false },
    "founder_notes": "...",
    "repair_programs": { "exists": true/false, "description": "...", "url": "..." },
    "circular_initiatives": "...",
    "transparency_statements": ["..."],
    "material_sourcing": "...",
    "worker_practices": "...",
    "honest_limitations": ["..."]
  },
  "small_brand_transparency_score": 7,
  "transparency_breakdown": {
    "factory_transparency": 8,
    "founder_honesty": 7,
    "supply_chain_detail": 6,
    "repair_clarity": 9,
    "sustainability_specificity": 6
  },
  "red_flags": ["..."],
  "crawl_status": "success",
  "pages_crawled": 5,
  "crawl_notes": "..."
}
`;

  try {
    const crawlResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: crawlPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          crawled_pages: { type: 'array', items: { type: 'object' } },
          key_findings: { type: 'object' },
          small_brand_transparency_score: { type: 'number' },
          transparency_breakdown: { type: 'object' },
          red_flags: { type: 'array', items: { type: 'string' } },
          crawl_status: { type: 'string' },
          pages_crawled: { type: 'number' },
          crawl_notes: { type: 'string' }
        }
      }
    });

    const crawlRecord = await base44.asServiceRole.entities.BrandWebsiteCrawl.create({
      brand_id,
      brand_name,
      brand_website,
      crawled_pages: crawlResult.crawled_pages || [],
      key_findings: crawlResult.key_findings || {},
      small_brand_transparency_score: crawlResult.small_brand_transparency_score || 0,
      transparency_breakdown: crawlResult.transparency_breakdown || {},
      red_flags: crawlResult.red_flags || [],
      crawl_status: crawlResult.crawl_status || 'success',
      pages_crawled: crawlResult.pages_crawled || 0,
      crawl_date: new Date().toISOString(),
      next_crawl_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      crawl_notes: crawlResult.crawl_notes || ''
    });

    return Response.json({ success: true, crawl_record: crawlRecord });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});