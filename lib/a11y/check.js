// Tillgänglighetstestet för e-handel. Testar de sidtyper PTS granskar i sin tillsyn
// (startsida, produktsida, sökfunktion) med Lighthouse-kategorin "accessibility", som bygger
// på axe-core. Strömmar delresultat i den ordning de blir klara, precis som Wimco Score.
//
// Sajtens kod körs aldrig här: startsidan hämtas som text för att hitta en produktsida och
// sökformuläret, och själva mätningen görs av Google PageSpeed Insights.
import { AnalysisError, normalizeUrl, displayHost } from '../net/url-guard.js';
import { safeFetch, decodeText } from '../net/safe-fetch.js';
import { parseHtml } from '../analysis/html-parse.js';
import { runPsi } from '../analysis/psi.js';
import { psiReasonText } from '../analysis/analyze.js';
import { newId, sha256Hex } from '../util/ids.js';
import { auditInfo, SEVERITY_ORDER, PAGE_KINDS, OVERLAYS, PLATFORMS } from './catalog.js';
import { checkHtml } from './rules.js';

export const A11Y_TTL = 60 * 60 * 24 * 180; // 180 dagar, som rapporterna
const CACHE_TTL = 60 * 15;
const SEARCH_TERM = 'test';
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const sameSite = (a, b) => a.replace(/^www\./, '') === b.replace(/^www\./, '');

/* ---------- Hitta sidorna ---------- */

const PRODUCT_PATH = /\/(products?|produkt(er)?|p|artikel|artiklar|item|varor?)\/[^/?#]{2,}/i;
const NOT_PRODUCT = /\/(collections?|kategori(er)?|category|categories|tag|blogs?|pages?|cart|varukorg|kassa|checkout|account|konto|login|search|sok)(\/|$)/i;
const SEARCH_NAMES = new Set(['q', 's', 'search', 'query', 'sok', 'sök', 'searchterm', 'search_query', 'term', 'keyword', 'keywords', 'k']);
const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null;
};
const decode = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&#x2F;|&#47;/gi, '/').replace(/&quot;/g, '"');

