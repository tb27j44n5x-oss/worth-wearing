import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { brand_id, brand_name, category_key, research_data } = await req.json();

  if (!brand_id || !category_key || !research_data) {
    return Response.json({ error: 'brand_id, category_key, research_data required' }, { status: 400 });
  }

  try {
    const sources = [];

    // Extract evidence from research data structure
    const evidenceMap = {
      material: {
        score_field: 'material_score',
        claim_category: 'material',
        snippet: research_data.material_argument
      },
      manufacturing: {
        score_field: 'manufacturing_score',
        claim_category: 'manufacturing',
        snippet: research_data.manufacturing_argument
      },
      transport: {
        score_field: 'transport_score',
        claim_category: 'transport',
        snippet: research_data.transport_argument
      },
      worker: {
        score_field: 'worker_score',
        claim_category: 'worker_ethics',
        snippet: research_data.worker_argument
      },
      durability: {
        score_field: 'durability_score',
        claim_category: 'durability',
        snippet: research_data.use_durability_argument
      },
      circular: {
        score_field: 'circularity_score',
        claim_category: 'circular',
        snippet: research_data.circularity_argument
      }
    };

    // For each category, create evidence sources from cited snippets
    for (const [key, config] of Object.entries(evidenceMap)) {
      if (!config.snippet) continue;

      const source = {
        brand_id,
        brand_name,
        category_key,
        claim_category: config.claim_category,
        source_type: 'website_crawl',
        source_title: `${brand_name} - ${key} research`,
        summary: config.snippet.substring(0, 500),
        supports_what: config.snippet,
        credibility_score: 6,
        is_brand_owned: true,
        date_accessed: new Date().toISOString().split('T')[0],
        is_verified: false,
        claim_direction: 'supports'
      };

      const created = await base44.asServiceRole.entities.EvidenceSource.create(source);
      sources.push(created);
    }

    // Also extract from evidence_snippets if available
    if (research_data.evidence_snippets && Array.isArray(research_data.evidence_snippets)) {
      for (const snippet of research_data.evidence_snippets) {
        const sourceType = snippet.includes('third-party') || snippet.includes('audit') ? 'third_party_audit' :
                          snippet.includes('certification') ? 'certification_body' :
                          snippet.includes('reddit') ? 'reddit' :
                          snippet.includes('news') ? 'news' : 'unknown';

        const credScore = sourceType === 'third_party_audit' ? 9 :
                         sourceType === 'certification_body' ? 8 :
                         sourceType === 'news' ? 6 :
                         sourceType === 'reddit' ? 2 : 3;

        const created = await base44.asServiceRole.entities.EvidenceSource.create({
          brand_id,
          brand_name,
          category_key,
          source_type: sourceType,
          source_title: snippet.substring(0, 100),
          summary: snippet.substring(0, 500),
          credibility_score: credScore,
          is_verified: false,
          date_accessed: new Date().toISOString().split('T')[0],
          claim_direction: 'supports'
        });

        sources.push(created);
      }
    }

    return Response.json({
      success: true,
      sources_created: sources.length,
      sources
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});