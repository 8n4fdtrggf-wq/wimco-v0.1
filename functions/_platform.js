// Cloudflare-plattformen för lib/router.js.
import { AnalysisError } from '../lib/net/url-guard.js';

async function dohLookup(name, type) {
  const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { accept: 'application/dns-json' },
  });
  if (!res.ok) throw new AnalysisError('unreachable', 'DNS-uppslaget misslyckades.');
  const data = await res.json();
  if (data.Status === 3) return { nx: true, addrs: [] };
  const want = type === 'A' ? 1 : 28;
  return { nx: false, addrs: (data.Answer || []).filter((a) => a.type === want).map((a) => a.data) };
}

export function cloudflarePlatform(context) {
  const { env, request } = context;
  return {
    remoteAddress: request.headers.get('cf-connecting-ip') || null,
    trustForwarded: false,
    kv: env.WIMCO_KV || null,
    async resolve(host) {
      const [a, aaaa] = await Promise.all([dohLookup(host, 'A'), dohLookup(host, 'AAAA')]);
      const addrs = [...a.addrs, ...aaaa.addrs];
      if (!addrs.length) throw new AnalysisError('unreachable', 'Vi hittade ingen server för den adressen. Kontrollera stavningen.');
      return addrs;
    },
    async rawFetch(url, init) {
      const res = await fetch(url, { method: init.method, headers: init.headers, signal: init.signal, redirect: 'manual', cf: { cacheTtl: 0 } });
      return { status: res.status, headers: res.headers, body: res.body };
    },
    trustedFetch: (url, init) => fetch(url, init),
    async loadAsset(path) {
      const res = await env.ASSETS.fetch(new URL(path, request.url));
      if (!res.ok) throw new Error(`asset ${path} ${res.status}`);
      return res.arrayBuffer();
    },
    waitUntil: (p) => context.waitUntil(p),
  };
}
