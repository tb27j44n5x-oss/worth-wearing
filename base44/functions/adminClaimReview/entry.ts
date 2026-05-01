import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { report_id, action, approved_claims, score_overrides, publish } = await req.json();

  if (!report_id || !action) {
    return Response.json({ error: 'report_id and action required' }, { status: 400 });
  }

  try {
    const report = await base44.asServiceRole.entities.BrandCategoryReport.list();
    const targetReport = report.find(r => r.id === report_id);

    if (!targetReport) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    let updateData = {};

    if (action === 'approve_claims') {
      // Mark approved claims and update status
      updateData.claims_needing_manual_review = (targetReport.claims_needing_manual_review || []).filter(
        claim => !approved_claims.includes(claim.claim)
      );

      if (updateData.claims_needing_manual_review.length === 0) {
        updateData.status = publish ? 'published' : 'pending_admin_approval';
      } else {
        updateData.status = 'claims_pending_review';
      }
    } else if (action === 'override_scores') {
      // Apply score overrides
      updateData.admin_overrides = updateData.admin_overrides || {};

      for (const [scoreField, override] of Object.entries(score_overrides || {})) {
        updateData.admin_overrides[scoreField] = {
          original_score: targetReport[scoreField],
          override_score: override.new_score,
          reason: override.reason,
          overridden_by_email: user.email,
          overridden_at: new Date().toISOString()
        };
        updateData[scoreField] = override.new_score;
      }

      if (publish) {
        updateData.status = 'published';
      }
    } else if (action === 'publish') {
      updateData.status = 'published';
      updateData.published_at = new Date().toISOString();
    } else if (action === 'archive') {
      updateData.status = 'archived';
    } else if (action === 'request_refresh') {
      updateData.status = 'needs_refresh';
      updateData.next_refresh_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    updateData.admin_notes = (updateData.admin_notes || '') + `\n[${user.email} - ${new Date().toISOString()}] ${action}: completed`;

    const updated = await base44.asServiceRole.entities.BrandCategoryReport.update(report_id, updateData);

    return Response.json({
      success: true,
      updated_report: updated,
      action_summary: {
        action,
        new_status: updated.status,
        overrides_applied: Object.keys(score_overrides || {}).length,
        claims_resolved: approved_claims ? approved_claims.length : 0
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});