import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Admin function: Verify a durability log and record audit trail
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { log_id } = await req.json();

  if (!log_id) {
    return Response.json({ error: 'log_id is required' }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();

    // Update the durability log
    await base44.asServiceRole.entities.DurabilityLog.update(log_id, {
      verified_by_email: user.email,
      verified_at: now
    });

    // Log to audit trail
    await base44.asServiceRole.entities.Audit.create({
      action: 'verify',
      entity_type: 'DurabilityLog',
      entity_id: log_id,
      performed_by_email: user.email,
      changes: { verified_by_email: user.email, verified_at: now },
      reason: 'Admin verification of durability log',
      timestamp: now
    });

    return Response.json({ success: true, message: 'Durability log verified' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});