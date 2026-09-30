import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequest as api } from '../functions/api/[[path]].js';
import { onRequest as reportPage } from '../functions/r/[id].js';
import { memoryKv } from '../server/dev.mjs';

const PUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const ASSETS = {
  async fetch(u) {
    const p = new URL(u).pathname;
    const f = path.join(PUB, p.endsWith('/') ? p + 'index.html' : p);
    return fs.existsSync(f) ? new Response(fs.readFileSync(f)) : new Response('nf', { status: 404 });
  },
};
const ctx = (url, init = {}) => ({
  request: new Request(url, init),
  env: { WIMCO_KV: memoryKv(null), ASSETS, SITE_URL: 'https://wimco.se' },
  waitUntil: () => {},
  params: {},
});

test('Cloudflare-adaptern: config, validering och rapportskal', async () => {
  const cfg = await api(ctx('https://wimco.se/api/config'));
  assert.equal(cfg.status, 200);
  assert.equal((await cfg.json()).psi, true);
  const bad = await api(ctx('https://wimco.se/api/analyze', { method: 'POST', headers: { origin: 'https://wimco.se', 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.7' }, body: JSON.stringify({ url: 'http://169.254.169.254/' }) }));
  assert.equal(bad.status, 422);
  const missing = await reportPage(ctx('https://wimco.se/r/finnsintealls'));
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /data-report/);
});
