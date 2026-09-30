// Endast för tester och lokal utveckling: låtsaswebbplatser som besvaras utan nätverk.
// <namn>.fixtures.wimco.dev -> test/fixtures/sites/<namn>/
// Används aldrig i Cloudflare-miljön.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures', 'sites');
export const FIXTURE_SUFFIX = '.fixtures.wimco.dev';

export function isFixtureHost(host) {
  return host.endsWith(FIXTURE_SUFFIX);
}

function streamOf(text) {
  const bytes = typeof text === 'string' ? new TextEncoder().encode(text) : text;
  return new ReadableStream({ start(c) { c.enqueue(bytes); c.close(); } });
}

export function fixtureResponse(urlStr) {
  const url = new URL(urlStr);
  const name = url.hostname.slice(0, -FIXTURE_SUFFIX.length).replace(/^www\./, '');
  const dir = path.join(SITES, name);
  const special = {
    blockerad: () => ({ status: 403, headers: new Headers({ 'content-type': 'text/html', 'cf-mitigated': 'challenge' }), body: streamOf('<title>Just a moment...</title>') }),
    saknas: () => ({ status: 404, headers: new Headers({ 'content-type': 'text/html' }), body: streamOf('Not found') }),
    fil: () => ({ status: 200, headers: new Headers({ 'content-type': 'application/pdf' }), body: streamOf('%PDF-1.4') }),
    'intern-redirect': () => ({ status: 302, headers: new Headers({ location: 'http://169.254.169.254/latest/meta-data/' }), body: null }),
    redirect: () => ({ status: 301, headers: new Headers({ location: `https://svag${FIXTURE_SUFFIX}/` }), body: null }),
    loop: () => ({ status: 302, headers: new Headers({ location: `https://loop${FIXTURE_SUFFIX}/?n=${Math.random()}` }), body: null }),
  };
  if (special[name]) return special[name]();
  let p = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
  const file = path.normalize(path.join(dir, p));
  if (!file.startsWith(dir) || !fs.existsSync(file)) {
    return { status: 404, headers: new Headers({ 'content-type': 'text/plain' }), body: streamOf('Not found') };
  }
  const type = file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.xml') ? 'application/xml' : 'text/plain';
  return { status: 200, headers: new Headers({ 'content-type': type }), body: streamOf(fs.readFileSync(file)) };
}

// Plattform som svarar från fixtures men kör all validering som vanligt.
export function withFixtures(platform, { slow = null } = {}) {
  return {
    ...platform,
    async resolve(host) {
      if (isFixtureHost(host)) return ['93.184.215.14'];
      return platform.resolve(host);
    },
    async rawFetch(url, init) {
      const host = new URL(url).hostname;
      if (isFixtureHost(host)) {
        if (host.startsWith('seg.')) {
          await new Promise((resolve, reject) => {
            const t = setTimeout(resolve, slow ?? 60000);
            init.signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); });
          });
        }
        return fixtureResponse(url);
      }
      return platform.rawFetch(url, init);
    },
  };
}
