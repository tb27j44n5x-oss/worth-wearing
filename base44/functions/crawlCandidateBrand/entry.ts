import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Pages to look for on brand websites
const EVIDENCE_PATHS = [
  '', '/about', '/story', '/our-story', '/sustainability', '/impact',
  '/materials', '/production', '/factory', '/repair', '/care',
  '/warranty', '/stockists', '/journal', '/blog', '/om-oss',
  '/barekraft', '/baerekraft', '/produksjon', '/reparasjon',
  '/hallbarhet', '/tillverkning', '/reparation',
];

async function tavilyExtract(url, apiKey) {
  const res = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      urls: [url],
      include_raw_content: false,
    }),
  });
  if (!res.ok) {
    return { url, error: `Tavily returned ${res.status}` };
  }
  const data = await res.json();
  const content = data.results?.[0]?.content || null;
  if (!content) return { url, error: 'Empty content returned' };
  return { url, content };
}

async function tavilyCrawl(baseUrl, paths, apiKey) {
  const urlsToTry = paths.slice(0, 6).map(p => {
    const base = baseUrl.replace(/\/$/, '');
    return p ? `${base}${p}` : base;
  });

  const results = await Promise.allSettled(urlsToTry.map(u => tavilyExtract(u, apiKey)));
  const contents = [];
  const failedPages = [];

  for (const r of results) {
    if (r.status === 'fulfilled') {
      if (r.value.content) {
        contents.push({ url: r.value.url, content: r.value.content.substring(0, 2000) });
      } else {
        failedPages.push(`${r.value.url}: ${r.value.error}`);
      }
    } else {
      failedPages.push(`Unknown URL: ${r.reason?.message || 'unknown error'}`);
    }
  }

  return { contents, failedPages };
}

