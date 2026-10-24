// E-handelskollen: kör tillgänglighetstestet och fyra kontroller av sidornas kod, och strömmar resultatet.
//
// Händelser (NDJSON, samma ström som /api/a11y): accepted, step, pages, page (tillgänglighet per sida),
// area (ett av de fem områdena är klart) och result.
import { AnalysisError } from '../net/url-guard.js';
import { newId } from '../util/ids.js';
import { checkAccessibility, fetchHtml } from '../a11y/check.js';
import { preparePages, checkWithdrawal, checkPrices, checkGreenClaims, checkTracking, a11yArea } from './checks.js';
import { AREAS } from './catalog.js';

export const KOLLEN_TTL = 60 * 60 * 24 * 365; // ett år, så att bevakningen kan jämföra med förra månaden

export async function* runKollen(input, { env, platform, store, productInput = null }) {
  let startPage = null;
  let requests = null;
  let pages = null;
  let otherHtml = null;
  let a11y = null;

  const hooks = {
    noCache: true,
    network: true,
    onStart: ({ html, url }) => { startPage = { kind: 'start', url, html }; },
    onMeasured: (kind, r) => { if (kind === 'start' && Array.isArray(r.requests)) requests = r.requests; },
  };

  for await (const ev of checkAccessibility(input, { env, platform, store, productInput, hooks })) {
    if (ev.type === 'result') { a11y = ev.report; break; }
    if (ev.type === 'pages') {
      pages = ev.pages;
      // Produkt- och söksidans HTML hämtas medan Lighthouse mäter.
      otherHtml = Promise.all(
        ev.pages
          .filter((p) => p.url && p.kind !== 'start')
          .map((p) => fetchHtml(p.url, platform).then((html) => ({ kind: p.kind, url: p.url, html }), () => null)),
      );
    }
    yield ev;
  }
  if (!a11y || !startPage) throw new AnalysisError('failed', 'Kontrollen avbröts innan den var klar. Försök igen.');

  yield { type: 'area', ...brief(a11yArea(a11y)) };

  yield { type: 'step', id: 'texts', status: 'running', label: 'Kontrollerar ångerknapp, priser, miljöpåståenden och spårning' };
  const fetched = otherHtml ? (await otherHtml).filter(Boolean) : [];
  const prepared = preparePages([startPage, ...fetched]);
  const areas = [a11yArea(a11y), checkWithdrawal(prepared), checkPrices(prepared), checkGreenClaims(prepared), checkTracking(prepared, { requests })];
  for (const a of areas.slice(1)) yield { type: 'area', ...brief(a) };
  yield { type: 'step', id: 'texts', status: 'done', label: 'Kontrollerar ångerknapp, priser, miljöpåståenden och spårning' };

  const report = buildReport({ input, a11y, pages, areas, fetchedKinds: prepared.map((p) => p.kind) });
  if (store) await store.putJson(`kollen:${report.id}`, report, KOLLEN_TTL);
  yield { type: 'result', report };
}

const brief = (a) => ({ id: a.id, status: a.status, summary: a.summary });

export function buildReport({ a11y, pages, areas, fetchedKinds }) {
  const order = new Map(AREAS.map((a, i) => [a.id, i]));
  areas.sort((x, y) => order.get(x.id) - order.get(y.id));
  const count = (s) => areas.filter((a) => a.status === s).length;
  const summary = { fail: count('fail'), warn: count('warn'), pass: count('pass'), unknown: count('unknown') };
  return {
    id: newId(),
    kind: 'kollen',
    version: 1,
    createdAt: new Date().toISOString(),
    url: a11y.url,
    host: a11y.host,
    devData: !!a11y.devData,
    platform: a11y.platform,
    a11yId: a11y.id,
    pages: (pages || []).map((p) => ({ kind: p.kind, url: p.url, source: p.source, read: fetchedKinds.includes(p.kind) })),
    areas,
    summary,
    verdict: verdictFor(summary),
  };
}

export function verdictFor(s) {
  if (s.fail) return `${s.fail} av 5 områden är röda. ${s.fail === 1 ? 'Det behöver' : 'De behöver'} åtgärdas.`;
  if (s.warn) return `Inget rött, men ${s.warn} ${s.warn === 1 ? 'område behöver' : 'områden behöver'} kontrolleras.`;
  return 'Alla fem områdena är gröna i den automatiska kontrollen.';
}

/** Compares two kollen reports area by area: which got worse and which got better. */
export function diffReports(prev, next) {
  const rank = { pass: 0, unknown: 1, warn: 2, fail: 3 };
  const before = new Map((prev?.areas || []).map((a) => [a.id, a.status]));
  const worse = [];
  const better = [];
  for (const a of next.areas) {
    const was = before.get(a.id);
    if (was === undefined) continue;
    if (rank[a.status] > rank[was]) worse.push({ id: a.id, from: was, to: a.status });
    if (rank[a.status] < rank[was]) better.push({ id: a.id, from: was, to: a.status });
  }
  return { worse, better };
}
