import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { brand_id, brand_name, brand_website } = await req.json();

    if (!brand_id || !brand_name || !brand_website) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Trigger the crawl
    const crawlResult = await base44.functions.invoke('crawlBrandWebsite', {
      brand_id,
      brand_website
    });

    // Create notification record
    const notification = await base44.entities.CrawlNotification.create({
      brand_id,
      brand_name,
      status: 'completed',
      crawl_result: crawlResult.data,
      triggered_by: user.email,
      triggered_at: new Date().toISOString()
    });

    return Response.json({ success: true, notification, crawl: crawlResult.data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});