export function findProductUrl(parsed, base) {
  const host = base.hostname;
  for (const a of parsed.anchors) {
    if (!a.href || /^(#|mailto:|tel:|javascript:)/i.test(a.href)) continue;
    let u;
    try { u = new URL(decode(a.href), base); } catch { continue; }
    if (!/^https?:$/.test(u.protocol) || !sameSite(u.hostname, host)) continue;
    if (PRODUCT_PATH.test(u.pathname) && !NOT_PRODUCT.test(u.pathname)) {
      u.hash = '';
      return u.toString();
    }
  }
  return null;
}

export function findSearchUrl(html, base, platformId) {
  const forms = html.slice(0, 2 * 1024 * 1024).match(/<form\b[^>]*>[\s\S]*?<\/form>/gi) || [];
  for (const form of forms.slice(0, 40)) {
    const openTag = form.slice(0, form.indexOf('>') + 1);
    const method = (attr(openTag, 'method') || 'get').toLowerCase();
    if (method !== 'get') continue;
    const inputs = form.match(/<input\b[^>]*>/gi) || [];
    let field = null;
    const hidden = [];
    for (const tag of inputs) {
      const type = (attr(tag, 'type') || 'text').toLowerCase();
      const name = attr(tag, 'name');
      if (!name) continue;
      if (type === 'hidden') { hidden.push([name, decode(attr(tag, 'value') || '')]); continue; }
      if (!field && (type === 'search' || ((type === 'text' || type === 'search') && SEARCH_NAMES.has(name.toLowerCase())))) field = name;
    }
    if (!field) continue;
    let u;
    try { u = new URL(decode(attr(openTag, 'action') || base.pathname), base); } catch { continue; }
    if (!/^https?:$/.test(u.protocol) || !sameSite(u.hostname, base.hostname)) continue;
    for (const [k, v] of hidden.slice(0, 6)) if (k.length < 40 && v.length < 80) u.searchParams.set(k, v);
    u.searchParams.set(field, SEARCH_TERM);
    u.hash = '';
    return { url: u.toString(), source: 'found' };
  }
  // Vanliga plattformar har kända sökadresser även om formuläret byggs med JavaScript.
  const guess = { shopify: `/search?q=${SEARCH_TERM}`, woocommerce: `/?s=${SEARCH_TERM}&post_type=product` }[platformId];
  if (guess) return { url: new URL(guess, base).toString(), source: 'guess' };
  return null;
}

export function detectExtras(html, parsed, base) {
  const sample = html.slice(0, 3 * 1024 * 1024);
  const scripts = parsed.scripts.map((s) => s.src || '').join(' ');
  const overlay = OVERLAYS.find((o) => o.re.test(scripts) || o.re.test(sample)) || null;
  const platform = PLATFORMS.find((p) => p.re.test(sample)) || null;
  let statementUrl = null;
  for (const a of parsed.anchors) {
    const text = `${a.text} ${a.ariaLabel} ${a.href}`;
    if (/tillg[äa]nglighet|tillganglighet|accessibility/i.test(text)) {
      try { statementUrl = new URL(decode(a.href), base).toString(); } catch { statementUrl = null; }
      if (statementUrl) break;
    }
  }
  return {
    overlay: overlay ? { name: overlay.name } : null,
    platform: platform ? { id: platform.id, name: platform.name } : null,
    statement: { found: !!statementUrl, url: statementUrl },
  };
}

/* ---------- Tolka Lighthouse ---------- */

const stripMd = (s) => clip(String(s || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`/g, ''), 420);

export function normalizeA11y(json, { devData }) {
  const lh = json?.lighthouseResult;
  const cat = lh?.categories?.accessibility;
  if (!cat || typeof cat.score !== 'number') return { ok: false, reason: 'invalid_response' };
  const failing = [];
  let passed = 0;
  let manual = 0;
  for (const ref of cat.auditRefs || []) {
    const a = lh.audits?.[ref.id];
    if (!a) continue;
    const mode = a.scoreDisplayMode;
    if (mode === 'manual') { manual++; continue; }
    if (mode === 'notApplicable' || mode === 'informative' || a.score == null) continue;
    if (a.score >= 1) { passed++; continue; }
    const items = Array.isArray(a.details?.items) ? a.details.items : [];
    failing.push({
      id: ref.id,
      weight: ref.weight || 0,
      title: clip(a.title, 180),
      description: stripMd(a.description),
      count: Math.max(items.length, 1),
      examples: items.slice(0, 3).map((it) => {
        const n = it.node || it;
        return { label: clip(n.nodeLabel, 120), snippet: clip(n.snippet, 240), selector: clip(n.selector, 160) };
      }).filter((e) => e.snippet || e.label),
    });
  }
  return {
    ok: true,
    devData: !!devData,
    score: Math.round(cat.score * 100),
    finalUrl: lh.finalDisplayedUrl || lh.finalUrl || null,
    lighthouseVersion: lh.lighthouseVersion || null,
    passed,
    manual,
    failing,
  };
}

/* ---------- Sammanställning ---------- */

export function compile(pages) {
  const byId = new Map();
  for (const page of pages) {
    if (!page.ok) continue;
    for (const f of page.failing) {
      const info = auditInfo(f.id, f.weight);
      let issue = byId.get(f.id);
      if (!issue) {
        issue = {
          id: f.id, title: f.title, description: f.description,
          wcag: info.wcag, severity: info.severity, who: info.who, fix: info.fix,
          pages: [], count: 0, examples: [],
        };
        byId.set(f.id, issue);
      }
      issue.pages.push(page.kind);
      issue.count += f.count;
      for (const ex of f.examples) if (issue.examples.length < 4) issue.examples.push({ page: page.kind, ...ex });
    }
  }
  const issues = [...byId.values()].sort((a, b) => (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) || (b.pages.length - a.pages.length) || (b.count - a.count));
  const ok = pages.filter((p) => p.ok);
  const sev = (s) => issues.filter((i) => i.severity === s).length;
  const methods = new Set(ok.map((p) => p.method || 'lighthouse'));
  return {
    issues,
    summary: {
      method: methods.size > 1 ? 'mixed' : [...methods][0] || null,
      pagesTested: ok.length,
      score: ok.length ? Math.round(ok.reduce((n, p) => n + p.score, 0) / ok.length) : null,
      lowest: ok.length ? Math.min(...ok.map((p) => p.score)) : null,
      critical: sev('critical'),
      serious: sev('serious'),
      moderate: sev('moderate'),
      total: issues.length,
      instances: issues.reduce((n, i) => n + i.count, 0),
    },
  };
}

export function verdict(summary, extras) {
  if (!summary.pagesTested) return 'Vi kunde inte mäta några av sidorna.';
  if (summary.critical) return `${summary.critical} kritiska brister: fel som kan hindra en kund från att hitta, välja eller köpa en produkt.`;
  if (summary.serious) return `${summary.serious} allvarliga brister som gör sajten svår att använda för många med funktionsnedsättning.`;
  if (summary.total) return `${summary.total} mindre brister. Bra grund, men de bör rättas.`;
  return extras.overlay
    ? 'Inga fel i de automatiska testerna. Men ett tillgänglighetsverktyg ligger ovanpå sajten, och sådana kan dölja fel lika väl som rätta dem.'
    : 'Inga fel i de automatiska testerna. Ett bra tecken, men de hittar bara en del av problemen.';
}

/* ---------- Själva testet ---------- */

function pageEntry(kind, url, source) {
  return { kind, label: PAGE_KINDS[kind], url, source };
}

function sanitizeProductUrl(input, startUrl) {
  if (!input) return null;
  const u = normalizeUrl(input);
  if (!sameSite(u.hostname, startUrl.hostname)) {
    throw new AnalysisError('invalid_url', 'Produktsidan måste ligga på samma webbplats som startsidan.');
  }
  return u.toString();
}

export async function* checkAccessibility(input, { env, platform, store, productInput = null }) {
  const url = normalizeUrl(input);
  const givenProduct = sanitizeProductUrl(productInput, url);
  const host = displayHost(url);
  yield { type: 'accepted', url: url.toString(), host };

  const cacheKey = `a11ycache:${await sha256Hex(`${url}|${givenProduct || ''}`)}`;
  if (store) {
    const cachedId = await store.get(cacheKey);
    const cached = cachedId ? await store.getJson(`a11y:${cachedId}`) : null;
    if (cached) {
      yield { type: 'result', report: cached, cached: true };
      return;
    }
  }

  yield { type: 'step', id: 'fetch', status: 'running', label: 'Läser startsidan' };
  const res = await safeFetch(url, platform);
  const ctype = res.headers.get('content-type') || '';
  const html = decodeText(res.bytes, ctype);
  if ([401, 403, 407, 429, 451].includes(res.status) || /challenge/i.test(res.headers.get('cf-mitigated') || '')) {
    throw new AnalysisError('site_blocked', 'Webbplatsen blockerar automatiska besök, så vi kunde inte läsa startsidan.');
  }
  if (res.status === 404 || res.status === 410) throw new AnalysisError('not_found', `Sidan finns inte (felkod ${res.status}). Kontrollera adressen.`);
  if (res.status >= 400) throw new AnalysisError('site_error', `Webbplatsen svarade med felkod ${res.status}.`);
  if (!/html|xml/i.test(ctype) && !/^\s*</.test(html.slice(0, 200))) {
    throw new AnalysisError('not_html', 'Adressen leder inte till en webbsida. Ange adressen till butikens startsida.');
  }
  const finalUrl = new URL(res.url);
  const parsed = parseHtml(html);
  const extras = detectExtras(html, parsed, finalUrl);
  yield { type: 'step', id: 'fetch', status: 'done', label: 'Läser startsidan', summary: [extras.platform ? `Plattform: ${extras.platform.name}` : 'Startsidan hämtad'] };

  yield { type: 'step', id: 'discover', status: 'running', label: 'Letar upp en produktsida och sökfunktionen' };
  const productUrl = givenProduct || findProductUrl(parsed, finalUrl);
  const search = findSearchUrl(html, finalUrl, extras.platform?.id);
  const pages = [
    pageEntry('start', finalUrl.toString(), 'given'),
    productUrl ? pageEntry('product', productUrl, givenProduct ? 'given' : 'found') : { ...pageEntry('product', null, 'missing') },
    search ? pageEntry('search', search.url, search.source) : { ...pageEntry('search', null, 'missing') },
  ];
  yield {
    type: 'step', id: 'discover', status: 'done', label: 'Letar upp en produktsida och sökfunktionen',
    summary: [productUrl ? 'Produktsida hittad' : 'Ingen produktsida hittad', search ? 'Sökfunktion hittad' : 'Ingen sökfunktion hittad'],
  };
  yield { type: 'pages', pages: pages.map(({ kind, label, url: u, source }) => ({ kind, label, url: u, source })) };

  yield { type: 'step', id: 'measure', status: 'running', label: 'Testar sidorna med Lighthouse (axe-core)' };
  const toMeasure = pages.filter((p) => p.url);
  const fixture = env.DEV_FIXTURES === '1' ? (await import('../analysis/psi-fixture.js')).a11yFixture : null;
  const ctx = { env, platform, fixture, startHtml: html, startUrl: finalUrl.toString() };
  const pending = new Map(toMeasure.map((p, i) => [i, measurePage(p, i, ctx).then((r) => ({ i, r }))]));
  const results = new Array(toMeasure.length);
  while (pending.size) {
    const { i, r } = await Promise.race(pending.values());
    pending.delete(i);
    results[i] = r;
    const p = toMeasure[i];
    yield r.ok
      ? { type: 'page', kind: p.kind, label: p.label, ok: true, score: r.score, issues: r.failing.length, method: r.method, devData: r.devData }
      : { type: 'page', kind: p.kind, label: p.label, ok: false, reason: r.reason };
  }

  const measured = pages.map((p) => {
    if (!p.url) return { ...p, ok: false, reason: p.kind === 'product' ? 'Vi hittade ingen länk till en produktsida på startsidan.' : 'Vi hittade inget sökformulär på startsidan.' };
    const r = results[toMeasure.indexOf(p)];
    if (!r.ok) return { ...p, ok: false, reason: r.reason };
    return { ...p, ok: true, method: r.method, score: r.score, passed: r.passed, manual: r.manual, failing: r.failing, devData: r.devData };
  });
  if (!measured.some((p) => p.ok)) {
    throw new AnalysisError('failed', measured.find((p) => p.url)?.reason || 'Mätningen misslyckades. Försök igen om en stund.');
  }
  const { issues, summary } = compile(measured);
  yield { type: 'step', id: 'measure', status: 'done', label: 'Testar sidorna med Lighthouse (axe-core)', summary: [`${summary.pagesTested} av 3 sidor testade`, `${summary.total} typer av fel`] };

  const report = {
    id: newId(),
    kind: 'a11y',
    version: 1,
    createdAt: new Date().toISOString(),
    url: url.toString(),
    host,
    devData: measured.some((p) => p.devData) || (env.DEV_SITE_FIXTURES === '1' && host.endsWith('.fixtures.wimco.dev')),
    platform: extras.platform,
    overlay: extras.overlay,
    statement: extras.statement,
    pages: measured.map((p) => ({
      kind: p.kind, label: p.label, url: p.url, source: p.source, ok: p.ok, method: p.method || null,
      score: p.score ?? null, reason: p.reason || null, passed: p.passed ?? null, manual: p.manual ?? null,
      issues: p.ok ? p.failing.map((f) => ({ id: f.id, count: f.count })) : [],
    })),
    issues,
    summary,
    verdict: verdict(summary, extras),
  };
  if (store) {
    await store.putJson(`a11y:${report.id}`, report, A11Y_TTL);
    // Resultat från reservkontrollen cachas inte, så nästa försök får en riktig Lighthouse-mätning.
    if (!report.devData && report.summary.method === 'lighthouse') await store.put(cacheKey, report.id, CACHE_TTL);
  }
  yield { type: 'result', report };
}

/* ---------- Mätning per sida: Lighthouse, omförsök, reservkontroll ---------- */

// Fel som brukar gå över: slut på kvot (429), tillfälliga serverfel, nätverk. Tidsgränser upprepas inte.
const RETRYABLE = (reason) => reason === 'quota' || reason === 'network' || /^http_5/.test(reason || '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function measurePage(page, index, { env, platform, fixture, startHtml, startUrl }) {
  const unit = Number(env.A11Y_RETRY_MS ?? 2500);
  // Sprid ut anropen: tre samtidiga anrop är det som oftast slår i PageSpeeds kvot per minut.
  if (index) await sleep(index * unit * 0.5);
  let r = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    r = await runPsi(page.url, env, platform, { categories: ['accessibility'], normalize: normalizeA11y, fixture, timeoutMs: 80000 });
    if (r.ok || !RETRYABLE(r.reason) || attempt === 2) break;
    await sleep(unit * (attempt + 1) + Math.floor(Math.random() * unit * 0.4));
  }
  if (r.ok) return { ...r, method: 'lighthouse' };

  // Reserv: kontrollera sidans HTML direkt, så att besökaren alltid får ett resultat.
  try {
    const pageHtml = page.url === startUrl ? startHtml : await fetchHtml(page.url, platform);
    return { ...checkHtml(pageHtml), method: 'rules', psiReason: r.reason };
  } catch (err) {
    const status = /^http_(\d+)$/.exec(err?.message || '')?.[1];
    return { ok: false, reason: status ? `Sidan kunde inte hämtas (felkod ${status}).` : pageReason(r.reason) };
  }
}

async function fetchHtml(url, platform) {
  const res = await safeFetch(new URL(url), platform, { timeoutMs: 10000 });
  const ctype = res.headers.get('content-type') || '';
  if (res.status >= 400) throw new Error(`http_${res.status}`);
  const text = decodeText(res.bytes, ctype);
  if (!/html|xml/i.test(ctype) && !/^\s*</.test(text.slice(0, 200))) throw new Error('not_html');
  return text;
}

function pageReason(reason) {
  if (reason === 'lighthouse_failed') return 'Lighthouse kunde inte ladda sidan.';
  return psiReasonText(reason).replace(/ – prestanda bedömd med regler$/, '') + '.';
}
