import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Hash an email address using SHA256 for GDPR compliance
 */
async function hashEmail(email) {
  if (!email) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Backend function: Hash emails for GDPR compliance
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { emails } = await req.json();

  if (!Array.isArray(emails)) {
    return Response.json({ error: 'emails must be an array' }, { status: 400 });
  }

  const hashes = await Promise.all(emails.map(email => hashEmail(email)));

  return Response.json({ success: true, hashes });
});