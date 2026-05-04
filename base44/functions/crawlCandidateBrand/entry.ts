import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Evidence path groups — balanced selection across all evidence categories
const EVIDENCE_PATH_GROUPS = {
  about:          ['', '/about', '/our-story', '/story', '/om-oss', '/om-os'],
  sustainability: ['/sustainability', '/impact', '/baerekraft', '/bærekraft', '/hållbarhet', '/bæredygtighed'],
  materials:      ['/materials', '/materialer', '/material'],
  production:     ['/production', '/produksjon', '/produktion', '/tillverkning', '/factory'],
  repair:         ['/repair', '/reparasjon', '/reparation', '/care', '/warranty', '/garanti', '/vedlikehold'],
};

// Keywords that indicate a sitemap URL is relevant for sustainability research
const SITEMAP_KEYWORDS = [
  'about', 'story', 'sustainability', 'impact', 'bærekraft', 'baerekraft',
  'materialer', 'materials', 'production', 'produksjon', 'repair', 'reparasjon',
  'care', 'warranty', 'garanti', 'transparent', 'ethics', 'factory', 'supplier',
];

function buildEvidencePaths() {
  const paths = [];
  const seen = new Set();
  for (const group of Object.values(EVIDENCE_PATH_GROUPS)) {
    for (const p of group) {
      if (!seen.has(p)) { seen.add(p); paths.push(p); }
    }
  }
  return paths;
}

// Method A: Tavily Extract
async function tavilyExtract(url, apiKey) {
  const res = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ urls: [url], include_raw_content: false }),
  });
  if (!res.ok) return { url, method: 'tavily', success: false, error: `Tavily returned ${res.status}` };
  const data = await res.json();
  const content = data.results?.[0]?.content || null;
  if (!content) return { url, method: 'tavily', success: false, error: 'Empty content returned' };
  return { url, method: 'tavily', success: true, content, content_length: content.length };
}

// Method B: Direct fetch fallback
async function directFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WorthWearing/1.0; +https://worthwearing.no)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en,no;q=0.9',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return { url, method: 'direct_fetch', success: false, error: `HTTP ${res.status}` };
    const html = await res.text();
    // Strip HTML tags to get readable text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (text.length < 100) return { url, method: 'direct_fetch', success: false, error: 'Content too short after parsing' };
    const content = text.substring(0, 3000);
    return { url, method: 'direct_fetch', success: true, content, content_length: content.length };
  } catch (err) {
    clearTimeout(timeout);
    return { url, method: 'direct_fetch', success: false, error: err.message };
  }
}

