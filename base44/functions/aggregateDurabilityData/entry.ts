import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { brand_id, brand_name, category_key } = await req.json();

  if (!brand_id || !category_key) {
    return Response.json({ error: 'brand_id and category_key required' }, { status: 400 });
  }

  try {
    const logs = await base44.asServiceRole.entities.DurabilityLog.filter({
      brand_id,
      category_key
    });

    if (logs.length === 0) {
      return Response.json({ success: false, message: 'No durability logs found' });
    }

    // Aggregate by event type
    const byEvent = {
      repair: logs.filter(l => l.event_type === 'repair'),
      failure: logs.filter(l => l.event_type === 'failure'),
      still_wearing: logs.filter(l => l.event_type === 'still_wearing'),
      longevity_milestone: logs.filter(l => l.event_type === 'longevity_milestone')
    };

    // Calculate metrics
    const failureReports = byEvent.failure.length;
    const totalReports = logs.length;
    const failureRate = totalReports > 0 ? (failureReports / totalReports) * 100 : 0;

    const avgMonthsToFailure = failureReports > 0
      ? byEvent.failure.reduce((sum, l) => sum + (l.months_owned || 0), 0) / failureReports
      : null;

    const repairReports = byEvent.repair.filter(l => l.months_owned);
    const avgMonthsToRepair = repairReports.length > 0
      ? repairReports.reduce((sum, l) => sum + l.months_owned, 0) / repairReports.length
      : null;

    const successfulRepairs = byEvent.repair.filter(l => l.repair_success).length;
    const repairSuccessRate = byEvent.repair.length > 0
      ? (successfulRepairs / byEvent.repair.length) * 100
      : null;

    const repairCosts = byEvent.repair.filter(l => l.repair_cost).map(l => l.repair_cost);
    const avgRepairCost = repairCosts.length > 0
      ? repairCosts.reduce((a, b) => a + b, 0) / repairCosts.length
      : null;

    const brandServiceRepairs = byEvent.repair.filter(l => l.used_brand_repair_service).length;
    const brandRepairServiceUsage = byEvent.repair.length > 0
      ? (brandServiceRepairs / byEvent.repair.length) * 100
      : null;

    // Most common failures
    const failureTypes = {};
    byEvent.failure.forEach(l => {
      const type = l.failure_type || 'unknown';
      failureTypes[type] = (failureTypes[type] || 0) + 1;
    });
    const sortedFailures = Object.entries(failureTypes)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / failureReports) * 100
      }));

    // Most common repairs
    const repairTypes = {};
    byEvent.repair.forEach(l => {
      const type = l.repair_type || 'unknown';
      if (!repairTypes[type]) repairTypes[type] = { count: 0, costs: [], success: 0 };
      repairTypes[type].count++;
      if (l.repair_cost) repairTypes[type].costs.push(l.repair_cost);
      if (l.repair_success) repairTypes[type].success++;
    });
    const sortedRepairs = Object.entries(repairTypes)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([type, data]) => ({
        type,
        count: data.count,
        success_rate: (data.success / data.count) * 100,
        avg_cost: data.costs.length > 0 ? data.costs.reduce((a, b) => a + b, 0) / data.costs.length : null
      }));

    // Longevity distribution
    const longevityDist = {
      under_6_months: 0,
      '6_12_months': 0,
      '1_2_years': 0,
      '2_5_years': 0,
      over_5_years: 0
    };
    logs.forEach(l => {
      const months = l.months_owned || 0;
      if (months < 6) longevityDist.under_6_months++;
      else if (months < 12) longevityDist['6_12_months']++;
      else if (months < 24) longevityDist['1_2_years']++;
      else if (months < 60) longevityDist['2_5_years']++;
      else longevityDist.over_5_years++;
    });

    // Reliability verdict
    let reliabilityVerdict = 'insufficient_data';
    if (failureRate < 10) reliabilityVerdict = 'very_reliable';
    else if (failureRate < 25) reliabilityVerdict = 'reliable';
    else if (failureRate < 50) reliabilityVerdict = 'moderate_reliability';
    else reliabilityVerdict = 'poor_reliability';

    const aggregate = await base44.asServiceRole.entities.DurabilityAggregate.create({
      brand_id,
      brand_name,
      category_key,
      total_reports: totalReports,
      total_reports_by_event: {
        repair: byEvent.repair.length,
        failure: byEvent.failure.length,
        still_wearing: byEvent.still_wearing.length,
        longevity_milestone: byEvent.longevity_milestone.length
      },
      failure_rate: Math.round(failureRate * 10) / 10,
      avg_months_to_failure: avgMonthsToFailure ? Math.round(avgMonthsToFailure * 10) / 10 : null,
      avg_months_to_repair: avgMonthsToRepair ? Math.round(avgMonthsToRepair * 10) / 10 : null,
      repair_success_rate: repairSuccessRate ? Math.round(repairSuccessRate * 10) / 10 : null,
      avg_repair_cost: avgRepairCost ? Math.round(avgRepairCost * 100) / 100 : null,
      brand_repair_service_usage: brandRepairServiceUsage ? Math.round(brandRepairServiceUsage * 10) / 10 : null,
      most_common_failures: sortedFailures.slice(0, 5),
      most_common_repairs: sortedRepairs.slice(0, 5),
      reliability_verdict: reliabilityVerdict,
      longevity_distribution: longevityDist,
      last_aggregated_at: new Date().toISOString(),
      next_aggregation_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    return Response.json({ success: true, aggregate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});