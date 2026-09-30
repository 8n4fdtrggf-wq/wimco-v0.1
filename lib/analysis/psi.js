// Google PageSpeed Insights (Lighthouse) – riktiga labbmätningar och fältdata (CrUX).
// Nyckel: PSI_API_KEY. Utan nyckel försöker vi anropa API:t nyckellöst (låg kvot);
// misslyckas det markeras prestandan som ej uppmätt i rapporten.

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export async function runPsi(url, env, platform, { timeoutMs = 75000 } = {}) {
  if (env.DEV_FIXTURES === '1') {
    const { psiFixture } = await import('./psi-fixture.js');
    const delay = Number(env.DEV_FIXTURE_DELAY || 0);
    if (delay > 0) await new Promise((r) => setTimeout(r, Math.min(delay, 30000)));
    return normalizePsi(psiFixture(url), { devData: true });
  }
  if (env.PSI_DISABLED === '1') return { ok: false, reason: 'disabled' };
  const qs = new URLSearchParams({ url, strategy: 'mobile', locale: 'sv' });
  for (const c of ['performance', 'accessibility', 'seo', 'best-practices']) qs.append('category', c);
  if (env.PSI_API_KEY) qs.set('key', env.PSI_API_KEY);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await platform.trustedFetch(`${ENDPOINT}?${qs}`, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const reason = res.status === 429 ? 'quota' : /FAILED_DOCUMENT_REQUEST|ERRORED_DOCUMENT_REQUEST|NO_FCP/.test(body) ? 'lighthouse_failed' : `http_${res.status}`;
      return { ok: false, reason };
    }
    const json = await res.json();
    return normalizePsi(json, { devData: false });
  } catch (err) {
    return { ok: false, reason: controller.signal.aborted ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export function normalizePsi(json, { devData }) {
  const lh = json.lighthouseResult;
  if (!lh || !lh.categories) return { ok: false, reason: 'invalid_response' };
  const cat = (k) => (lh.categories[k]?.score ?? null);
  const audit = (id) => lh.audits?.[id];
  const num = (id) => {
    const v = audit(id)?.numericValue;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  const audits = {};
  for (const id of ['viewport', 'content-width', 'tap-targets', 'font-size', 'uses-responsive-images', 'dom-size']) {
    const a = audit(id);
    if (a) audits[id] = { score: a.score, title: String(a.title || '').slice(0, 160), displayValue: String(a.displayValue || '').slice(0, 80) };
  }
  const failingA11y = [];
  for (const ref of lh.categories.accessibility?.auditRefs || []) {
    const a = audit(ref.id);
    if (a && a.score === 0 && ref.weight > 0) failingA11y.push({ id: ref.id, title: String(a.title || '').slice(0, 160), weight: ref.weight });
  }
  failingA11y.sort((a, b) => b.weight - a.weight);

  const opportunities = [];
  for (const [id, a] of Object.entries(lh.audits || {})) {
    const d = a.details;
    const ms = d?.overallSavingsMs ?? a.metricSavings?.LCP ?? 0;
    if ((d?.type === 'opportunity' || a.metricSavings) && a.score !== null && a.score < 0.9 && ms > 150) {
      opportunities.push({ id, title: String(a.title || '').slice(0, 140), savingsMs: Math.round(ms) });
    }
  }
  opportunities.sort((a, b) => b.savingsMs - a.savingsMs);

  let screenshot = audit('final-screenshot')?.details?.data || null;
  if (typeof screenshot !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(screenshot) || screenshot.length > 400000) {
    screenshot = null;
  }

  const le = json.loadingExperience;
  let field = null;
  if (le?.metrics && le.origin_fallback !== true) {
    const p = (k) => le.metrics[k]?.percentile;
    field = {
      lcp: p('LARGEST_CONTENTFUL_PAINT_MS') ?? null,
      inp: p('INTERACTION_TO_NEXT_PAINT') ?? null,
      cls: p('CUMULATIVE_LAYOUT_SHIFT_SCORE') != null ? p('CUMULATIVE_LAYOUT_SHIFT_SCORE') / 100 : null,
      category: le.overall_category || null,
    };
  }

  return {
    ok: true,
    devData: !!devData,
    lighthouseVersion: lh.lighthouseVersion || null,
    fetchTime: lh.fetchTime || null,
    finalUrl: lh.finalDisplayedUrl || lh.finalUrl || null,
    categories: {
      performance: cat('performance'),
      accessibility: cat('accessibility'),
      seo: cat('seo'),
      bestPractices: cat('best-practices'),
    },
    metrics: {
      lcp: num('largest-contentful-paint'),
      cls: num('cumulative-layout-shift'),
      tbt: num('total-blocking-time'),
      fcp: num('first-contentful-paint'),
      si: num('speed-index'),
    },
    field,
    audits,
    failingA11y: failingA11y.slice(0, 5),
    opportunities: opportunities.slice(0, 5),
    screenshot,
  };
}
