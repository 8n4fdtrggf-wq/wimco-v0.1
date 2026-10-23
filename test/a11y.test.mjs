import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../lib/router.js';
import { memoryKv } from '../server/dev.mjs';
import { parseHtml } from '../lib/analysis/html-parse.js';
import { findProductUrl, findSearchUrl, detectExtras, normalizeA11y, compile } from '../lib/a11y/check.js';
import { a11yFixture } from '../lib/analysis/psi-fixture.js';
import { testPlatform, ENV, req, ndjson } from './helpers.mjs';

function setup(env = ENV) {
  const kv = memoryKv(null);
  const platform = testPlatform({ kv });
  return { kv, platform, call: (r) => handle(r, env, platform) };
}

const BASE = new URL('https://butik.se/');

test('hittar en produktsida men inte kategorier, listsidor eller andra sajter', () => {
  const parsed = parseHtml(`
    <a href="/collections/skor">Skor</a>
    <a href="/products">Alla</a>
    <a href="https://annan.se/products/x">Annan</a>
    <a href="/product-category/skor/">Kategori</a>
    <a href="/produkt/ullsocka/">Ullsocka</a>`);
  assert.equal(findProductUrl(parsed, BASE), 'https://butik.se/produkt/ullsocka/');
  assert.equal(findProductUrl(parseHtml('<a href="/om-oss">Om</a>'), BASE), null);
});

test('bygger sökadressen från formuläret, inklusive dolda fält', () => {
  const html = `<form method="post" action="/login"><input name="q"></form>
    <form action="/" role="search"><input type="hidden" name="post_type" value="product"><input type="text" name="s"></form>`;
  const s = findSearchUrl(html, BASE, null);
  assert.equal(s.source, 'found');
  const u = new URL(s.url);
  assert.equal(u.searchParams.get('s'), 'test');
  assert.equal(u.searchParams.get('post_type'), 'product');
});

test('faller tillbaka på plattformens sökadress och ger upp utan ledtrådar', () => {
  assert.deepEqual(findSearchUrl('<p>inget</p>', BASE, 'shopify'), { url: 'https://butik.se/search?q=test', source: 'guess' });
  assert.equal(findSearchUrl('<p>inget</p>', BASE, null), null);
  assert.equal(findSearchUrl('<form action="https://annan.se/s"><input type="search" name="q"></form>', BASE, null), null);
});

test('känner igen plattform, overlay-verktyg och länk till tillgänglighetsredogörelse', () => {
  const html = '<script src="https://cdn.userway.org/widget.js"></script><link href="//cdn.shopify.com/x.css"><a href="/pages/tillganglighet">Tillgänglighet</a>';
  const x = detectExtras(html, parseHtml(html), BASE);
  assert.equal(x.platform.id, 'shopify');
  assert.equal(x.overlay.name, 'UserWay');
  assert.deepEqual(x.statement, { found: true, url: 'https://butik.se/pages/tillganglighet' });
});

test('tolkar Lighthouse: underkända granskningar med exempel, manuella räknas för sig', () => {
  const r = normalizeA11y(a11yFixture('https://butik.se/'), { devData: true });
  assert.equal(r.ok, true);
  assert.ok(r.score >= 0 && r.score <= 100);
  assert.equal(r.manual, 2);
  const cc = r.failing.find((f) => f.id === 'color-contrast');
  assert.equal(cc.count, 2);
  assert.match(cc.examples[0].snippet, /announcement/);
  assert.doesNotMatch(cc.description, /\]\(/, 'markdownlänkar tas bort');
  assert.equal(normalizeA11y({}, { devData: false }).ok, false);
});

test('slår ihop fel från flera sidor och sorterar kritiska först', () => {
  const page = (kind, failing) => ({ kind, ok: true, score: 70, failing });
  const f = (id, count = 1) => ({ id, weight: 7, title: id, description: '', count, examples: [] });
  const { issues, summary } = compile([
    page('start', [f('heading-order'), f('color-contrast', 3)]),
    page('product', [f('image-alt', 5), f('color-contrast', 2)]),
    { kind: 'search', ok: false },
  ]);
  assert.deepEqual(issues.map((i) => i.id), ['image-alt', 'color-contrast', 'heading-order']);
  assert.deepEqual(issues[1].pages, ['start', 'product']);
  assert.equal(issues[1].count, 5);
  assert.equal(issues[1].wcag[0], '1.4.3');
  assert.deepEqual([summary.pagesTested, summary.critical, summary.serious, summary.moderate], [2, 1, 1, 1]);
});

