#!/usr/bin/env node
// Lokal utvecklingsserver: serverar public/ och kör samma router som Cloudflare Pages Functions.
// Start: npm run dev  (läser .dev.vars om filen finns)
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import zlib from 'node:zlib';
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { handle } from '../lib/router.js';
import { isPublicIp } from '../lib/net/ip.js';
import { AnalysisError } from '../lib/net/url-guard.js';
import { withFixtures } from './fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

export function loadEnv() {
  const env = {};
  const file = path.join(ROOT, '.dev.vars');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  for (const k of Object.keys(process.env)) if (/^(PSI_|RESEND_|LEAD_|MAIL_|TURNSTILE_|ANTHROPIC_|SITE_URL|IP_HASH|CRON_|DEV_|GLOBAL_)/.test(k)) env[k] = process.env[k];
  return env;
}

// ---- KV i minnet, sparad till .data/kv.json ----
export function memoryKv(file) {
  const data = new Map();
  if (file && fs.existsSync(file)) {
    try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(file, 'utf8')))) data.set(k, v); } catch { /* ny fil */ }
  }
  let timer = null;
  const persist = () => {
    if (!file) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(Object.fromEntries(data)));
    }, 200);
  };
  const alive = (e) => e && (!e.exp || e.exp > Date.now());
  return {
    async get(k) { const e = data.get(k); return alive(e) ? e.v : null; },
    async put(k, v, opts) { data.set(k, { v: String(v), exp: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : null }); persist(); },
    async delete(k) { data.delete(k); persist(); },
    async list({ prefix = '', limit = 1000 } = {}) {
      return { keys: [...data.keys()].filter((k) => k.startsWith(prefix) && alive(data.get(k))).sort().slice(0, limit).map((name) => ({ name })) };
    },
  };
}

// ---- SSRF-skyddad hämtning: varje IP kontrolleras i själva uppkopplingen (skydd mot DNS rebinding) ----
function guardedLookup(hostname, options, cb) {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addrs) => {
    if (err) return cb(err);
    const bad = addrs.find((a) => !isPublicIp(a.address));
    if (bad) return cb(new AnalysisError('blocked_target', 'Adressen pekar på ett internt eller reserverat nätverk och kan inte analyseras.'));
    if (options && options.all) return cb(null, addrs);
    cb(null, addrs[0].address, addrs[0].family);
  });
}

function proxyTunnel(target, proxyUrl, signal) {
  return new Promise((resolve, reject) => {
    const p = new URL(proxyUrl);
    const port = target.port || (target.protocol === 'https:' ? 443 : 80);
    const req = http.request({ host: p.hostname, port: p.port || 80, method: 'CONNECT', path: `${target.hostname}:${port}`, signal });
    req.once('connect', (res, socket) => {
      if (res.statusCode !== 200) { socket.destroy(); reject(new AnalysisError('unreachable', 'Vi kunde inte ansluta till webbplatsen.')); return; }
      if (target.protocol === 'https:') {
        const s = tls.connect({ socket, servername: target.hostname, ca: process.env.NODE_EXTRA_CA_CERTS ? [...tls.rootCertificates, fs.readFileSync(process.env.NODE_EXTRA_CA_CERTS, 'utf8')] : undefined });
        s.once('secureConnect', () => resolve(s));
        s.once('error', reject);
      } else resolve(socket);
    });
    req.once('error', reject);
    req.end();
  });
}

export function nodeRawFetch({ useProxy = false } = {}) {
  const proxy = useProxy ? process.env.HTTPS_PROXY || process.env.https_proxy : null;
  return async (urlStr, init) => {
    const target = new URL(urlStr);
    const mod = target.protocol === 'https:' ? https : http;
    let socket = null;
    if (proxy) {
      // Validera DNS lokalt även när trafiken går via proxy (endast utvecklingsmiljön).
      await new Promise((res, rej) => guardedLookup(target.hostname, {}, (e) => (e ? rej(e) : res())));
      socket = await proxyTunnel(target, proxy, init.signal);
    }
    return new Promise((resolve, reject) => {
      const req = mod.request(target, {
        method: init.method || 'GET',
        headers: { ...init.headers, 'accept-encoding': 'gzip, deflate, br' },
        signal: init.signal,
        lookup: guardedLookup,
        createConnection: socket ? () => socket : undefined,
        agent: socket ? false : undefined,
        timeout: 15000,
      }, (res) => {
        let stream = res;
        const enc = (res.headers['content-encoding'] || '').toLowerCase();
        if (enc === 'gzip' || enc === 'x-gzip') stream = res.pipe(zlib.createGunzip());
        else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
        else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());
        stream.on('error', () => {});
        const headers = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (Array.isArray(v)) v.forEach((x) => headers.append(k, x)); else if (v != null) headers.set(k, String(v));
        }
        resolve({ status: res.statusCode, headers, body: Readable.toWeb(stream) });
      });
      req.on('timeout', () => req.destroy(new AnalysisError('timeout', 'Webbplatsen svarade inte i tid.')));
      req.on('error', (e) => reject(e));
      req.end();
    });
  };
}