Deno.serve(async (req) => {
  const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
  if (!TAVILY_API_KEY) {
    return Response.json({ error: 'TAVILY_API_KEY secret is missing. Please set it in the platform secrets.' }, { status: 500 });
  }

  const base44 = createClientFromRequest(req);

  const { candidate_brand_id } = await req.json();

  if (!candidate_brand_id) {
    return Response.json({ error: 'candidate_brand_id is required' }, { status: 400 });
  }

  // Fetch the candidate brand
  const candidates = await base44.asServiceRole.entities.CandidateBrand.filter({ id: candidate_brand_id }).catch(() => []);
  const candidate = candidates[0];

  if (!candidate) {
    return Response.json({ error: 'CandidateBrand not found' }, { status: 404 });
  }

  if (!candidate.website) {
    await base44.asServiceRole.entities.CandidateBrand.update(candidate_brand_id, {
      verification_status: 'needs_review',
      admin_notes: 'No website URL — cannot crawl.',
    });
    return Response.json({ error: 'No website URL for this candidate' }, { status: 400 });
  }

  const baseUrl = candidate.website.startsWith('http') ? candidate.website : `https://${candidate.website}`;

  // Crawl key pages
  const { contents: pages, failedPages } = await tavilyCrawl(baseUrl, EVIDENCE_PATHS, TAVILY_API_KEY);

  if (pages.length === 0) {
    const failNote = failedPages.length > 0
      ? `Crawl failed. Pages attempted:\n${failedPages.join('\n')}`
      : 'Crawl returned no content — site may be blocked or unavailable.';

    await base44.asServiceRole.entities.CandidateBrand.update(candidate_brand_id, {
      verification_status: 'needs_review',
      last_crawled_at: new Date().toISOString(),
      admin_notes: failNote,
    });
    return Response.json({ success: false, reason: 'No pages could be crawled', failed_pages: failedPages });
  }

  const combinedContent = pages.map(p => `--- PAGE: ${p.url} ---\n${p.content}`).join('\n\n');

  // Use LLM to extract signals
  let extraction = null;
  try {
    extraction = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are extracting sustainability evidence signals from a brand's website content.

BRAND: ${candidate.name}
WEBSITE: ${baseUrl}

CRAWLED CONTENT:
${combinedContent.substring(0, 8000)}

Extract all sustainability-relevant signals. For each signal:
- What is the specific claim or fact?
- What type is it?
- Is it a strong, specific, verifiable claim or vague marketing language?
- Does the brand admit any limitations honestly? (e.g. "we can't afford Bluesign yet" — this is GOOD)

IMPORTANT RULES:
- Reward specificity: named factories, exact percentages, specific materials, documented repair services
- Reward honest limitations: admitting gaps is MORE transparent than having no gaps
- Flag vague claims: "sustainable", "eco-friendly", "we care about the planet" with no specifics
- Do NOT penalise a brand just for lacking formal certifications
- Separate "we don't know yet" from "evidence of bad practice"

Also assess:
- production_countries: where does production happen?
- has_repair_service: clear repair policy or service?
- has_factory_names: do they name specific factories?
- honest_about_limitations: do they admit what they can't do?
- greenwashing_risk: low|medium|high based on vague vs specific claims`,
      response_json_schema: {
        type: 'object',
        properties: {
          signals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                signal_type: { type: 'string' },
                claim_text: { type: 'string' },
                source_url: { type: 'string' },
                evidence_strength: { type: 'string' },
                is_brand_owned: { type: 'boolean' },
                needs_manual_review: { type: 'boolean' },
                review_note: { type: 'string' },
              }
            }
          },
          production_countries: { type: 'array', items: { type: 'string' } },
          materials_found: { type: 'array', items: { type: 'string' } },
          repair_claims: { type: 'array', items: { type: 'string' } },
          has_repair_service: { type: 'boolean' },
          has_factory_names: { type: 'boolean' },
          honest_about_limitations: { type: 'boolean' },
          greenwashing_risk: { type: 'string' },
          overall_transparency_notes: { type: 'string' },
        }
      }
    });
  } catch (err) {
    return Response.json({ error: 'LLM extraction failed', detail: err.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const signals = extraction?.signals || [];

  // Save BrandSignal records
  const signalSaves = signals.map(s =>
    base44.asServiceRole.entities.BrandSignal.create({
      candidate_brand_id,
      brand_name: candidate.name,
      signal_type: s.signal_type || 'other',
      claim_text: s.claim_text,
      source_url: s.source_url || baseUrl,
      source_platform: 'brand_website',
      evidence_strength: s.evidence_strength || 'unverified',
      is_brand_owned: s.is_brand_owned !== false,
      extracted_at: now,
      needs_manual_review: s.needs_manual_review || false,
      review_note: s.review_note || '',
    }).catch(() => null)
  );
  await Promise.allSettled(signalSaves);

  const newStatus = signals.some(s => s.needs_manual_review) ? 'needs_review' : 'crawled';

  const adminNotes = [
    extraction?.overall_transparency_notes || '',
    failedPages.length > 0 ? `\n\nFailed pages:\n${failedPages.join('\n')}` : '',
  ].join('').trim();

  await base44.asServiceRole.entities.CandidateBrand.update(candidate_brand_id, {
    verification_status: newStatus,
    last_crawled_at: now,
    production_location_claims: extraction?.production_countries || [],
    materials_claims: extraction?.materials_found || [],
    repair_or_longevity_claims: extraction?.repair_claims || [],
    admin_notes: adminNotes,
  });

  return Response.json({
    success: true,
    brand_name: candidate.name,
    signals_extracted: signals.length,
    pages_crawled: pages.length,
    failed_pages: failedPages,
    verification_status: newStatus,
    greenwashing_risk: extraction?.greenwashing_risk,
    has_repair_service: extraction?.has_repair_service,
    has_factory_names: extraction?.has_factory_names,
    honest_about_limitations: extraction?.honest_about_limitations,
  });
});