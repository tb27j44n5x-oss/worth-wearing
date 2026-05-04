import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { candidate_brand_id, reason } = await req.json();
  if (!candidate_brand_id) {
    return Response.json({ error: 'candidate_brand_id is required' }, { status: 400 });
  }

  const candidates = await base44.asServiceRole.entities.CandidateBrand.filter({ id: candidate_brand_id }).catch(() => []);
  const candidate = candidates[0];
  if (!candidate) {
    return Response.json({ error: 'CandidateBrand not found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const rejectionNote = [
    `\n\n[REJECTED by ${user.email} at ${now}]`,
    reason ? `Reason: ${reason}` : '',
  ].filter(Boolean).join('\n');

  await base44.asServiceRole.entities.CandidateBrand.update(candidate_brand_id, {
    verification_status: 'rejected',
    admin_notes: (candidate.admin_notes || '') + rejectionNote,
  });

  await base44.asServiceRole.entities.Audit.create({
    action: 'update',
    entity_type: 'CandidateBrand',
    entity_id: candidate_brand_id,
    performed_by_email: user.email,
    changes: { verification_status: { from: candidate.verification_status, to: 'rejected' }, reason: reason || null },
    reason: reason || 'Admin rejection',
    timestamp: now,
  }).catch(() => null);

  return Response.json({ success: true, brand_name: candidate.name });
});