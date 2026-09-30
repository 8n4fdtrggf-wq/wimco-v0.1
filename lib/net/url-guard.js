// Normalisering och validering av användarens URL innan något nätverksanrop görs.
import { domainToUnicode } from 'node:url';
import { ipVersion, isPublicIp } from './ip.js';

export class AnalysisError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

const BLOCKED_SUFFIXES = [
  '.localhost', '.local', '.internal', '.intranet', '.lan', '.home', '.corp',
  '.private', '.localdomain', '.home.arpa', '.arpa', '.test', '.example', '.invalid', '.onion',
];
const BLOCKED_HOSTS = new Set([
  'localhost', 'metadata', 'metadata.google.internal', 'metadata.goog', 'instance-data',
  'instance-data.ec2.internal', 'kubernetes', 'kubernetes.default', 'wpad',
]);
const ALLOWED_PORTS = new Set(['', '80', '443']);
export const MAX_URL_LENGTH = 2048;

export function normalizeUrl(input) {
  if (typeof input !== 'string') throw new AnalysisError('invalid_url', 'Ange en webbadress.');
  let raw = input.trim().replace(/[\u0000-\u001f\u007f]+/g, '');
  if (/\s/.test(raw)) throw new AnalysisError('invalid_url', 'Webbadressen får inte innehålla mellanslag.');
  if (!raw) throw new AnalysisError('invalid_url', 'Ange en webbadress, till exempel dittforetag.se.');
  if (raw.length > MAX_URL_LENGTH) throw new AnalysisError('invalid_url', 'Adressen är för lång.');
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  if (hasScheme && !/^https?:\/\//i.test(raw)) {
    // host:port utan schema tolkas annars som schema – ge ett tydligt fel för allt som inte är http(s)
    if (!/^[a-z0-9.-]+:\d+(\/|$)/i.test(raw)) {
      throw new AnalysisError('invalid_url', 'Endast adresser som börjar med http:// eller https:// kan analyseras.');
    }
  }
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw.replace(/^\/+/, '');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new AnalysisError('invalid_url', 'Det där ser inte ut som en webbadress. Prova till exempel dittforetag.se.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AnalysisError('invalid_url', 'Endast http- och https-adresser kan analyseras.');
  }
  if (url.username || url.password) {
    throw new AnalysisError('invalid_url', 'Adresser med inloggningsuppgifter kan inte analyseras.');
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new AnalysisError('blocked_target', 'Endast standardportar (80 och 443) kan analyseras.');
  }
  url.hash = '';
  assertPublicHostname(url.hostname);
  return url;
}

export function assertPublicHostname(hostnameRaw) {
  const hostname = String(hostnameRaw || '').toLowerCase().replace(/\.$/, '');
  if (!hostname) throw new AnalysisError('invalid_url', 'Adressen saknar domännamn.');
  const bare = hostname.replace(/^\[|\]$/g, '');
  const v = ipVersion(bare);
  if (v) {
    if (!isPublicIp(bare)) {
      throw new AnalysisError('blocked_target', 'Adressen pekar på ett internt eller reserverat nätverk och kan inte analyseras.');
    }
    return hostname;
  }
  if (BLOCKED_HOSTS.has(hostname) || BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s))) {
    throw new AnalysisError('blocked_target', 'Adressen pekar på ett internt nätverk och kan inte analyseras.');
  }
  if (!hostname.includes('.')) {
    throw new AnalysisError('invalid_url', 'Ange hela domänen, till exempel dittforetag.se.');
  }
  if (!/^[a-z0-9.-]+$/.test(hostname) || hostname.split('.').some((l) => !l || l.length > 63 || l.startsWith('-') || l.endsWith('-'))) {
    throw new AnalysisError('invalid_url', 'Domännamnet innehåller ogiltiga tecken.');
  }
  // WHATWG URL accepts malformed xn-- labels as plain ASCII in some runtimes.
  // A valid IDN label must decode to Unicode; otherwise reject it before DNS.
  if (hostname.split('.').some((label) => label.startsWith('xn--') && domainToUnicode(label) === label)) {
    throw new AnalysisError('invalid_url', 'Domännamnet innehåller en ogiltig internationell domän.');
  }
  const tld = hostname.split('.').pop();
  if (/^\d+$/.test(tld)) {
    throw new AnalysisError('invalid_url', 'Domännamnet är ogiltigt.');
  }
  return hostname;
}

// Resolvar och kräver att samtliga adresser är publika (DNS rebinding hanteras
// dessutom vid själva uppkopplingen i Node-adaptern).
export async function assertResolvesPublic(hostname, resolve) {
  const bare = hostname.replace(/^\[|\]$/g, '');
  if (ipVersion(bare)) return [bare];
  let addrs;
  try {
    addrs = await resolve(bare);
  } catch (err) {
    if (err instanceof AnalysisError) throw err;
    throw new AnalysisError('unreachable', 'Vi hittade ingen server för den adressen. Kontrollera stavningen.');
  }
  if (!addrs || addrs.length === 0) {
    throw new AnalysisError('unreachable', 'Vi hittade ingen server för den adressen. Kontrollera stavningen.');
  }
  for (const a of addrs) {
    if (!isPublicIp(a)) {
      throw new AnalysisError('blocked_target', 'Adressen pekar på ett internt eller reserverat nätverk och kan inte analyseras.');
    }
  }
  return addrs;
}

export function displayHost(url) {
  return url.hostname.replace(/^www\./, '');
}
