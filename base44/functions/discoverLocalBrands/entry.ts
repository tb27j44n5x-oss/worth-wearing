import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BRAVE_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY");

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
    repair: ["reparation kläder", "klädlagnign", "livstidsgaranti kläder"],
    discovery: ["klädmärke Stockholm", "klädmärke Göteborg", "friluftskläder ull Sverige"],
  },
  denmark: {
    sustainability: ["bæredygtigt tøj", "slow fashion Danmark", "sporbar produktion", "lille tøjmærke"],
    production: ["produceret i Danmark", "produceret i Europa", "dansk tøjmærke"],
    material: ["merinouldstøj", "genbrugte materialer", "organisk bomuld"],
    repair: ["reparation tøj", "tøjreparation", "livstidsgaranti tøj"],
    discovery: ["tøjmærke København", "udendørsbeklædning uld Danmark"],
  },
};

function getLocalTerms(country) {
  const key = country.toLowerCase().replace(/\s/g, '');
  if (key.includes('norw') || key === 'norway' || key === 'no') return LOCAL_TERMS.norway;
  if (key.includes('swed') || key === 'sweden' || key === 'se') return LOCAL_TERMS.sweden;
  if (key.includes('denm') || key === 'denmark' || key === 'dk') return LOCAL_TERMS.denmark;
  return LOCAL_TERMS.norway; // fallback
}

// Brave Search API call
async function braveSearch(query, count = 10) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&search_lang=en&safesearch=moderate`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY,
    }
  });
  if (!res.ok) return [];
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

// Filter out non-brand domains (retailers, magazines, etc.)
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

// Normalise brand name from a domain
function domainToBrandName(domain) {
  return domain
    .replace(/\.(com|no|se|dk|co\.uk|org|net|io)$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { query, country = 'Norway', language = 'auto', category = '', max_candidates = 30 } = await req.json();

  if (!query) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  const terms = getLocalTerms(country);

  // Build search queries: mix English + local language + category-specific
  const categorySlug = category || query;
  const searchQueries = [
    // English discovery
    `sustainable ${categorySlug} brand small independent`,
    `ethical ${categorySlug} brand Europe local`,
    `${categorySlug} repair longevity independent brand`,
    `${country} sustainable clothing brand small`,
    `Nordic sustainable outdoor brand small independent`,
    // Local language
    ...terms.sustainability.slice(0, 3).map(t => `${t} ${categorySlug}`),
    ...terms.production.slice(0, 2).map(t => `${t} ${categorySlug}`),
    ...terms.material.slice(0, 2).map(t => `${t} ${categorySlug}`),
    ...terms.repair.slice(0, 2).map(t => `${t}`),
    ...terms.discovery.slice(0, 3).map(t => `${t}`),
  ].slice(0, 20);

  // Run Brave searches in parallel (max 10 concurrent)
  const batchSize = 10;
  const allResults = [];
  for (let i = 0; i < searchQueries.length; i += batchSize) {
    const batch = searchQueries.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(q => braveSearch(q, 8)));
    results.forEach(r => allResults.push(...r));
  }

  // Extract unique brand domains
  const seen = new Set();
  const brandCandidates = [];

  for (const result of allResults) {
    const domain = extractDomain(result.url);
    if (!domain || isExcluded(domain) || seen.has(domain)) continue;
    seen.add(domain);

    const brandName = domainToBrandName(domain);
    brandCandidates.push({
      domain,
      url: result.url,
      title: result.title || brandName,
      description: result.description || '',
      brandName,
    });

    if (brandCandidates.length >= max_candidates) break;
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

  const scored = classified?.candidates || [];
  const now = new Date().toISOString();

  // Save CandidateBrand records
  const saves = scored
    .filter(c => c.is_brand !== false)
    .map(async (c) => {
      const existing = await base44.asServiceRole.entities.CandidateBrand.filter({
        website: c.website
      }).catch(() => []);

      const payload = {
        name: c.brand_name,
        website: c.website,
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

      if (existing.length > 0) {
        return base44.asServiceRole.entities.CandidateBrand.update(existing[0].id, {
          ...payload,
          last_discovered_at: now,
        });
      } else {
        return base44.asServiceRole.entities.CandidateBrand.create(payload);
      }
    });

  await Promise.allSettled(saves);

  // Group results for response
  const strong = scored.filter(c => c.is_brand !== false && (c.local_relevance_score || 0) >= 6 && (c.discovery_score || 0) >= 6);
  const possible = scored.filter(c => c.is_brand !== false && !strong.includes(c));
  const rejected = scored.filter(c => c.is_brand === false);

  return Response.json({
    success: true,
    total_found: strong.length + possible.length,
    strong_local_candidates: strong,
    possible_small_brands: possible,
    rejected_count: rejected.length,
    search_queries_used: searchQueries.length,
  });
});