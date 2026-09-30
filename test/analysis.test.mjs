import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../lib/analysis/analyze.js';
import { createStore } from '../lib/util/store.js';
import { memoryKv } from '../server/dev.mjs';
import { testPlatform, ENV, collect } from './helpers.mjs';

const run = async (url, env = ENV, opts = {}) => {
  const kv = memoryKv(null);
  const platform = testPlatform({ kv });
  return collect(analyze(url, { env, platform, store: createStore(kv), ...opts }));
};

test('giltig sajt: verkliga steg i ordning och ett transparent betyg', async () => {
  const events = await run('gamla-wimco.fixtures.wimco.dev');
  const steps = events.filter((e) => e.type === 'step' && e.status !== 'running').map((e) => e.id);
  assert.deepEqual(steps, ['structure', 'seo', 'performance', 'mobile', 'compile']);
  const { report, ownerToken } = events.at(-1);
  assert.equal(events.at(-1).type, 'result');
  assert.ok(ownerToken && ownerToken.length >= 24);
  assert.ok(report.score.total >= 0 && report.score.total <= 100);
  assert.equal(report.score.categories.length, 6);
  for (const c of report.score.categories) {
    assert.ok(c.parts.length > 0, `${c.id} saknar källor`);
    for (const p of c.parts) assert.ok(['measured', 'rules', 'heuristic', 'ai', 'mixed'].includes(p.source));
  }
  assert.equal(report.devData, true, 'fixture-data måste märkas som utvecklingsdata');
  assert.equal(report.ownerHash, undefined, 'ägarhash får aldrig skickas till klienten');
  for (const c of report.checks) {
    assert.ok(['measured', 'rules', 'heuristic', 'ai'].includes(c.source));
    if (c.status !== 'pass' && c.status !== 'info') assert.ok(c.fix && c.effort && c.impact, c.id);
  }
});

test('svag sajt får lägre poäng och tydliga första åtgärder', async () => {
  const good = (await run('gamla-wimco.fixtures.wimco.dev', { ...ENV, PSI_DISABLED: '1', DEV_FIXTURES: '0' })).at(-1).report;
  const weak = (await run('svag.fixtures.wimco.dev', { ...ENV, PSI_DISABLED: '1', DEV_FIXTURES: '0' })).at(-1).report;
  assert.ok(weak.score.total < good.score.total, `${weak.score.total} < ${good.score.total}`);
  assert.ok(weak.score.priorities.fixFirst.length >= 1);
  const ids = weak.checks.filter((c) => c.status !== 'pass').map((c) => c.id);
  for (const id of ['meta-description', 'cta-present', 'modern-tech', 'alt-text', 'zoom']) assert.ok(ids.includes(id), id);
  const perf = weak.score.categories.find((c) => c.id === 'performance');
  assert.equal(perf.limited, true, 'utan Lighthouse ska prestanda märkas som begränsad');
  assert.equal(weak.psi.ok, false);
});

test('blockerande sajt, 404, fil, intern redirect och loop ger rätt feltyp', async () => {
  const cases = { blockerad: 'site_blocked', saknas: 'not_found', fil: 'not_html', 'intern-redirect': 'blocked_target', loop: 'failed' };
  for (const [name, code] of Object.entries(cases)) {
    await assert.rejects(run(`${name}.fixtures.wimco.dev`), { code }, name);
  }
});

test('långsam sajt avbryts med timeout', async () => {
  const t0 = Date.now();
  await assert.rejects(run('seg.fixtures.wimco.dev'), { code: 'timeout' });
  const s = (Date.now() - t0) / 1000;
  assert.ok(s < 20, `tog ${s}s`);
});

test('ny analys jämförs med föregående rapport för samma domän', async () => {
  const kv = memoryKv(null);
  const platform = testPlatform({ kv });
  const store = createStore(kv);
  const env = { ...ENV, PSI_DISABLED: '1', DEV_FIXTURES: '0' };
  const first = (await collect(analyze('svag.fixtures.wimco.dev', { env, platform, store }))).at(-1).report;
  const second = (await collect(analyze('svag.fixtures.wimco.dev', { env, platform, store, prevId: first.id }))).at(-1).report;
  assert.equal(second.previous.id, first.id);
  assert.equal(second.previous.total, first.score.total);
  const other = (await collect(analyze('gamla-wimco.fixtures.wimco.dev', { env, platform, store, prevId: first.id }))).at(-1).report;
  assert.equal(other.previous, null, 'jämförelse bara mot samma domän');
});
