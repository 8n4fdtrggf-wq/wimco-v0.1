import test from 'node:test';
import assert from 'node:assert/strict';
import { safeFetch } from '../lib/net/safe-fetch.js';

const stream = (s) => new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(s)); c.close(); } });
function platform(routes, dns = {}) {
  return {
    resolve: async (h) => dns[h] || ['93.184.215.14'],
    rawFetch: async (url, init) => {
      const r = routes[url];
      if (!r) return { status: 404, headers: new Headers(), body: stream('nej') };
      return typeof r === 'function' ? r(init) : r;
    },
  };
}

test('följer redirects och validerar varje hopp', async () => {
  const p = platform({
    'https://a.se/': { status: 301, headers: new Headers({ location: 'https://b.se/start' }), body: null },
    'https://b.se/start': { status: 200, headers: new Headers({ 'content-type': 'text/html' }), body: stream('<h1>hej</h1>') },
  });
  const res = await safeFetch(new URL('https://a.se/'), p);
  assert.equal(res.status, 200);
  assert.equal(res.url, 'https://b.se/start');
  assert.equal(res.redirects.length, 1);
});

test('redirect till intern adress stoppas', async () => {
  for (const loc of ['http://169.254.169.254/latest/meta-data/', 'http://localhost/', 'http://[::1]/', 'file:///etc/passwd', 'https://a.se:8443/']) {
    const p = platform({ 'https://a.se/': { status: 302, headers: new Headers({ location: loc }), body: null } });
    await assert.rejects(safeFetch(new URL('https://a.se/'), p), { code: 'blocked_target' }, loc);
  }
});

test('redirect till värd som resolvar internt stoppas', async () => {
  const p = platform({ 'https://a.se/': { status: 302, headers: new Headers({ location: 'https://rebind.se/' }), body: null } }, { 'rebind.se': ['127.0.0.1'] });
  await assert.rejects(safeFetch(new URL('https://a.se/'), p), { code: 'blocked_target' });
});

test('redirectgräns', async () => {
  let n = 0;
  const p = { resolve: async () => ['93.184.215.14'], rawFetch: async () => ({ status: 302, headers: new Headers({ location: `https://a.se/${++n}` }), body: null }) };
  await assert.rejects(safeFetch(new URL('https://a.se/'), p), { code: 'failed' });
  assert.equal(n, 6);
});

test('timeout', async () => {
  const p = {
    resolve: async () => ['93.184.215.14'],
    rawFetch: (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('abort')))),
  };
  const t0 = Date.now();
  await assert.rejects(safeFetch(new URL('https://seg.se/'), p, { timeoutMs: 300 }), { code: 'timeout' });
  assert.ok(Date.now() - t0 < 2000);
});

test('maximal svarsstorlek', async () => {
  const big = 'x'.repeat(50000);
  const p = platform({ 'https://a.se/': { status: 200, headers: new Headers({ 'content-type': 'text/html' }), body: stream(big) } });
  const res = await safeFetch(new URL('https://a.se/'), p, { maxBytes: 1000 });
  assert.equal(res.bytes.byteLength, 1000);
  assert.equal(res.truncated, true);
});

test('anslutningsfel ger unreachable', async () => {
  const p = { resolve: async () => ['93.184.215.14'], rawFetch: async () => { throw new Error('ECONNREFUSED'); } };
  await assert.rejects(safeFetch(new URL('https://a.se/'), p), { code: 'unreachable' });
});
