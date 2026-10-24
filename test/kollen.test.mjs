import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../lib/router.js';
import { memoryKv } from '../server/dev.mjs';
import { preparePages, checkWithdrawal, checkPrices, checkGreenClaims, checkTracking, trackersInHtml } from '../lib/kollen/checks.js';
import { diffReports, verdictFor } from '../lib/kollen/run.js';
import { kollenTotal } from '../lib/leads.js';
import { testPlatform, ENV, req, ndjson } from './helpers.mjs';

const page = (html, kind = 'start') => preparePages([{ kind, url: 'https://butik.se/', html }]);

test('ångerknapp: funktionen räknas, information om ångerrätten räcker inte', () => {
  const ok = checkWithdrawal(page('<footer><a href="/angra">Ångra avtalet här</a></footer>'));
  assert.equal(ok.status, 'pass');
  const viaHref = checkWithdrawal(page('<a href="/pages/angra-kop">Returer</a>'));
  assert.equal(viaHref.status, 'pass');
  const info = checkWithdrawal(page('<footer><a href="/pages/angerratt">Ångerrätt</a></footer>'));
  assert.equal(info.status, 'fail');
  assert.ok(info.findings.some((f) => /information om ångerrätten/i.test(f.title)));
  assert.equal(checkWithdrawal(page('<p>Hej</p>')).status, 'fail');
});

test('rabattpriser: rött utan lägsta pris 30 dagar, grönt med, gult när bara rea marknadsförs', () => {
  const sale = '<div class="price price--on-sale"><s>199 kr</s> 149 kr</div>';
  assert.equal(checkPrices(page(sale, 'product')).status, 'fail');
  assert.equal(checkPrices(page(`${sale}<p>Lägsta pris de senaste 30 dagarna: 159 kr</p>`, 'product')).status, 'pass');
  assert.equal(checkPrices(page('<p>Ord. pris 299 kr</p>', 'product')).status, 'fail');
  assert.equal(checkPrices(page('<nav><a href="/rea">Rea</a></nav><p>149 kr</p>')).status, 'warn');
  assert.equal(checkPrices(page('<p>149 kr</p>')).status, 'pass');
  // Ett genomstruket ord utan pris är ingen rabatt
  assert.equal(checkPrices(page('<p><s>slutsåld</s></p>')).status, 'pass');
});

test('miljöpåståenden: klimatneutral och miljövänlig är röda, hållbar gul, vanliga ord ignoreras', () => {
  const r = checkGreenClaims(page('<p>Klimatneutral frakt och miljövänliga påsar. Hållbar kvalitet.</p>'));
  assert.equal(r.status, 'fail');
  const titles = r.findings.map((f) => f.title).join(' | ');
  assert.match(titles, /Klimatneutral/);
  assert.match(titles, /miljövänliga/);
  assert.match(titles, /Hållbar/);
  assert.equal(checkGreenClaims(page('<p>Hållbara material.</p>')).status, 'warn');
  // "grön" som färg och ord som bara innehåller bokstäverna ska inte flaggas
  assert.equal(checkGreenClaims(page('<p>Grön tröja i ull. Miljöpartiet. Ohållbart billig.</p>')).status, 'pass');
});

test('spårning: utan samtyckeslösning rött, med samtyckeslösning gult, blockerade skript ignoreras', () => {
  const pixel = '<script src="https://connect.facebook.net/en_US/fbevents.js"></script>';
  assert.equal(checkTracking(page(pixel)).status, 'fail');
  const withCmp = checkTracking(page(`<script src="https://consent.cookiebot.com/uc.js"></script>${pixel}`));
  assert.equal(withCmp.status, 'warn');
  assert.equal(withCmp.cmp, 'Cookiebot');
  const blocked = '<script type="text/plain" data-cookieconsent="marketing" src="https://connect.facebook.net/en_US/fbevents.js"></script>';
  assert.equal(trackersInHtml(blocked).size, 0);
  assert.equal(checkTracking(page(blocked)).status, 'pass');
  assert.equal(checkTracking(page('<script>var x=1</script>')).status, 'pass');
  assert.equal(checkTracking(page('<script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABCD12"></script>')).status, 'warn');
});

test('spårning: uppmätta nätverksanrop hittar pixlar som lagts till med JavaScript', () => {
  const r = checkTracking(page('<p>Inget i koden</p>'), { requests: ['https://butik.se/', 'https://analytics.tiktok.com/i18n/pixel/events.js'] });
  assert.equal(r.method, 'measured');
  assert.equal(r.status, 'fail');
  assert.match(r.findings[0].title, /TikTok-pixeln laddades innan samtycke/);
  const cookieless = checkTracking(page('<script src="https://consent.cookiebot.com/uc.js"></script>'), {
    requests: ['https://region1.google-analytics.com/g/collect?v=2&gcs=G100'],
  });
  assert.equal(cookieless.status, 'warn');
  assert.match(cookieless.findings[0].detail, /cookiefria/);
});

test('jämförelse mellan två kontroller och totalpris', () => {
  const a = { areas: [{ id: 'angerknapp', status: 'pass' }, { id: 'miljo', status: 'fail' }] };
  const b = { areas: [{ id: 'angerknapp', status: 'fail' }, { id: 'miljo', status: 'pass' }] };
  assert.deepEqual(diffReports(a, b), { worse: [{ id: 'angerknapp', from: 'pass', to: 'fail' }], better: [{ id: 'miljo', from: 'fail', to: 'pass' }] });
  assert.equal(kollenTotal(['angerknapp', 'rabatter']), '17 800 kr');
  assert.equal(kollenTotal(['tillganglighet', 'bevakning']), 'från 34 900 kr + 1 990 kr/mån');
  assert.match(verdictFor({ fail: 2, warn: 1, pass: 2 }), /^2 av 5/);
});