// Method C: Sitemap discovery
async function discoverFromSitemap(baseUrl) {
  const sitemapUrls = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/robots.txt`,
  ];

  let foundSitemapUrls = [];
  let sitemapFound = false;

  for (const sitemapUrl of sitemapUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(sitemapUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorthWearing/1.0)' },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const text = await res.text();

      if (sitemapUrl.endsWith('robots.txt')) {
        // Parse Sitemap: lines from robots.txt
        const sitemapLines = text.split('\n')
          .filter(line => line.toLowerCase().startsWith('sitemap:'))
          .map(line => line.replace(/^sitemap:\s*/i, '').trim());
        foundSitemapUrls.push(...sitemapLines);
        if (sitemapLines.length > 0) sitemapFound = true;
      } else {
        // Parse XML sitemap — extract <loc> entries
        const locMatches = text.match(/<loc>(.*?)<\/loc>/gi) || [];
        const urls = locMatches.map(m => m.replace(/<\/?loc>/gi, '').trim());
        if (urls.length > 0) {
          sitemapFound = true;
          // If it's a sitemap index, add sub-sitemaps; otherwise add page URLs
          const isSitemapIndex = text.includes('<sitemapindex');
          if (isSitemapIndex) {
            foundSitemapUrls.push(...urls);
          } else {
            // Filter to relevant pages only
            const relevant = urls.filter(u =>
              SITEMAP_KEYWORDS.some(kw => u.toLowerCase().includes(kw))
            );
            return { sitemapFound: true, relevantUrls: relevant.slice(0, 15) };
          }
        }
      }
    } catch (_) {
      // continue
    }
  }

  // If we found sub-sitemaps, fetch one and extract URLs
  for (const subSitemap of foundSitemapUrls.slice(0, 3)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(subSitemap, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorthWearing/1.0)' },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const text = await res.text();
      const locMatches = text.match(/<loc>(.*?)<\/loc>/gi) || [];
      const urls = locMatches.map(m => m.replace(/<\/?loc>/gi, '').trim());
      const relevant = urls.filter(u =>
        SITEMAP_KEYWORDS.some(kw => u.toLowerCase().includes(kw))
      );
      if (relevant.length > 0) {
        return { sitemapFound: true, relevantUrls: relevant.slice(0, 15) };
      }
    } catch (_) {
      // continue
    }
  }

  return { sitemapFound, relevantUrls: [] };
}

// Try a single URL with all fallback methods: Tavily → direct fetch
async function extractWithFallback(url, tavilyApiKey) {
  // Method A: Tavily
  const tavilyResult = await tavilyExtract(url, tavilyApiKey);
  if (tavilyResult.success) return tavilyResult;

  // Method B: Direct fetch
  const fetchResult = await directFetch(url);
  return fetchResult;
}

Deno.serve(async (req) => {
  const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
  if (!TAVILY_API_KEY) {
    return Response.json({ error: 'TAVILY_API_KEY secret is missing.' }, { status: 500 });
  }

  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { candidate_brand_id } = await req.json();

  if (!candidate_brand_id) {
    return Response.json({ error: 'candidate_brand_id is required' }, { status: 400 });
  }

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
  const now = new Date().toISOString();

  // ── Phase 1: Tavily + direct fetch for all evidence paths ───────────────────
  const evidencePaths = buildEvidencePaths();
  const urlsToTry = evidencePaths.map(p => {
    const base = baseUrl.replace(/\/$/, '');
    return p ? `${base}${p}` : base;
  });

  // Batch: Tavily first for all URLs, then direct fetch for failures
  const tavilyResults = await Promise.allSettled(
    urlsToTry.map(u => tavilyExtract(u, TAVILY_API_KEY))
  );

  const crawlAttempts = []; // All attempt records
  const successPages = [];  // Pages with extracted content
  const tavilyFailedUrls = []; // URLs that need direct fetch fallback

  for (const r of tavilyResults) {
    const result = r.status === 'fulfilled' ? r.value : { url: 'unknown', method: 'tavily', success: false, error: r.reason?.message };
    crawlAttempts.push({ ...result, attempted_at: now });
    if (result.success) {
      successPages.push({ url: result.url, content: result.content.substring(0, 2000), method: 'tavily' });
    } else {
      tavilyFailedUrls.push(result.url);
    }
  }

  // ── Phase 2: Direct fetch fallback for Tavily failures ──────────────────────
  const directFetchResults = await Promise.allSettled(
    tavilyFailedUrls.map(u => directFetch(u))
  );

  let directFetchHelped = 0;
  for (const r of directFetchResults) {
    const result = r.status === 'fulfilled' ? r.value : { url: 'unknown', method: 'direct_fetch', success: false, error: r.reason?.message };
    crawlAttempts.push({ ...result, attempted_at: now });
    if (result.success) {
      successPages.push({ url: result.url, content: result.content.substring(0, 2000), method: 'direct_fetch' });
      directFetchHelped++;
    }
  }

  // ── Phase 3: Sitemap discovery if still no content ───────────────────────────
  let sitemapFound = false;
  let sitemapUrls = [];
  if (successPages.length === 0) {
    const sitemapResult = await discoverFromSitemap(baseUrl);
    sitemapFound = sitemapResult.sitemapFound;
    sitemapUrls = sitemapResult.relevantUrls;

    if (sitemapUrls.length > 0) {
      const sitemapFetchResults = await Promise.allSettled(
        sitemapUrls.map(u => extractWithFallback(u, TAVILY_API_KEY))
      );
      for (const r of sitemapFetchResults) {
        const result = r.status === 'fulfilled' ? r.value : { url: 'unknown', method: 'sitemap', success: false, error: r.reason?.message };
        const attempt = { ...result, method: 'sitemap', attempted_at: now };
        crawlAttempts.push(attempt);
        if (result.success) {
          successPages.push({ url: result.url, content: result.content.substring(0, 2000), method: 'sitemap' });
        }
      }
    }
  }

  // ── Save CrawlAttempt records (awaited for reliability) ──────────────────────
  await Promise.allSettled(
    crawlAttempts.slice(0, 50).map(a =>
      base44.asServiceRole.entities.CrawlAttempt.create({
        candidate_brand_id,
        url: a.url || 'unknown',
        method: a.method || 'tavily',
        success: a.success || false,
        content_length: a.content_length || 0,
        error: a.error || null,
        attempted_at: a.attempted_at,
      }).catch(() => null)
    )
  );

  // ── Handle total failure ──────────────────────────────────────────────────────
  if (successPages.length === 0) {
    const failLines = crawlAttempts
      .filter(a => !a.success)
      .slice(0, 20)
      .map(a => `[${a.method}] ${a.url}: ${a.error}`);

    const failNote = [
      `Crawl failed — 0/${crawlAttempts.length} pages extracted.`,
      sitemapFound ? `Sitemap found but no relevant pages could be fetched.` : `No sitemap found.`,
      `\nAttempted pages:\n${failLines.join('\n')}`,
    ].join('\n');

    await base44.asServiceRole.entities.CandidateBrand.update(candidate_brand_id, {
      verification_status: 'needs_review',
      last_crawled_at: now,
      admin_notes: failNote,
    });
    return Response.json({
      success: false,
      reason: 'No pages could be crawled — try manual evidence entry',
      pages_attempted: crawlAttempts.length,
      sitemap_found: sitemapFound,
      direct_fetch_helped: directFetchHelped,
    });
  }

  // ── LLM extraction ────────────────────────────────────────────────────────────
  const combinedContent = successPages
    .map(p => `--- PAGE [${p.method}]: ${p.url} ---\n${p.content}`)
    .join('\n\n');

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

  const signals = extraction?.signals || [];

  // Valid enum values for BrandSignal — sanitize LLM output before saving
  const VALID_SIGNAL_TYPES = new Set([
    'material', 'production_location', 'factory', 'repair', 'warranty',
    'durability', 'circularity', 'worker_ethics', 'sustainability_claim',
    'greenwashing_risk', 'stockist', 'founder_note', 'other',
  ]);
  const VALID_EVIDENCE_STRENGTHS = new Set(['strong', 'medium', 'weak', 'unverified']);

  // Save BrandSignal records — sanitize enum values from LLM output
  await Promise.allSettled(signals.map(s =>
    base44.asServiceRole.entities.BrandSignal.create({
      candidate_brand_id,
      brand_name: candidate.name,
      signal_type: VALID_SIGNAL_TYPES.has(s.signal_type) ? s.signal_type : 'other',
      claim_text: s.claim_text,
      source_url: s.source_url || baseUrl,
      source_platform: 'brand_website',
      evidence_strength: VALID_EVIDENCE_STRENGTHS.has(s.evidence_strength) ? s.evidence_strength : 'unverified',
      is_brand_owned: s.is_brand_owned !== false,
      extracted_at: now,
      needs_manual_review: s.needs_manual_review || false,
      review_note: s.review_note || '',
    }).catch(() => null)
  ));

  const newStatus = signals.some(s => s.needs_manual_review) ? 'needs_review' : 'crawled';

  // Build detailed admin_notes
  const crawledUrlPaths = new Set(successPages.map(p => {
    try { return new URL(p.url).pathname; } catch { return p.url; }
  }));
  const coverageSummary = Object.entries(EVIDENCE_PATH_GROUPS).map(([group, groupPaths]) => {
    const covered = groupPaths.filter(p => crawledUrlPaths.has(p) || crawledUrlPaths.has(p + '/'));
    return `${group}: ${covered.length}/${groupPaths.length} pages reached`;
  }).join('\n');

  const methodBreakdown = successPages.reduce((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + 1;
    return acc;
  }, {});

  const adminNotes = [
    extraction?.overall_transparency_notes || '',
    `\n\nCrawl summary:`,
    `• Pages attempted: ${crawlAttempts.length}`,
    `• Pages successfully extracted: ${successPages.length}`,
    `• Failed pages: ${crawlAttempts.length - successPages.length}`,
    `• Sitemap found: ${sitemapFound ? 'Yes' : 'No'}`,
    `• Direct fetch helped: ${directFetchHelped > 0 ? `Yes (${directFetchHelped} pages)` : 'No'}`,
    Object.entries(methodBreakdown).length > 0
      ? `• Methods used: ${Object.entries(methodBreakdown).map(([m, c]) => `${m}=${c}`).join(', ')}`
      : '',
    `\nEvidence coverage:\n${coverageSummary}`,
    crawlAttempts.filter(a => !a.success).length > 0
      ? `\nFailed pages (${crawlAttempts.filter(a => !a.success).length}):\n${crawlAttempts.filter(a => !a.success).slice(0, 15).map(a => `[${a.method}] ${a.url}: ${a.error}`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n').trim();

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
    pages_crawled: successPages.length,
    pages_attempted: crawlAttempts.length,
    sitemap_found: sitemapFound,
    direct_fetch_helped: directFetchHelped,
    verification_status: newStatus,
    greenwashing_risk: extraction?.greenwashing_risk,
    has_repair_service: extraction?.has_repair_service,
    has_factory_names: extraction?.has_factory_names,
    honest_about_limitations: extraction?.honest_about_limitations,
  });
});