import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'internal.',
  '192.168.',
  '10.0.',
  '172.16.'
];

/**
 * Validate URL format
 */
function validateURLFormat(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    // Check protocol
    if (!parsed.protocol.startsWith('http')) return false;
    // Check hostname against blocked domains
    const hostname = parsed.hostname;
    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname.includes(blocked)) return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Validate source URL by checking format and HTTP status
 * Returns { status, http_code?, error? }
 */
export async function validateSourceURL(url) {
  if (!validateURLFormat(url)) {
    return { status: 'invalid_format', message: 'Malformed or blocked URL' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return { status: 'not_found', http_code: 404 };
    } else if (response.ok) {
      return { status: 'valid', http_code: response.status };
    } else {
      return { status: 'unreachable', http_code: response.status };
    }
  } catch (err) {
    return { status: 'unreachable', error: err.message };
  }
}

/**
 * Backend function: validate a list of URLs and flag problematic ones
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { urls } = await req.json();

  if (!Array.isArray(urls)) {
    return Response.json({ error: 'urls must be an array' }, { status: 400 });
  }

  const results = await Promise.all(
    urls.map(async (url) => ({
      url,
      validation: await validateSourceURL(url)
    }))
  );

  return Response.json({ success: true, results });
});