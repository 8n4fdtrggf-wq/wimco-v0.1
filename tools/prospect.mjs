#!/usr/bin/env node
// Kör E-handelskollen mot en lista med butiker och skriver mejlutkast till de butiker där något är rött.
// Skickar ingenting: utkasten läses och skickas av dig.
//
//   node tools/prospect.mjs butiker.txt            # lokalt (testläge), resultaten sparas i .data/
//   CRON_SECRET=... node tools/prospect.mjs butiker.txt --remote
//                                                  # via wimco.se, så att länkarna i mejlen fungerar
//
// butiker.txt: en adress per rad (eller CSV där första kolumnen är adressen). Rader som börjar med # hoppas över.
// Resultatet hamnar i prospekt/<datum>/: resultat.csv och en .txt per mejlutkast.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const remote = args.includes('--remote');
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('Användning: node tools/prospect.mjs butiker.txt [--remote]');
  process.exit(1);
}

const urls = [...new Set(
  fs.readFileSync(file, 'utf8').split('\n')
    .map((l) => l.split(/[,;\t]/)[0].trim())
    .filter((l) => l && !l.startsWith('#') && !/^url$/i.test(l)),
)];

const SITE = process.env.SITE_URL || 'https://wimco.se';
let runOne;
if (remote) {
  if (!process.env.CRON_SECRET) {
    console.error('Sätt CRON_SECRET (samma som i Cloudflare) för --remote.');
    process.exit(1);
  }
  runOne = async (url) => {
    const res = await fetch(`${SITE}/api/admin/prospect`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}`, 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? data : { ok: false, url, error: data.message || `HTTP ${res.status}` };
  };
} else {
  const { loadEnv, memoryKv, nodePlatform } = await import('../server/dev.mjs');
  const { createStore } = await import('../lib/util/store.js');
  const { prospectShop } = await import('../lib/kollen/prospect.js');
  const env = loadEnv();
  const kv = memoryKv(path.join(ROOT, '.data', 'kv.json'));
  const platform = nodePlatform({ env, kv, remoteAddress: '127.0.0.1' });
  const store = createStore(kv);
  if (!env.PSI_API_KEY) console.warn('Obs: PSI_API_KEY saknas. Tillgängligheten kontrolleras då bara i koden.');
  // Lokalt finns resultaten bara på den här datorn, så länkarna pekar på den lokala servern.
  runOne = (url) => prospectShop(url, { env, platform, store, siteUrl: 'http://localhost:8788' });
}

const day = new Date().toISOString().slice(0, 10);
const outDir = path.join(ROOT, 'prospekt', day);
fs.mkdirSync(outDir, { recursive: true });
const csv = [['butik', 'adress', 'epost', 'kontrollera_epost', 'roda', 'gula', 'tillganglighet', 'angerknapp', 'rabatter', 'miljo', 'sparning', 'resultat', 'utkast', 'fel']];
const cell = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));

let drafts = 0;
for (const [i, url] of urls.entries()) {
  process.stdout.write(`[${i + 1}/${urls.length}] ${url} … `);
  const r = await runOne(url).catch((err) => ({ ok: false, url, error: err?.message || String(err) }));
  if (!r.ok) {
    console.log(`fel: ${r.error}`);
    csv.push([r.host || url, url, '', '', '', '', '', '', '', '', '', '', '', r.error]);
    continue;
  }
  let draftFile = '';
  if (r.draft) {
    draftFile = `${r.host.replace(/[^a-z0-9.-]/gi, '_')}.txt`;
    fs.writeFileSync(path.join(outDir, draftFile), `Till: ${r.email ? `${r.email}${r.emailCheck ? '   ← kontrollera, annan domän än butiken' : ''}` : '(hittade ingen adress, leta på sajten)'}\nÄmne: ${r.draft.subject}\n\n${r.draft.body}\n`);
    drafts++;
  }
  const a = r.areas || {};
  csv.push([r.host, r.url, r.email || '', r.emailCheck ? 'ja' : '', r.summary.fail, r.summary.warn, a.tillganglighet, a.angerknapp, a.rabatter, a.miljo, a.sparning, r.draft?.link || '', draftFile, '']);
  console.log(`${r.summary.fail} röda, ${r.summary.warn} gula${r.draft ? ' → utkast' : ''}${r.email ? ` (${r.email})` : ''}`);
}

fs.writeFileSync(path.join(outDir, 'resultat.csv'), csv.map((row) => row.map(cell).join(',')).join('\n') + '\n');
console.log(`\n${drafts} mejlutkast av ${urls.length} butiker. Allt finns i ${path.relative(ROOT, outDir)}/`);
console.log('Skicka bara till aktiebolag (inte enskild firma) och läs varje utkast innan du skickar.');
