// Plattformsoberoende, SSRF-säker hämtning. Plattformen levererar:
//   resolve(hostname) -> string[]  (alla A/AAAA-adresser)
//   rawFetch(url, { method, headers, signal }) -> { status, headers: Headers, body: ReadableStream|null }
// rawFetch får aldrig följa redirects själv – varje hopp valideras här.
import { AnalysisError, assertPublicHostname, assertResolvesPublic } from './url-guard.js';

export const USER_AGENT = 'Mozilla/5.0 (compatible; WimcoScore/1.0; +https://wimco.se/wimco-score/)';

export const DEFAULT_LIMITS = {
  maxRedirects: 5,
  timeoutMs: 12000,
  maxBytes: 3 * 1024 * 1024,
};

export async function readLimited(body, maxBytes) {
  if (!body) return { bytes: new Uint8Array(0), truncated: false };
  const reader = body.getReader();
  const chunks = [];
  let size = 0;
  let truncated = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      if (size + chunk.byteLength > maxBytes) {
        chunks.push(chunk.subarray(0, maxBytes - size));
        size = maxBytes;
        truncated = true;
        break;
      }
      chunks.push(chunk);
      size += chunk.byteLength;
    }
  } finally {
    if (truncated) {
      try { await reader.cancel(); } catch { /* ignoreras */ }
    } else {
      try { reader.releaseLock(); } catch { /* ignoreras */ }
    }
  }
  const out = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return { bytes: out, truncated };
}

function charsetFrom(contentType, bytes) {
  const m = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType || '');
  if (m) return m[1].toLowerCase();
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 2048));
  const meta = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head);
  return meta ? meta[1].toLowerCase() : 'utf-8';
}

export function decodeText(bytes, contentType) {
  const cs = charsetFrom(contentType, bytes);
  try {
    return new TextDecoder(cs, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }
}

const REDIRECT = new Set([301, 302, 303, 307, 308]);

export async function safeFetch(startUrl, platform, opts = {}) {
  const limits = { ...DEFAULT_LIMITS, ...opts };
  const redirects = [];
  let url = new URL(startUrl.toString());
  const started = Date.now();
  const deadline = started + limits.timeoutMs;

  for (let hop = 0; hop <= limits.maxRedirects; hop++) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new AnalysisError('blocked_target', 'Webbplatsen skickade oss vidare till en adress som inte kan analyseras.');
    }
    if (url.username || url.password) {
      throw new AnalysisError('blocked_target', 'Webbplatsen skickade oss vidare till en adress med inloggningsuppgifter.');
    }
    if (url.port && url.port !== '80' && url.port !== '443') {
      throw new AnalysisError('blocked_target', 'Webbplatsen skickade oss vidare till en port som inte kan analyseras.');
    }
    try {
      assertPublicHostname(url.hostname);
    } catch (err) {
      if (hop > 0) throw new AnalysisError('blocked_target', 'Webbplatsen skickade oss vidare till en intern adress. Analysen stoppades av säkerhetsskäl.');
      throw err;
    }
    await assertResolvesPublic(url.hostname, platform.resolve);

    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new AnalysisError('timeout', 'Webbplatsen svarade inte i tid.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    const t0 = Date.now();
    let res;
    try {
      res = await platform.rawFetch(url.toString(), {
        method: opts.method || 'GET',
        headers: {
          'user-agent': USER_AGENT,
          accept: opts.accept || 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'accept-language': 'sv-SE,sv;q=0.9,en;q=0.6',
        },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof AnalysisError) throw err;
      if (controller.signal.aborted) throw new AnalysisError('timeout', 'Webbplatsen svarade inte i tid.');
      throw new AnalysisError('unreachable', 'Vi kunde inte ansluta till webbplatsen.', { cause: err });
    }
    const ttfb = Date.now() - t0;

    if (REDIRECT.has(res.status)) {
      clearTimeout(timer);
      try { await res.body?.cancel?.(); } catch { /* ignoreras */ }
      const loc = res.headers.get('location');
      if (!loc) throw new AnalysisError('failed', 'Webbplatsen skickade en ogiltig vidarebefordran.');
      let next;
      try { next = new URL(loc, url); } catch { throw new AnalysisError('failed', 'Webbplatsen skickade en ogiltig vidarebefordran.'); }
      next.hash = '';
      redirects.push({ from: url.toString(), to: next.toString(), status: res.status });
      url = next;
      continue;
    }

    try {
      const { bytes, truncated } = await readLimited(res.body, limits.maxBytes);
      clearTimeout(timer);
      return {
        url: url.toString(),
        status: res.status,
        headers: res.headers,
        bytes,
        truncated,
        redirects,
        ttfb,
        total: Date.now() - started,
      };
    } catch (err) {
      clearTimeout(timer);
      if (controller.signal.aborted) throw new AnalysisError('timeout', 'Webbplatsen svarade inte i tid.');
      throw new AnalysisError('unreachable', 'Anslutningen till webbplatsen bröts.', { cause: err });
    }
  }
  throw new AnalysisError('failed', 'Webbplatsen skickade oss vidare för många gånger.');
}
