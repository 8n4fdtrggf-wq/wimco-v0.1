// Beroendefri PNG-generator för delningsbilder (Open Graph) med domän och Wimco Score.
// Bakgrund och glyfer förrenderas av tools/build-og-assets.py; här komponeras bara pixlar.

let cache = null;

async function inflate(buf) {
  const ds = new DecompressionStream('deflate');
  const stream = new Blob([buf]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function deflate(buf) {
  const cs = new CompressionStream('deflate');
  const stream = new Blob([buf]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function loadAssets(loadAsset) {
  if (cache) return cache;
  const [baseZ, atlasZ, metaBuf] = await Promise.all([
    loadAsset('/assets/og/base.bin'),
    loadAsset('/assets/og/atlas.bin'),
    loadAsset('/assets/og/atlas.json'),
  ]);
  const meta = JSON.parse(new TextDecoder().decode(metaBuf));
  cache = { base: await inflate(baseZ), atlas: await inflate(atlasZ), meta };
  return cache;
}

let CRC_TABLE = null;
function crc32(bytes, start = 0, end = bytes.length) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

async function encodePng(rgb, w, h) {
  const raw = new Uint8Array((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', await deflate(raw)), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((s, p) => s + p.length, 0);
  const png = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { png.set(p, off); off += p.length; }
  return png;
}

function measure(font, text) {
  let w = 0;
  for (const ch of text) w += font.glyphs[ch]?.adv ?? font.glyphs[' ']?.adv ?? 0;
  return w;
}

function drawText(img, W, atlas, sheetW, font, text, x, yTop, color, alpha = 1) {
  let pen = x;
  for (const ch of text) {
    const g = font.glyphs[ch];
    if (!g) continue;
    if (g.w) {
      const gx = Math.round(pen + g.ox);
      const gy = Math.round(yTop + g.oy);
      for (let j = 0; j < g.h; j++) {
        const py = gy + j;
        if (py < 0 || py >= img.length / 3 / W) continue;
        for (let i = 0; i < g.w; i++) {
          const px = gx + i;
          if (px < 0 || px >= W) continue;
          const a = (atlas[(g.y + j) * sheetW + g.x + i] / 255) * alpha;
          if (!a) continue;
          const o = (py * W + px) * 3;
          img[o] += (color[0] - img[o]) * a;
          img[o + 1] += (color[1] - img[o + 1]) * a;
          img[o + 2] += (color[2] - img[o + 2]) * a;
        }
      }
    }
    pen += g.adv;
  }
  return pen;
}

function drawDisc(img, W, cx, cy, r, color) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const a = Math.max(0, Math.min(1, r - d + 0.5));
      if (!a) continue;
      const o = (y * W + x) * 3;
      img[o] += (color[0] - img[o]) * a;
      img[o + 1] += (color[1] - img[o + 1]) * a;
      img[o + 2] += (color[2] - img[o + 2]) * a;
    }
  }
}

// Minimal punycode-avkodning så att t.ex. xn--mlarbyggare-... visas med å, ä, ö.
export function toUnicodeHost(host) {
  return host.split('.').map((label) => {
    if (!label.startsWith('xn--')) return label;
    try { return decodePunycode(label.slice(4)); } catch { return label; }
  }).join('.');
}

function decodePunycode(input) {
  const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
  let n = 128, i = 0, bias = 72;
  const out = [];
  let b = input.lastIndexOf('-');
  if (b < 0) b = 0;
  for (let j = 0; j < b; j++) out.push(input.charCodeAt(j));
  const adapt = (delta, numPoints, first) => {
    delta = first ? Math.floor(delta / damp) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    let k = 0;
    while (delta > ((base - tMin) * tMax) >> 1) { delta = Math.floor(delta / (base - tMin)); k += base; }
    return k + Math.floor(((base - tMin + 1) * delta) / (delta + skew));
  };
  for (let idx = b > 0 ? b + 1 : 0; idx < input.length;) {
    const oldi = i;
    for (let w = 1, k = base; ; k += base) {
      const c = input.charCodeAt(idx++);
      const digit = c - 48 < 10 ? c - 22 : c - 65 < 26 ? c - 65 : c - 97 < 26 ? c - 97 : base;
      if (digit >= base) throw new Error('bad');
      i += digit * w;
      const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
      if (digit < t) break;
      w *= base - t;
    }
    bias = adapt(i - oldi, out.length + 1, oldi === 0);
    n += Math.floor(i / (out.length + 1));
    i %= out.length + 1;
    out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}

export async function renderOgPng(report, loadAsset) {
  const { base, atlas, meta } = await loadAssets(loadAsset);
  const L = meta.layout;
  const W = L.width;
  const H = L.height;
  const sheetW = L.sheetWidth;
  const img = new Uint8ClampedArray(base);
  const F = meta.fonts;
  const C = L.colors;

  let host = toUnicodeHost(report.host || '').toLowerCase();
  let domFont = F.domain;
  if (measure(domFont, host) > W - 160) domFont = F.domainSm;
  while (measure(domFont, host) > W - 160 && host.length > 4) host = host.slice(0, -2) + '…';
  drawText(img, W, atlas, sheetW, domFont, host, 80, 150, C.paper);

  const total = report.score?.total;
  const scoreStr = total == null ? '–' : String(total);
  const endX = drawText(img, W, atlas, sheetW, F.score, scoreStr, 72, 200, C.paper);
  drawText(img, W, atlas, sheetW, F.of, '/100', endX + 12, 342, C.soft);
  if (report.score?.grade) {
    const ofW = measure(F.of, '/100');
    drawText(img, W, atlas, sheetW, F.grade, report.score.grade, endX + 12 + ofW + 28, 356, C.signal);
  }

  const cats = Object.fromEntries((report.score?.categories || []).map((c) => [c.id, c.score]));
  for (const st of L.stations) {
    const s = cats[st.id];
    const color = s == null ? C.soft : s >= 85 ? C.pass : s >= 60 ? C.warn : C.fail;
    drawDisc(img, W, st.x, L.lineY, 19, C.paper);
    drawDisc(img, W, st.x, L.lineY, 12, color);
    const label = s == null ? '–' : String(s);
    drawText(img, W, atlas, sheetW, F.station, label, st.x - measure(F.station, label) / 2, L.lineY + 34, C.paper);
  }

  return encodePng(new Uint8Array(img.buffer), W, H);
}
