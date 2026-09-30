// IP-klassning för SSRF-skydd. Allt som inte är en publik unicast-adress blockeras.

const V4_BLOCKED = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // privat
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local + cloud metadata (169.254.169.254)
  ['172.16.0.0', 12], // privat
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay
  ['192.168.0.0', 16], // privat
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserverat + broadcast
];

export function parseIPv4(str) {
  if (typeof str !== 'string') return null;
  const parts = str.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

function v4InRange(n, base, bits) {
  const b = parseIPv4(base);
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0;
  return ((n & mask) >>> 0) === ((b & mask) >>> 0);
}

export function isPublicIPv4(str) {
  const n = parseIPv4(str);
  if (n === null) return false;
  return !V4_BLOCKED.some(([base, bits]) => v4InRange(n, base, bits));
}

// Returnerar 8 st 16-bitarsgrupper eller null.
export function parseIPv6(input) {
  if (typeof input !== 'string') return null;
  let str = input.trim();
  if (str.startsWith('[') && str.endsWith(']')) str = str.slice(1, -1);
  const zone = str.indexOf('%');
  if (zone !== -1) str = str.slice(0, zone);
  if (!str.includes(':')) return null;
  // Inbäddad IPv4 i slutet (t.ex. ::ffff:127.0.0.1)
  let tailV4 = null;
  const lastColon = str.lastIndexOf(':');
  const tail = str.slice(lastColon + 1);
  if (tail.includes('.')) {
    tailV4 = parseIPv4(tail);
    if (tailV4 === null) return null;
    str = str.slice(0, lastColon + 1) + (tailV4 >>> 16).toString(16) + ':' + (tailV4 & 0xffff).toString(16);
  }
  const dbl = str.split('::');
  if (dbl.length > 2) return null;
  const head = dbl[0] ? dbl[0].split(':') : [];
  const rest = dbl.length === 2 && dbl[1] ? dbl[1].split(':') : [];
  const groups = [];
  for (const h of head) {
    if (!/^[0-9a-f]{1,4}$/i.test(h)) return null;
    groups.push(parseInt(h, 16));
  }
  const tailGroups = [];
  for (const h of rest) {
    if (!/^[0-9a-f]{1,4}$/i.test(h)) return null;
    tailGroups.push(parseInt(h, 16));
  }
  if (dbl.length === 2) {
    const fill = 8 - groups.length - tailGroups.length;
    if (fill < 1) return null;
    for (let i = 0; i < fill; i++) groups.push(0);
  }
  groups.push(...tailGroups);
  if (groups.length !== 8) return null;
  return groups;
}

function v4FromGroups(hi, lo) {
  return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
}

export function isPublicIPv6(str) {
  const g = parseIPv6(str);
  if (!g) return false;
  const allZeroUntil = (i) => g.slice(0, i).every((x) => x === 0);
  // :: och ::1
  if (allZeroUntil(7) && (g[7] === 0 || g[7] === 1)) return false;
  // IPv4-mapped ::ffff:a.b.c.d och IPv4-compatible ::a.b.c.d
  if (allZeroUntil(5) && g[5] === 0xffff) return isPublicIPv4(v4FromGroups(g[6], g[7]));
  if (allZeroUntil(6)) return isPublicIPv4(v4FromGroups(g[6], g[7]));
  // NAT64 64:ff9b::/96
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
    return isPublicIPv4(v4FromGroups(g[6], g[7]));
  }
  // 64:ff9b:1::/48 (lokal NAT64)
  if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 1) return false;
  // 6to4 2002::/16 – bäddar in IPv4 i grupp 1–2
  if (g[0] === 0x2002) return isPublicIPv4(v4FromGroups(g[1], g[2]));
  // Teredo 2001::/32
  if (g[0] === 0x2001 && g[1] === 0) return false;
  // Dokumentation 2001:db8::/32
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false;
  // ORCHID etc 2001:10::/28, 2001:20::/28
  if (g[0] === 0x2001 && (g[1] & 0xfff0) === 0x10) return false;
  if (g[0] === 0x2001 && (g[1] & 0xfff0) === 0x20) return false;
  // Unique local fc00::/7
  if ((g[0] & 0xfe00) === 0xfc00) return false;
  // Link-local fe80::/10 och site-local fec0::/10
  if ((g[0] & 0xffc0) === 0xfe80) return false;
  if ((g[0] & 0xffc0) === 0xfec0) return false;
  // Multicast ff00::/8
  if ((g[0] & 0xff00) === 0xff00) return false;
  // Discard-only 100::/64
  if (g[0] === 0x100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return false;
  // Endast global unicast 2000::/3 släpps igenom
  return (g[0] & 0xe000) === 0x2000;
}

export function ipVersion(str) {
  if (parseIPv4(str) !== null) return 4;
  if (parseIPv6(str)) return 6;
  return 0;
}

export function isPublicIp(str) {
  const v = ipVersion(str);
  if (v === 4) return isPublicIPv4(str);
  if (v === 6) return isPublicIPv6(str);
  return false;
}
