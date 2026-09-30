// Orkestrerar en analys och strömmar verkliga delresultat i den ordning de blir klara.
import { AnalysisError, normalizeUrl, displayHost } from '../net/url-guard.js';
import { safeFetch, decodeText } from '../net/safe-fetch.js';
import { parseHtml, metaMap } from './html-parse.js';
import { buildChecks } from './checks.js';
import { runPsi } from './psi.js';
import { runAiAssessment } from './ai.js';
import { scoreReport, decorateChecks } from './score.js';
import { STEPS } from './catalog.js';
import { newId, newToken, sha256Hex } from '../util/ids.js';

const REPORT_TTL = 60 * 60 * 24 * 180; // 180 dagar
const CACHE_TTL = 60 * 15;
const stepLabel = (id) => STEPS.find((s) => s.id === id)?.label || id;
const fmtS = (ms) => (ms / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' s';

function isChallenge(res, text) {
  const h = (k) => res.headers.get(k) || '';
  if (/challenge/i.test(h('cf-mitigated'))) return true;
  if (res.status === 403 || res.status === 503 || res.status === 429) {
    return /(just a moment|attention required|cf-browser-verification|captcha|access denied|ddos protection|bot protection|are you a robot)/i.test(text.slice(0, 20000));
  }
  return false;
}

export async function* analyze(input, { env, platform, store, prevId = null, ip = null }) {
  const url = normalizeUrl(input);
  const host = displayHost(url);
  yield { type: 'accepted', url: url.toString(), host, steps: STEPS };

  const cacheKey = `cache:${await sha256Hex(url.toString())}`;
  if (!prevId && store) {
    const cachedId = await store.get(cacheKey);
    if (cachedId) {
      const report = await store.getJson(`report:${cachedId}`);
      if (report) {
        for (const s of STEPS) yield { type: 'step', id: s.id, label: s.label, status: 'done', cached: true, summary: [] };
        yield { type: 'result', report: publicReport(report), cached: true };
        return;
      }
    }
  }

  // PSI tar längst tid – starta direkt, parallellt med HTML-hämtningen.
  const psiPromise = runPsi(url.toString(), env, platform);

  yield { type: 'step', id: 'structure', label: stepLabel('structure'), status: 'running' };
  const res = await safeFetch(url, platform);
  const ctype = res.headers.get('content-type') || '';
  const text = decodeText(res.bytes, ctype);

  if (isChallenge(res, text) || [401, 403, 407, 429, 451].includes(res.status)) {
    throw new AnalysisError('site_blocked', 'Webbplatsen blockerar automatiska besök, så vi kunde inte läsa den.', { status: res.status });
  }
  if (res.status === 404 || res.status === 410) {
    throw new AnalysisError('not_found', `Sidan finns inte (felkod ${res.status}). Kontrollera adressen.`, { status: res.status });
  }
  if (res.status >= 500) {
    throw new AnalysisError('site_error', `Webbplatsen svarade med ett serverfel (${res.status}). Försök igen om en stund.`, { status: res.status });
  }
  if (res.status >= 400) {
    throw new AnalysisError('failed', `Webbplatsen svarade med felkod ${res.status}.`, { status: res.status });
  }
  if (!/html|xml/i.test(ctype) && !/^\s*</.test(text.slice(0, 200))) {
    throw new AnalysisError('not_html', 'Adressen leder inte till en webbsida (det verkar vara en fil). Ange adressen till en sida.');
  }

  const parsed = parseHtml(text);
  const meta = metaMap(parsed);
  const finalUrl = new URL(res.url);
  yield {
    type: 'step', id: 'structure', label: stepLabel('structure'), status: 'done',
    summary: [
      finalUrl.protocol === 'https:' ? 'HTTPS aktivt' : 'Saknar HTTPS',
      `${parsed.headings.length} rubriker, ${parsed.headings.filter((h) => h.level === 1).length} st H1`,
      `${parsed.wordCount.toLocaleString('sv-SE')} ord`,
      res.redirects.length ? `${res.redirects.length} vidarebefordran` : `Svar på ${res.ttfb.toLocaleString('sv-SE')} ms`,
    ],
  };

  yield { type: 'step', id: 'seo', label: stepLabel('seo'), status: 'running' };
  const origin = finalUrl.origin;
  const small = { timeoutMs: 6000, maxBytes: 256 * 1024, accept: 'text/plain,application/xml,text/xml,*/*;q=0.5' };
  const [robotsRes, sitemapRes] = await Promise.allSettled([
    safeFetch(new URL('/robots.txt', origin), platform, small),
    safeFetch(new URL('/sitemap.xml', origin), platform, { ...small, method: 'GET' }),
  ]);
  const robots = robotsRes.status === 'fulfilled'
    ? { status: robotsRes.value.status, text: robotsRes.value.status === 200 ? decodeText(robotsRes.value.bytes, robotsRes.value.headers.get('content-type')).slice(0, 50000) : '' }
    : { status: 0, text: '' };
  const sitemapFound = sitemapRes.status === 'fulfilled' && sitemapRes.value.status === 200
    && /<(urlset|sitemapindex)/i.test(decodeText(sitemapRes.value.bytes.subarray(0, 4096), ''));
  const imgs = parsed.images.length;
  const missingAlt = parsed.images.filter((i) => i.alt === null).length;
  yield {
    type: 'step', id: 'seo', label: stepLabel('seo'), status: 'done',
    summary: [
      parsed.title ? 'Sidtitel hittad' : 'Sidtitel saknas',
      meta.description ? 'Metabeskrivning hittad' : 'Metabeskrivning saknas',
      parsed.lang ? `Språk: ${parsed.lang}` : 'Språk ej angivet',
      imgs ? `${imgs - missingAlt}/${imgs} bilder med alt` : 'Inga bilder',
    ],
  };

  yield { type: 'step', id: 'performance', label: stepLabel('performance'), status: 'running' };
  const psi = await psiPromise;
  if (psi.ok) {
    const m = psi.metrics;
    yield {
      type: 'step', id: 'performance', label: stepLabel('performance'), status: 'done', devData: psi.devData,
      summary: [
        `Lighthouse ${Math.round((psi.categories.performance ?? 0) * 100)}/100`,
        m.lcp != null ? `LCP ${fmtS(m.lcp)}` : null,
        m.cls != null ? `CLS ${m.cls.toLocaleString('sv-SE', { maximumFractionDigits: 2 })}` : null,
      ].filter(Boolean),
    };
  } else {
    yield {
      type: 'step', id: 'performance', label: stepLabel('performance'), status: 'limited',
      summary: [psiReasonText(psi.reason), `Serversvar ${res.ttfb.toLocaleString('sv-SE')} ms`],
    };
  }

  yield { type: 'step', id: 'mobile', label: stepLabel('mobile'), status: 'running' };
  const hasVp = /width\s*=\s*device-width/i.test(meta.viewport || '');
  yield {
    type: 'step', id: 'mobile', label: stepLabel('mobile'), status: 'done',
    summary: [
      hasVp ? 'Mobilanpassad viewport' : 'Ingen mobil-viewport',
      psi.ok && psi.metrics.fcp != null ? `Första innehåll ${fmtS(psi.metrics.fcp)}` : null,
      parsed.anchors.some((a) => /^tel:/i.test(a.href)) ? 'Klickbart telefonnummer' : 'Inget klickbart telefonnummer',
    ].filter(Boolean),
  };

  yield { type: 'step', id: 'compile', label: stepLabel('compile'), status: 'running' };
  const ai = await runAiAssessment({ url: finalUrl.toString(), parsed, meta, screenshot: psi.ok ? psi.screenshot : null }, env, platform);
  const checks = buildChecks({
    url: finalUrl.toString(),
    parsed,
    fetch: { status: res.status, headers: res.headers, ttfb: res.ttfb, bytesLength: res.bytes.byteLength, truncated: res.truncated, redirects: res.redirects },
    robots,
    sitemapFound,
    psi: psi.ok ? psi : null,
  });
  const score = scoreReport({ checks, psi, ai });

  let previous = null;
  if (prevId && store && /^[a-z0-9]{8,20}$/.test(prevId)) {
    const prev = await store.getJson(`report:${prevId}`);
    if (prev && prev.host === host) {
      previous = {
        id: prev.id, createdAt: prev.createdAt, total: prev.score.total,
        categories: Object.fromEntries(prev.score.categories.map((c) => [c.id, c.score])),
      };
    }
  }

  const id = newId();
  const ownerToken = newToken();
  const report = {
    id,
    version: 1,
    createdAt: new Date().toISOString(),
    url: url.toString(),
    finalUrl: finalUrl.toString(),
    host,
    redirects: res.redirects.map((r) => ({ to: r.to, status: r.status })),
    devData: !!(psi.ok && psi.devData) || (env.DEV_SITE_FIXTURES === '1' && host.endsWith('.fixtures.wimco.dev')),
    screenshot: psi.ok ? psi.screenshot : null,
    psi: psi.ok
      ? { ok: true, lighthouseVersion: psi.lighthouseVersion, fetchTime: psi.fetchTime, categories: psi.categories, metrics: psi.metrics, field: psi.field, opportunities: psi.opportunities }
      : { ok: false, reason: psi.reason, reasonText: psiReasonText(psi.reason) },
    ai: ai.ok ? { ok: true, model: ai.model } : { ok: false, reason: ai.reason },
    score,
    checks: decorateChecks(checks),
    previous,
    public: false,
    ownerHash: await sha256Hex(ownerToken),
  };

  if (store) {
    await store.putJson(`report:${id}`, report, REPORT_TTL);
    if (!report.devData) await store.put(cacheKey, id, CACHE_TTL);
  }

  yield {
    type: 'step', id: 'compile', label: stepLabel('compile'), status: 'done',
    summary: [`${score.priorities.fixFirst.length} saker att åtgärda först`, `${score.priorities.good.length} styrkor`, ai.ok ? 'AI-bedömning klar' : null].filter(Boolean),
  };
  yield { type: 'result', report: publicReport(report), ownerToken };
}

export function publicReport(report) {
  const { ownerHash, ...rest } = report;
  return rest;
}

export function psiReasonText(reason) {
  switch (reason) {
    case 'disabled': return 'Lighthouse-mätning är avstängd';
    case 'quota': return 'Lighthouse-kvoten är slut för stunden – prestanda bedömd med regler';
    case 'timeout': return 'Lighthouse-testet tog för lång tid – prestanda bedömd med regler';
    case 'lighthouse_failed': return 'Lighthouse kunde inte ladda sidan – prestanda bedömd med regler';
    default: return 'Lighthouse-mätning ej tillgänglig – prestanda bedömd med regler';
  }
}
