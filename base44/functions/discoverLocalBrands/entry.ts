import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Language-specific sustainability discovery terms by country
const LOCAL_TERMS = {
  norway: {
    sustainability: ["bærekraftige klær", "slow fashion Norge", "sporbar produksjon", "norsk ull", "lokal produksjon"],
    production: ["produsert i Norge", "laget i Europa", "produsert i Portugal", "norsk klesmerke"],
    material: ["merino ull", "resirkulerte materialer", "naturlige materialer", "gots sertifisert"],
    repair: ["reparasjon klær", "klesreparasjon", "livstidsgaranti klær"],
    discovery: ["klesmerke Oslo", "klesmerke Bergen", "turklær ull Norge", "norsk utendørsklær"],
  },
  sweden: {
    sustainability: ["hållbara kläder", "slow fashion Sverige", "spårbar produktion", "småskaligt klädmärke"],
    production: ["tillverkad i Sverige", "tillverkad i Europa", "svenskt klädesföretag"],
    material: ["merinoull", "återvunna material", "ekologisk bomull", "gots certifierad"],
    repair: ["reparation kläder", "klädlagning", "livstidsgaranti kläder"],
    discovery: ["klädmärke Stockholm", "klädmärke Göteborg", "friluftskläder ull Sverige"],
  },
  denmark: {
    sustainability: ["bæredygtigt tøj", "slow fashion Danmark", "sporbar produktion", "lille tøjmærke"],
    production: ["produceret i Danmark", "produceret i Europa", "dansk tøjmærke"],
    material: ["merinouldstøj", "genbrugte materialer", "organisk bomuld"],
    repair: ["reparation tøj", "tøjreparation", "livstidsgaranti tøj"],
    discovery: ["tøjmærke København", "udendørsbeklædning uld Danmark"],
  },
  // Nordic/Scandinavian: balanced mix, not country-specific
  nordic: {
    sustainability: ["sustainable Nordic brand", "slow fashion Scandinavia", "ethical outdoor brand Nordics"],
    production: ["produced in Scandinavia", "made in Europe small brand", "Nordic knitwear brand"],
    material: ["merino wool Nordic", "recycled materials outdoor", "organic cotton Scandinavia"],
    repair: ["repair warranty outdoor Nordic", "livstidsgaranti klær", "livstidsgaranti kläder"],
    discovery: ["small outdoor brand Norway Sweden Denmark", "sustainable fashion Nordics", "independent brand Scandinavia"],
  },
};

// Locale params per country for Brave Search API
const BRAVE_LOCALE = {
  norway:  { country: 'NO', search_lang: 'no', ui_lang: 'nb-NO' },
  sweden:  { country: 'SE', search_lang: 'sv', ui_lang: 'sv-SE' },
  denmark: { country: 'DK', search_lang: 'da', ui_lang: 'da-DK' },
  nordic:  { country: 'NO', search_lang: 'en', ui_lang: 'en-US' },
  default: { country: 'US', search_lang: 'en', ui_lang: 'en-US' },
};

// Token-based country normalization (no substring matching for short codes)
function getCountryKey(country) {
  const tokens = country.toLowerCase().trim().split(/[\s,_-]+/);
  const NORWAY_TOKENS  = new Set(["norway", "norge", "norwegian", "norsk", "no"]);
  const SWEDEN_TOKENS  = new Set(["sweden", "sverige", "swedish", "svensk", "se"]);
  const DENMARK_TOKENS = new Set(["denmark", "danmark", "danish", "dansk", "dk"]);
  const NORDIC_TOKENS  = new Set(["nordic", "nordics", "scandinavia", "scandinavian"]);
  if (tokens.some(t => NORWAY_TOKENS.has(t))) return 'norway';
  if (tokens.some(t => SWEDEN_TOKENS.has(t))) return 'sweden';
  if (tokens.some(t => DENMARK_TOKENS.has(t))) return 'denmark';
  if (tokens.some(t => NORDIC_TOKENS.has(t))) return 'nordic';
  return null;
}

function getLocalTerms(country) {
  const key = getCountryKey(country);
  return key ? LOCAL_TERMS[key] : LOCAL_TERMS.norway;
}

function getBraveLocale(country) {
  const key = getCountryKey(country);
  return (key && BRAVE_LOCALE[key]) ? BRAVE_LOCALE[key] : BRAVE_LOCALE.default;
}

// Brave Search API call with locale params
async function braveSearch(query, count, locale, apiKey) {
  const params = new URLSearchParams({
    q: query,
    count: String(count),
    country: locale.country,
    search_lang: locale.search_lang,
    ui_lang: locale.ui_lang,
    safesearch: 'moderate',
  });
  const url = `https://api.search.brave.com/res/v1/web/search?${params}`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    }
  });
  if (!res.ok) {
    throw new Error(`Brave returned ${res.status}: ${await res.text().catch(() => 'no body')}`);
  }
  const data = await res.json();
  return data.web?.results || [];
}