test('API: strömmar test av startsida, produktsida och sök och sparar resultatet', async () => {
  const { call } = setup();
  const res = await call(req('/api/a11y', { method: 'POST', body: { url: 'butik.fixtures.wimco.dev' } }));
  assert.equal(res.status, 200);
  const events = await ndjson(res);
  const pages = events.find((e) => e.type === 'pages').pages;
  assert.deepEqual(pages.map((p) => [p.kind, p.source]), [['start', 'given'], ['product', 'found'], ['search', 'found']]);
  assert.match(pages[1].url, /\/products\/ullsocka-gra/);
  assert.match(pages[2].url, /\/search\?type=product&q=test$/);
  assert.equal(events.filter((e) => e.type === 'page').length, 3);
  const result = events.at(-1);
  assert.equal(result.type, 'result');
  const r = result.report;
  assert.equal(r.devData, true);
  assert.equal(r.overlay.name, 'UserWay');
  assert.equal(r.platform.id, 'shopify');
  assert.equal(r.statement.found, false);
  assert.ok(r.issues.length > 0);
  assert.ok(r.verdict.length > 10);

  const again = await call(req(`/api/a11y/${r.id}`));
  assert.equal(again.status, 200);
  assert.equal((await again.json()).id, r.id);
  assert.equal((await call(req('/api/a11y/finnsintealls'))).status, 404);
});

test('API: egen produktsida måste ligga på samma sajt, och SSRF-mål nekas', async () => {
  const { call } = setup();
  const res = await call(req('/api/a11y', { method: 'POST', body: { url: 'butik.fixtures.wimco.dev', product: 'https://annan-butik.se/products/x' } }));
  assert.equal(res.status, 400);
  for (const url of ['http://127.0.0.1', 'http://169.254.169.254/']) {
    const r = await call(req('/api/a11y', { method: 'POST', body: { url } }));
    assert.ok([400, 422].includes(r.status), url);
  }
  const other = await call(req('/api/a11y', { method: 'POST', body: { url: 'butik.fixtures.wimco.dev' }, origin: 'https://evil.example' }));
  assert.equal(other.status, 403);
});

test('API: rate limit efter tre tester på tio minuter', async () => {
  const { call } = setup();
  const statuses = [];
  for (let i = 0; i < 4; i++) statuses.push((await call(req('/api/a11y', { method: 'POST', body: { url: 'inte giltig' } }))).status);
  assert.deepEqual(statuses, [400, 400, 400, 429]);
});

test('beställning: valideras, sparas, mejlar Wimco och bekräftar till kunden', async () => {
  const kv = memoryKv(null);
  const sent = [];
  const platform = testPlatform({ kv });
  platform.trustedFetch = async (url, init) => {
    if (String(url).includes('resend.com')) { sent.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); }
    throw new Error('oväntat anrop');
  };
  const env = { ...ENV, RESEND_API_KEY: 'test', LEAD_TO_EMAIL: 'hej@wimco.se' };
  const call = (r) => handle(r, env, platform);

  const test1 = await ndjson(await call(req('/api/a11y', { method: 'POST', body: { url: 'butik.fixtures.wimco.dev' } })));
  const a11yId = test1.at(-1).report.id;

  const bad = await call(req('/api/lead', { method: 'POST', body: { kind: 'a11y_order', email: 'kund@butik.se', startedAt: Date.now() - 10000 } }));
  assert.equal(bad.status, 422);
  const errs = (await bad.json()).errors;
  assert.deepEqual(Object.keys(errs).sort(), ['company', 'name', 'package', 'site', 'terms']);

  const ok = await call(req('/api/lead', { method: 'POST', body: {
    kind: 'a11y_order', package: 'atgard', name: 'Anna Andersson', company: 'Testbutiken AB', email: 'anna@butik.se',
    site: 'butik.se', platform: 'shopify', size: '10-49', a11yId, terms: true, startedAt: Date.now() - 10000,
  } }));
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).mailed, true);
  assert.equal(sent.length, 2);
  const [toCustomer, toWimco] = sent;
  assert.deepEqual(toCustomer.to, ['anna@butik.se']);
  assert.match(toCustomer.subject, /Granskning och åtgärd/);
  assert.match(toCustomer.text, /Inget är bindande/);
  assert.match(toCustomer.text, new RegExp(`/tillganglighet/\\?r=${a11yId}`));
  assert.deepEqual(toWimco.to, ['hej@wimco.se']);
  assert.equal(toWimco.reply_to, 'anna@butik.se');
  assert.match(toWimco.subject, /Beställning: Granskning och åtgärd – Testbutiken AB/);
  assert.match(toWimco.text, /Plattform: Shopify/);
  assert.match(toWimco.text, /overlay: UserWay/);
  const stored = (await kv.list({ prefix: 'lead:' })).keys;
  assert.equal(stored.length, 1);
});