test('API: E-handelskollen strömmar alla fem områden och sparar resultatet', async () => {
  const kv = memoryKv(null);
  const call = (r) => handle(r, ENV, testPlatform({ kv }));
  const res = await call(req('/api/kollen', { method: 'POST', body: { url: 'butik.fixtures.wimco.dev' } }));
  assert.equal(res.status, 200);
  const events = await ndjson(res);
  const areas = events.filter((e) => e.type === 'area').map((e) => [e.id, e.status]);
  assert.deepEqual(areas.map(([id]) => id), ['tillganglighet', 'angerknapp', 'rabatter', 'miljo', 'sparning']);
  const r = events.at(-1).report;
  assert.equal(r.kind, 'kollen');
  const status = Object.fromEntries(r.areas.map((a) => [a.id, a.status]));
  assert.deepEqual(status, { tillganglighet: 'fail', angerknapp: 'fail', rabatter: 'fail', miljo: 'fail', sparning: 'fail' });
  assert.equal(r.areas.find((a) => a.id === 'sparning').method, 'measured');
  assert.ok(r.pages.find((p) => p.kind === 'product').read, 'produktsidans kod lästes');
  assert.equal(r.summary.fail, 5);
  assert.ok(r.a11yId);
  assert.equal((await call(req(`/api/kollen/${r.id}`))).status, 200);
  assert.equal((await call(req(`/api/a11y/${r.a11yId}`))).status, 200, 'tillgänglighetsresultatet sparas också');
});

test('beställning från kollen: flera paket, totalpris och resultat i mejlen', async () => {
  const kv = memoryKv(null);
  const sent = [];
  const platform = testPlatform({ kv });
  platform.trustedFetch = async (url, init) => {
    if (String(url).includes('resend.com')) { sent.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); }
    throw new Error('oväntat anrop');
  };
  const env = { ...ENV, RESEND_API_KEY: 'test' };
  const call = (r) => handle(r, env, platform);
  const k = (await ndjson(await call(req('/api/kollen', { method: 'POST', body: { url: 'butik.fixtures.wimco.dev' } })))).at(-1).report;
  sent.length = 0;

  const bad = await call(req('/api/lead', { method: 'POST', body: { kind: 'kollen_order', email: 'a@b.se', packages: ['nope'], startedAt: Date.now() - 10000 } }));
  assert.equal(bad.status, 422);
  assert.ok((await bad.json()).errors.packages);

  const ok = await call(req('/api/lead', { method: 'POST', body: {
    kind: 'kollen_order', packages: ['angerknapp', 'rabatter', 'bevakning', 'angerknapp'], name: 'Anna', company: 'Testbutiken AB',
    email: 'anna@butik.se', site: 'butik.se', kollenId: k.id, terms: true, startedAt: Date.now() - 10000,
  } }));
  assert.equal(ok.status, 200);
  const [toCustomer, toWimco] = sent;
  assert.deepEqual(toCustomer.to, ['anna@butik.se']);
  assert.match(toCustomer.text, /17 800 kr \+ 1 990 kr\/mån/);
  assert.match(toCustomer.text, /inte juridisk rådgivning/);
  assert.match(toWimco.subject, /E-handelskollen: 3 paket/);
  assert.match(toWimco.text, /Ångerknapp: rött/);
  assert.match(toWimco.text, new RegExp(`/e-handelskollen/\\?r=${k.id}`));
});

test('bevakning: kräver hemlighet, kör förfallna butiker och mejlar förändringar', async () => {
  const kv = memoryKv(null);
  const sent = [];
  const platform = testPlatform({ kv });
  platform.trustedFetch = async (url, init) => {
    if (String(url).includes('resend.com')) { sent.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); }
    throw new Error('oväntat anrop');
  };
  const env = { ...ENV, RESEND_API_KEY: 'test', CRON_SECRET: 's3cret' };
  const call = (r) => handle(r, env, platform);
  const auth = { authorization: 'Bearer s3cret', 'content-type': 'application/json' };

  assert.equal((await call(req('/api/admin/watch', { method: 'POST', body: { url: 'butik.fixtures.wimco.dev' } }))).status, 403);
  const add = await call(req('/api/admin/watch', { method: 'POST', body: { url: 'butik.fixtures.wimco.dev', email: 'kund@butik.se' }, headers: auth }));
  assert.equal(add.status, 200);
  const list = await (await call(req('/api/admin/watch', { headers: auth }))).json();
  assert.equal(list.watches.length, 1);

  const run1 = await (await call(req('/api/cron/kollen', { method: 'POST', headers: auth }))).json();
  assert.equal(run1.checked, 1);
  assert.equal(run1.ran[0].summary.fail, 5);
  assert.equal(sent.length, 2, 'Wimco och kunden får var sitt mejl');
  assert.match(sent[0].subject, /Bevakning: butik\.fixtures\.wimco\.dev – 5 röda/);
  assert.deepEqual(sent[1].to, ['kund@butik.se']);

  // Samma dag: inget förfallet
  const run2 = await (await call(req('/api/cron/kollen', { method: 'POST', headers: auth }))).json();
  assert.equal(run2.checked, 0);

  assert.equal((await call(req('/api/admin/watch', { method: 'DELETE', body: { url: 'butik.fixtures.wimco.dev' }, headers: auth }))).status, 200);
  assert.equal((await (await call(req('/api/admin/watch', { headers: auth }))).json()).watches.length, 0);
});
