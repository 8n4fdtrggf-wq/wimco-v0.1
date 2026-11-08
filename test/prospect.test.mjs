import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../lib/router.js';
import { draftEmail, sinceText } from '../lib/kollen/prospect.js';
import { testPlatform, ENV, req } from './helpers.mjs';

const report = (statuses) => ({
  id: 'abc12345xy',
  host: 'butik.se',
  areas: Object.entries(statuses).map(([id, status]) => ({ id, status, summary: `Sammanfattning för ${id}.` })),
});

test('utkast: inget utan röda områden, ämne efter det mest konkreta felet', () => {
  assert.equal(draftEmail(report({ tillganglighet: 'warn', angerknapp: 'pass' })), null);
  const d = draftEmail(report({ tillganglighet: 'fail', angerknapp: 'fail', rabatter: 'pass' }));
  assert.equal(d.subject, 'Ångerknappen saknas på butik.se');
  assert.equal(d.link, 'https://wimco.se/e-handelskollen/?r=abc12345xy');
  assert.match(d.body, /2 punkter blev röda:/);
  assert.match(d.body, /Vi rättar det från 34 900 kr\./);
  assert.match(d.body, /Vi rättar det för 9 900 kr\./);
  assert.match(d.body, /nej tack/);
});

test('utkast: fler än tre röda visar de tre viktigaste', () => {
  const d = draftEmail(report({ tillganglighet: 'fail', angerknapp: 'fail', rabatter: 'fail', miljo: 'fail', sparning: 'fail' }));
  assert.match(d.body, /5 punkter blev röda\. De viktigaste:/);
  assert.equal((d.body.match(/^- /gm) || []).length, 3);
});

test('sinceText: sedan för passerade datum, från för kommande', () => {
  const now = new Date('2026-11-08');
  assert.equal(sinceText('19 juni 2026', now), 'Kravet gäller sedan 19 juni 2026.');
  assert.equal(sinceText('Hösten 2022', now), 'Kravet gäller sedan hösten 2022.');
  assert.equal(sinceText('1 mars 2027', now), 'Kravet gäller från 1 mars 2027.');
  assert.equal(sinceText('Gäller redan', now), null);
});

test('admin/prospect: kräver CRON_SECRET och ger resultat med utkast', async () => {
  const platform = testPlatform();
  const env = { ...ENV, CRON_SECRET: 's3cret' };
  const call = (r) => handle(r, env, platform);
  const auth = { authorization: 'Bearer s3cret', 'content-type': 'application/json' };

  assert.equal((await call(req('/api/admin/prospect', { method: 'POST', body: { url: 'butik.fixtures.wimco.dev' } }))).status, 403);
  const res = await call(req('/api/admin/prospect', { method: 'POST', body: { url: 'butik.fixtures.wimco.dev' }, headers: auth }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.host, 'butik.fixtures.wimco.dev');
  assert.ok(data.summary.fail > 0);
  assert.ok(data.draft.link.endsWith(`?r=${data.id}`));
  // Resultatet sparas, så att länken i mejlet fungerar.
  const saved = await call(req(`/api/kollen/${data.id}`));
  assert.equal(saved.status, 200);
});
