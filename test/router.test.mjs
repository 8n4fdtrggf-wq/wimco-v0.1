import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../lib/router.js';
import { memoryKv } from '../server/dev.mjs';
import { testPlatform, ENV, req, ndjson } from './helpers.mjs';

function setup(env = ENV) {
  const kv = memoryKv(null);
  const platform = testPlatform({ kv });
  return { kv, platform, call: (r) => handle(r, env, platform) };
}

test('ogiltig URL ger 400 JSON innan strömmen öppnas', async () => {
  const { call } = setup();
  const res = await call(req('/api/analyze', { method: 'POST', body: { url: 'inte en adress' } }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, 'invalid_url');
});

test('SSRF-mål nekas via API:t', async () => {
  const { call } = setup();
  for (const url of ['http://127.0.0.1', 'http://169.254.169.254', 'http://localhost:8788', 'file:///etc/passwd']) {
    const res = await call(req('/api/analyze', { method: 'POST', body: { url } }));
    assert.ok([400, 422].includes(res.status), url);
  }
});

test('analys från annan origin nekas', async () => {
  const { call } = setup();
  const res = await call(req('/api/analyze', { method: 'POST', body: { url: 'svag.fixtures.wimco.dev' }, origin: 'https://evil.example' }));
  assert.equal(res.status, 403);
});

test('strömmar NDJSON med delresultat och resultat', async () => {
  const { call } = setup();
  const res = await call(req('/api/analyze', { method: 'POST', body: { url: 'svag.fixtures.wimco.dev' } }));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /ndjson/);
  const events = await ndjson(res);
  assert.equal(events[0].type, 'accepted');
  assert.ok(events.some((e) => e.type === 'step' && e.id === 'structure' && e.status === 'done'));
  assert.equal(events.at(-1).type, 'result');
});

test('fel under analysen strömmas som error-händelse', async () => {
  const { call } = setup();
  const res = await call(req('/api/analyze', { method: 'POST', body: { url: 'blockerad.fixtures.wimco.dev' } }));
  const events = await ndjson(res);
  assert.deepEqual([events.at(-1).type, events.at(-1).code], ['error', 'site_blocked']);
});

test('rate limit efter sex analyser på tio minuter', async () => {
  const { call } = setup();
  const statuses = [];
  for (let i = 0; i < 7; i++) {
    const res = await call(req('/api/analyze', { method: 'POST', body: { url: 'inte giltig' } }));
    statuses.push(res.status);
  }
  assert.deepEqual(statuses.slice(0, 6), [400, 400, 400, 400, 400, 400]);
  assert.equal(statuses[6], 429);
});

test('rapport, delningssida med metadata och OG-bild', async () => {
  const { call } = setup();
  const events = await ndjson(await call(req('/api/analyze', { method: 'POST', body: { url: 'gamla-wimco.fixtures.wimco.dev' } })));
  const { report, ownerToken } = events.at(-1);

  const json = await (await call(req(`/api/report/${report.id}`))).json();
  assert.equal(json.id, report.id);
  assert.equal(json.ownerHash, undefined);

  const page = await call(req(`/r/${report.id}`));
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /<title>gamla-wimco\.fixtures\.wimco\.dev: \d+\/100 i Wimco Score \| Wimco<\/title>/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow"/, 'privata rapporter ska inte indexeras');
  assert.match(html, new RegExp(`og:image" content="https://wimco.se/og/${report.id}.png"`));
  assert.match(page.headers.get('x-robots-tag'), /noindex/);

  const og = await call(req(`/og/${report.id}.png`));
  const buf = new Uint8Array(await og.arrayBuffer());
  assert.equal(og.headers.get('content-type'), 'image/png');
  assert.deepEqual([...buf.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const dv = new DataView(buf.buffer);
  assert.equal(dv.getUint32(16), 1200);
  assert.equal(dv.getUint32(20), 630);

  // Synlighet kräver ägartoken
  const bad = await call(req(`/api/report/${report.id}/visibility`, { method: 'POST', body: { ownerToken: 'fel', public: true } }));
  assert.equal(bad.status, 403);
  const ok = await call(req(`/api/report/${report.id}/visibility`, { method: 'POST', body: { ownerToken, public: true } }));
  assert.equal(ok.status, 200);
  const after = await (await call(req(`/r/${report.id}`))).text();
  assert.match(after, /content="noindex, nofollow"/, 'utvecklingsdata indexeras aldrig även om den görs offentlig');
});

test('okänd rapport ger 404', async () => {
  const { call } = setup();
  assert.equal((await call(req('/api/report/finnsintealls'))).status, 404);
  assert.equal((await call(req('/r/finnsintealls'))).status, 404);
});

test('leadformulär: validering, honungsfälla och lagring', async () => {
  const { call, kv } = setup();
  const started = Date.now() - 10000;
  const invalid = await call(req('/api/lead', { method: 'POST', body: { kind: 'project', email: 'fel', startedAt: started } }));
  assert.equal(invalid.status, 422);
  const errs = (await invalid.json()).errors;
  assert.ok(errs.email && errs.name && errs.message);

  const bot = await call(req('/api/lead', { method: 'POST', body: { kind: 'project', company_site: 'spam', email: 'a@b.se', startedAt: started } }));
  assert.equal(bot.status, 200);
  const tooFast = await call(req('/api/lead', { method: 'POST', body: { kind: 'project', email: 'a@b.se', name: 'A', message: 'Hej hej hej hej', startedAt: Date.now() } }));
  assert.equal(tooFast.status, 200);
  assert.equal((await kv.list({ prefix: 'lead:' })).keys.length, 0, 'botar sparas inte');

  const good = await call(req('/api/lead', { method: 'POST', body: { kind: 'project', name: 'Anna', email: 'anna@foretag.se', service: 'hemsidor', message: 'Vi behöver en ny hemsida.', startedAt: started } }));
  assert.equal(good.status, 200);
  assert.equal((await kv.list({ prefix: 'lead:' })).keys.length, 1);
  const cross = await call(req('/api/lead', { method: 'POST', origin: 'https://evil.example', body: { kind: 'project' } }));
  assert.equal(cross.status, 403);
});

test('rapport via e-post med påminnelse kräver samtycke och sparar påminnelse', async () => {
  const { call, kv } = setup();
  const events = await ndjson(await call(req('/api/analyze', { method: 'POST', body: { url: 'svag.fixtures.wimco.dev' } })));
  const { report } = events.at(-1);
  const started = Date.now() - 10000;
  const noConsent = await call(req('/api/lead', { method: 'POST', body: { kind: 'report_email', email: 'a@foretag.se', reportId: report.id, startedAt: started } }));
  assert.equal(noConsent.status, 422);
  const ok = await call(req('/api/lead', { method: 'POST', body: { kind: 'report_email', email: 'a@foretag.se', reportId: report.id, consent: true, remind: 'on', startedAt: started } }));
  const data = await ok.json();
  assert.equal(ok.status, 200);
  assert.match(data.remindOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal((await kv.list({ prefix: 'remind:' })).keys.length, 1);
});

test('påminnelse-endpoint kräver hemlighet', async () => {
  const { call } = setup({ ...ENV, CRON_SECRET: 's3cret' });
  assert.equal((await call(req('/api/cron/reminders', { method: 'POST' }))).status, 403);
  assert.equal((await call(req('/api/cron/reminders', { method: 'POST', headers: { authorization: 'Bearer s3cret' } }))).status, 200);
});