export function nodePlatform({ env, kv, remoteAddress }) {
  const useProxy = env.DEV_USE_PROXY === '1';
  const platform = {
    remoteAddress,
    trustForwarded: false,
    kv,
    async resolve(host) {
      const addrs = await dns.promises.lookup(host, { all: true, verbatim: true });
      return addrs.map((a) => a.address);
    },
    rawFetch: nodeRawFetch({ useProxy }),
    trustedFetch: (url, init) => fetch(url, init),
    async loadAsset(p) {
      const file = resolveStatic(p);
      if (!file) throw new Error(`asset saknas: ${p}`);
      const buf = fs.readFileSync(file);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    },
    waitUntil: (p) => p.catch(() => {}),
  };
  return env.DEV_SITE_FIXTURES === '1' ? withFixtures(platform) : platform;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.bin': 'application/octet-stream',
};

function resolveStatic(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split('?')[0]); } catch { return null; }
  const full = path.normalize(path.join(PUBLIC, p));
  if (!full.startsWith(PUBLIC)) return null;
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  if (fs.existsSync(path.join(full, 'index.html'))) return path.join(full, 'index.html');
  if (fs.existsSync(full + '.html')) return full + '.html';
  return null;
}

function parseHeadersFile() {
  const file = path.join(PUBLIC, '_headers');
  const rules = [];
  if (!fs.existsSync(file)) return rules;
  let cur = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = { pattern: line.trim(), headers: {} }; rules.push(cur); continue; }
    const detach = /^\s+!\s*(\S+)\s*$/.exec(line);
    if (detach && cur) { cur.headers['!' + detach[1].toLowerCase()] = ''; continue; }
    const m = /^\s+([^:]+):\s*(.*)$/.exec(line);
    if (m && cur) cur.headers[m[1].toLowerCase()] = m[2];
  }
  return rules;
}

function headersFor(urlPath, rules) {
  const out = {};
  for (const r of rules) {
    const re = new RegExp('^' + r.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    if (!re.test(urlPath)) continue;
    for (const [k, v] of Object.entries(r.headers)) {
      if (k.startsWith('!')) delete out[k.slice(1).trim()];
      else out[k] = v;
    }
  }
  return out;
}

export function createServer({ env = loadEnv(), kvFile = path.join(ROOT, '.data', 'kv.json') } = {}) {
  const kv = memoryKv(kvFile);
  const headerRules = parseHeadersFile();
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const extra = headersFor(url.pathname, headerRules);
    try {
      if (/^\/(api|r|og)\//.test(url.pathname)) {
        const chunks = [];
        if (req.method !== 'GET' && req.method !== 'HEAD') for await (const c of req) chunks.push(c);
        const request = new Request(url, {
          method: req.method,
          headers: Object.entries(req.headers).filter(([, v]) => typeof v === 'string'),
          body: chunks.length ? Buffer.concat(chunks) : undefined,
        });
        const platform = nodePlatform({ env, kv, remoteAddress: req.socket.remoteAddress });
        const response = await handle(request, env, platform);
        const h = { ...extra };
        response.headers.forEach((v, k) => { h[k] = v; });
        res.writeHead(response.status, h);
        if (response.body) {
          const reader = response.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        }
        res.end();
        return;
      }
      if (url.pathname.startsWith('/_') || /^\/(lib|functions|server|test|tools)\//.test(url.pathname)) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const file = resolveStatic(url.pathname);
      if (!file) {
        const nf = path.join(PUBLIC, '404.html');
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', ...extra });
        res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'Not found');
        return;
      }
      const asPath = path.join(PUBLIC, decodeURIComponent(url.pathname));
      if (!url.pathname.endsWith('/') && fs.existsSync(asPath) && fs.statSync(asPath).isDirectory()) {
        res.writeHead(308, { location: url.pathname + '/' + url.search }); res.end(); return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', ...extra });
      fs.createReadStream(file).pipe(res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.writeHead(500);
      res.end('Server error');
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 8788);
  createServer().listen(port, () => console.log(`Wimco dev: http://localhost:${port}`));
}