/* ---------- Reservkontroll och omförsök ---------- */
import { checkHtml } from '../lib/a11y/rules.js';

test('regelkontrollen hittar vanliga fel i HTML och ger poäng', () => {
  const r = checkHtml(`<!doctype html><html><head><title>Butik</title>
    <meta name="viewport" content="width=device-width, maximum-scale=1"></head><body>
    <header><button class="cart"><svg></svg></button><a href="/"><img src="/logo.png"></a>
    <form><input type="search" name="q" placeholder="Sök"></form></header>
    <h1>Butik</h1><h3>Nyheter</h3>
    <img src="/a.jpg" alt=""><img src="/b.jpg" alt="Röd jacka">
    <label for="e">E-post</label><input id="e" type="email">
    <iframe src="https://chat.example"></iframe>
    <a href="/om">Om oss</a><button aria-label="Stäng">×</button></body></html>`);
  const ids = r.failing.map((f) => f.id).sort();
  assert.deepEqual(ids, ['button-name', 'frame-title', 'heading-order', 'html-has-lang', 'image-alt', 'label', 'landmark-one-main', 'link-name', 'meta-viewport']);
  assert.equal(r.method, 'rules');
  assert.ok(r.score > 0 && r.score < 100);
  assert.match(r.failing.find((f) => f.id === 'button-name').examples[0].snippet, /class="cart"/);
  const clean = checkHtml('<html lang="sv"><head><title>Ok</title></head><body><main><h1>Hej</h1><a href="/x">Läs mer</a></main></body></html>');
  assert.deepEqual(clean.failing, []);
  assert.equal(clean.score, 100);
});

test('API: när Lighthouse inte svarar kontrolleras koden direkt och resultatet märks', async () => {
  const kv = memoryKv(null);
  const platform = testPlatform({ kv });
  const env = { DEV_SITE_FIXTURES: '1', PSI_DISABLED: '1', IP_HASH_SALT: 'test', SITE_URL: 'https://wimco.se', A11Y_RETRY_MS: '1' };
  const events = await ndjson(await handle(req('/api/a11y', { method: 'POST', body: { url: 'butik.fixtures.wimco.dev' } }), env, platform));
  const result = events.at(-1);
  assert.equal(result.type, 'result', JSON.stringify(events.at(-1)));
  const r = result.report;
  assert.equal(r.summary.method, 'rules');
  assert.ok(r.pages.find((p) => p.kind === 'start').ok);
  assert.equal(r.pages.find((p) => p.kind === 'start').method, 'rules');
  assert.deepEqual(r.pages.map((p) => [p.kind, p.ok, p.method]), [['start', true, 'rules'], ['product', true, 'rules'], ['search', true, 'rules']]);
  assert.ok(r.issues.find((i) => i.id === 'image-alt').pages.includes('product'));
  assert.ok(r.issues.some((i) => i.id === 'select-name'), 'storleksväljaren saknar etikett');
  assert.ok(r.issues.some((i) => i.id === 'button-name'), 'ikonknappen i sökformuläret saknar namn');
  // Reservresultat cachas inte: nästa test ska få chansen till en riktig mätning
  assert.equal((await kv.list({ prefix: 'a11ycache:' })).keys.length, 0);
});

test('API: 429 från PageSpeed försöks igen innan reserven används', async () => {
  const kv = memoryKv(null);
  const platform = testPlatform({ kv });
  const { a11yFixture } = await import('../lib/analysis/psi-fixture.js');
  let calls = 0;
  platform.trustedFetch = async (url) => {
    const u = new URL(url);
    calls++;
    if (calls <= 2) return new Response('quota', { status: 429 });
    return new Response(JSON.stringify(a11yFixture(u.searchParams.get('url'))), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const env = { DEV_SITE_FIXTURES: '1', IP_HASH_SALT: 'test', SITE_URL: 'https://wimco.se', A11Y_RETRY_MS: '1' };
  const events = await ndjson(await handle(req('/api/a11y', { method: 'POST', body: { url: 'butik.fixtures.wimco.dev' } }), env, platform));
  const r = events.at(-1).report;
  assert.equal(r.summary.method, 'lighthouse');
  assert.equal(r.pages.filter((p) => p.ok).length, 3);
  assert.ok(calls >= 5, `förväntade omförsök, fick ${calls} anrop`);
});