// Extract a clean domain from a URL
function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Normalize domain for deduplication — strips protocol, www, trailing slash, paths
function normalizeDomain(url) {
  if (!url) return null;
  try {
    const withProto = url.startsWith('http') ? url : `https://${url}`;
    const u = new URL(withProto);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// Filter out non-brand domains
const EXCLUDED_DOMAINS = [
  'amazon', 'ebay', 'zalando', 'asos', 'hm.com', 'zara', 'uniqlo',
  'wikipedia', 'reddit', 'instagram', 'facebook', 'youtube', 'tiktok',
  'vinted', 'finn.no', 'tradera', 'blocket',
  'goodonyou', 'ranker', 'businessinsider', 'theguardian', 'bbc.co', 'nytimes',
  'vogue', 'gq.com', 'elle.', 'marieclaire', 'wired',
  'sustainablejungle', 'ecocult', 'thegoodtrade', 'treehugger',
  'patagonia', 'arcteryx', 'thenorthface', 'columbia', 'gore-tex',
];

function isExcluded(domain) {
  if (!domain) return true;
  return EXCLUDED_DOMAINS.some(ex => domain.includes(ex));
}

function domainToBrandName(domain) {
  return domain
    .replace(/\.(com|no|se|dk|co\.uk|org|net|io)$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

Deno.serve(async (req) => {
  const BRAVE_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY");
  if (!BRAVE_API_KEY) {
    return Response.json({ error: 'BRAVE_SEARCH_API_KEY secret is missing. Please set it in the platform secrets.' }, { status: 500 });
  }

  const base44 = createClientFromRequest(req);

  const { query, country = 'Norway', category = '', max_candidates = 30 } = await req.json();

  if (!query) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  const terms = getLocalTerms(country);
  const locale = getBraveLocale(country);
  const categorySlug = category || query;

  // English queries use en locale, local-language queries use country locale
  const englishLocale = { country: locale.country, search_lang: 'en', ui_lang: 'en-US' };

  const searchPlan = [
    // English discovery (with country locale for geo-targeting)
    { q: `sustainable ${categorySlug} brand small independent`, locale: englishLocale },
    { q: `ethical ${categorySlug} brand Europe local`, locale: englishLocale },
    { q: `${categorySlug} repair longevity independent brand`, locale: englishLocale },
    { q: `${country} sustainable clothing brand small`, locale: englishLocale },
    { q: `Nordic sustainable outdoor brand small independent`, locale: englishLocale },
    // Local language queries use country locale
    ...terms.sustainability.slice(0, 3).map(t => ({ q: `${t} ${categorySlug}`, locale })),
    ...terms.production.slice(0, 2).map(t => ({ q: `${t} ${categorySlug}`, locale })),
    ...terms.material.slice(0, 2).map(t => ({ q: `${t} ${categorySlug}`, locale })),
    ...terms.repair.slice(0, 2).map(t => ({ q: t, locale })),
    ...terms.discovery.slice(0, 3).map(t => ({ q: t, locale })),
  ].slice(0, 20);

  // Run Brave searches
  let totalFetched = 0;
  let totalErrors = 0;
  const allResults = [];
  const batchSize = 10;

  for (let i = 0; i < searchPlan.length; i += batchSize) {
    const batch = searchPlan.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(({ q, locale: l }) => braveSearch(q, 8, l, BRAVE_API_KEY)));
    for (const r of results) {
      if (r.status === 'fulfilled') {
        totalFetched += r.value.length;
        allResults.push(...r.value);
      } else {
        totalErrors++;
      }
    }
  }

  if (totalErrors > 0 && allResults.length === 0) {
    return Response.json({ error: `All Brave Search queries failed (${totalErrors} errors). Check BRAVE_SEARCH_API_KEY and API quota.` }, { status: 500 });
  }

  // Extract unique brand domains — collect up to 80 raw candidates before LLM classification
  // (do NOT stop at max_candidates here — early Brave results may be retailers/articles)
  const seen = new Set();
  const brandCandidates = [];
  let excluded = 0;
  const sourceUrls = {}; // domain → original Brave result URL

  for (const result of allResults) {
    const domain = extractDomain(result.url);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    if (isExcluded(domain)) { excluded++; continue; }

    const brandName = domainToBrandName(domain);
    sourceUrls[domain] = result.url;
    brandCandidates.push({
      domain,
      url: result.url,
      title: result.title || brandName,
      description: result.description || '',
      brandName,
    });

    if (brandCandidates.length >= 80) break;
  }

  // Use LLM to score and classify candidates
  const llmInput = brandCandidates.slice(0, 40).map(c =>
    `Domain: ${c.domain} | Title: ${c.title} | Snippet: ${c.description.substring(0, 120)}`
  ).join('\n');

  let classified = null;
  try {
    classified = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are classifying potential sustainable fashion/outdoor brand websites found via web search.

QUERY: "${query}" | COUNTRY: ${country} | CATEGORY: ${category || query}

CANDIDATES (domain | title | snippet):
${llmInput}

For each candidate, classify it and provide:
- is_brand: true/false (is this a brand's own website, not a retailer/magazine/directory?)
- brand_name: clean brand name
- website: https://domain
- country_guess: likely country of origin
- size_estimate: micro|small|medium|large|unknown
- local_relevance_score: 0-10 (how relevant to ${country} / Nordic region?)
- discovery_score: 0-10 (how interesting is this for sustainable fashion discovery?)
- confidence_level: high|medium|low|unknown
- sustainability_signals: array of 1-3 short strings (what sustainability signals did you detect?)
- reject_reason: if is_brand=false, why?

Only include candidates where is_brand=true or you are unsure (is_brand=null).
Exclude obvious retailers, magazines, affiliate sites, and global mega-brands.`,
      response_json_schema: {
        type: 'object',
        properties: {
          candidates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                is_brand: { type: 'boolean' },
                brand_name: { type: 'string' },
                website: { type: 'string' },
                country_guess: { type: 'string' },
                size_estimate: { type: 'string' },
                local_relevance_score: { type: 'number' },
                discovery_score: { type: 'number' },
                confidence_level: { type: 'string' },
                sustainability_signals: { type: 'array', items: { type: 'string' } },
                reject_reason: { type: 'string' },
              }
            }
          }
        }
      }
    });
  } catch (err) {
    return Response.json({ error: 'LLM classification failed', detail: err.message }, { status: 500 });
  }

  const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1, unknown: 0 };
  const allScored = classified?.candidates || [];

  // Sort by local_relevance_score → discovery_score → confidence_level, then limit to max_candidates
  const toSave = allScored
    .filter(c => c.is_brand !== false)
    .sort((a, b) => {
      const localDiff = (b.local_relevance_score || 0) - (a.local_relevance_score || 0);
      if (localDiff !== 0) return localDiff;
      const discDiff = (b.discovery_score || 0) - (a.discovery_score || 0);
      if (discDiff !== 0) return discDiff;
      return (CONFIDENCE_RANK[b.confidence_level] || 0) - (CONFIDENCE_RANK[a.confidence_level] || 0);
    })
    .slice(0, max_candidates);

  const scored = allScored; // keep for response stats
  const now = new Date().toISOString();

  // Save CandidateBrand records (only best max_candidates)
  let saved = 0;
  const saves = toSave
    .filter(c => c.is_brand !== false)
    .map(async (c) => {
      // Deduplicate by normalized_domain first, fall back to website match
      const normalizedDomainCheck = normalizeDomain(c.website || '');
      let existing = [];
      if (normalizedDomainCheck) {
        existing = await base44.asServiceRole.entities.CandidateBrand.filter({
          normalized_domain: normalizedDomainCheck
        }).catch(() => []);
      }
      if (existing.length === 0) {
        existing = await base44.asServiceRole.entities.CandidateBrand.filter({
          website: c.website
        }).catch(() => []);
      }

      // Find the original Brave URL for this brand's domain
      const domain = extractDomain(c.website || '');
      const originalUrl = (domain && sourceUrls[domain]) ? sourceUrls[domain] : (c.website || '');

      const payload = {
        name: c.brand_name,
        website: c.website,
        source_url: originalUrl,
        country: c.country_guess || country,
        category_tags: [category || query],
        size_estimate: c.size_estimate || 'unknown',
        discovery_source: 'web_search',
        source_platform: 'search_api',
        sustainability_claims_raw: c.sustainability_signals || [],
        confidence_level: c.confidence_level || 'unknown',
        verification_status: 'new',
        discovery_score: c.discovery_score || 0,
        local_relevance_score: c.local_relevance_score || 0,
        created_from_query: query,
        last_discovered_at: now,
      };

      const normalizedDomain = normalizeDomain(c.website || '');

      if (existing.length > 0) {
        return base44.asServiceRole.entities.CandidateBrand.update(existing[0].id, {
          ...payload,
          normalized_domain: normalizedDomain,
          last_discovered_at: now,
        });
      } else {
        return base44.asServiceRole.entities.CandidateBrand.create({
          ...payload,
          normalized_domain: normalizedDomain,
        });
      }
    });

  const saveResults = await Promise.allSettled(saves);
  saved = saveResults.filter(r => r.status === 'fulfilled').length;

  const strong = scored.filter(c => c.is_brand !== false && (c.local_relevance_score || 0) >= 6 && (c.discovery_score || 0) >= 6);
  const possible = scored.filter(c => c.is_brand !== false && !strong.includes(c));
  const rejected = scored.filter(c => c.is_brand === false);

  return Response.json({
    success: true,
    total_found: strong.length + possible.length,
    strong_local_candidates: strong,
    possible_small_brands: possible,
    rejected_count: rejected.length,
    search_queries_used: searchPlan.length,
    brave_results_fetched: totalFetched,
    brave_results_excluded: excluded,
    candidates_saved: saved,
    brave_errors: totalErrors,
  });
});