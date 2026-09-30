import { memoryKv } from '../server/dev.mjs';
import { withFixtures } from '../server/fixtures.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

// Plattform utan nätverk: bara fixture-sajter besvaras, allt annat nekas.
export function testPlatform({ kv = memoryKv(null), extraResolve = {}, rawFetch = null } = {}) {
  const base = {
    remoteAddress: '203.0.113.9',
    kv,
    async resolve(host) {
      if (extraResolve[host]) return extraResolve[host];
      const e = new Error('ENOTFOUND'); e.code = 'ENOTFOUND'; throw e;
    },
    rawFetch: rawFetch || (async () => { throw new Error('nätverk avstängt i test'); }),
    trustedFetch: async () => { throw new Error('nätverk avstängt i test'); },
    async loadAsset(p) {
      let f = path.join(PUB, p);
      if (p.endsWith('/')) f = path.join(f, 'index.html');
      const b = fs.readFileSync(f);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    },
    waitUntil: () => {},
  };
  return withFixtures(base, { slow: 60000 });
}

export const ENV = { DEV_FIXTURES: '1', DEV_SITE_FIXTURES: '1', IP_HASH_SALT: 'test', SITE_URL: 'https://wimco.se' };

export async function collect(iter) {
  const out = [];
  for await (const ev of iter) out.push(ev);
  return out;
}

export function req(url, { method = 'GET', body, origin = 'https://wimco.se', headers = {} } = {}) {
  return new Request(`https://wimco.se${url}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(origin ? { origin } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function ndjson(res) {
  const text = await res.text();
  return text.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
