export const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-robots-tag': 'noindex',
};

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } });
}

export function errorJson(code, message, status, extra = {}) {
  return json({ ok: false, code, message }, status, extra);
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function clientIp(request, platform) {
  return request.headers.get('cf-connecting-ip')
    || (platform?.trustForwarded ? (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() : '')
    || platform?.remoteAddress
    || 'unknown';
}

// Endast anrop från den egna sajten får starta analyser och skicka formulär.
export function sameOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') === 'same-origin';
  const reqOrigin = new URL(request.url).origin;
  const allowed = new Set([reqOrigin]);
  if (env.SITE_URL) {
    try { allowed.add(new URL(env.SITE_URL).origin); } catch { /* ignoreras */ }
  }
  return allowed.has(origin);
}

export async function readJsonBody(request, maxBytes = 16 * 1024) {
  const ct = request.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try { return JSON.parse(text); } catch { return null; }
}
