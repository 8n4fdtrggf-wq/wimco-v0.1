// E-handelskollen: kontroller av sidornas kod för ångerknapp, rabattpriser, miljöpåståenden och spårning.
// Tillgängligheten mäts av lib/a11y/check.js och översätts hit med a11yArea().
//
// Varje kontroll returnerar ett område:
//   { id, status: 'fail' | 'warn' | 'pass' | 'unknown', method: 'rules' | 'measured', summary, findings[] }
//   finding: { severity: 'fail' | 'warn' | 'info', title, detail, evidence?, page? }
//
// Kontrollerna flaggar risker utifrån det som syns i sidornas kod. De kan aldrig intyga att en butik
// följer lagen, och resultatet beskrivs alltid så.
import { parseHtml } from '../analysis/html-parse.js';

const PAGE_LABEL = { start: 'Startsida', product: 'Produktsida', search: 'Sökresultat' };
const clip = (s, n) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const around = (text, index, length, pad = 70) => {
  const a = Math.max(0, index - pad);
  const b = Math.min(text.length, index + length + pad);
  return `${a > 0 ? '…' : ''}${text.slice(a, b).replace(/\s+/g, ' ').trim()}${b < text.length ? '…' : ''}`;
};

/** Visible text and parsed signals for each page, computed once. */
export function preparePages(pages) {
  return pages
    .filter((p) => typeof p.html === 'string' && p.html)
    .map((p) => {
      const html = p.html.slice(0, 3 * 1024 * 1024);
      const parsed = parseHtml(html);
      return { kind: p.kind, url: p.url, html, parsed, text: parsed.textChunks.join(' ') };
    });
}

const statusOf = (findings) =>
  findings.some((f) => f.severity === 'fail') ? 'fail' : findings.some((f) => f.severity === 'warn') ? 'warn' : 'pass';

/* ---------- Ångerknapp ---------- */

// "Ångra avtalet här" och liknande: själva funktionen som krävs sedan 19 juni 2026.
const WITHDRAW_FUNCTION = /ångra\s+(?:avtalet|köpet|köp|ditt\s+köp|mitt\s+köp|beställningen|din\s+beställning|ordern|order)|ångerknapp|ångra\s+här/iu;
const WITHDRAW_HREF = /angra[-_]?(?:avtal|kop|bestallning|order)|withdraw(?:al)?|cancel[-_]?(?:order|contract)/i;
// Information om ångerrätten, men inte funktionen.
const WITHDRAW_INFO = /ångerrätt|ångerblankett|ångerformulär|ångerfrist|standardformulär\s+för\s+utövande\s+av\s+ångerrätt/iu;

export function checkWithdrawal(prepared) {
  const pages = prepared.filter((p) => p.kind === 'start' || p.kind === 'product');
  let fn = null;
  let info = null;
  for (const p of pages) {
    const controls = [
      ...p.parsed.anchors.map((a) => ({ text: `${a.text} ${a.ariaLabel}`.trim(), href: a.href })),
      ...p.parsed.buttons.map((b) => ({ text: `${b.text} ${b.ariaLabel}`.trim(), href: '' })),
    ];
    for (const c of controls) {
      if (!fn && (WITHDRAW_FUNCTION.test(c.text) || WITHDRAW_HREF.test(c.href))) fn = { page: p.kind, text: c.text || c.href };
      if (!info && (WITHDRAW_INFO.test(c.text) || /angerratt|angerblankett/i.test(c.href))) info = { page: p.kind, text: c.text || c.href };
    }
    if (!info) {
      const m = WITHDRAW_INFO.exec(p.text);
      if (m) info = { page: p.kind, text: around(p.text, m.index, m[0].length, 40) };
    }
  }

  const findings = [];
  if (fn) {
    findings.push({
      severity: 'info',
      title: `Vi hittade en ångerfunktion: "${clip(fn.text, 60)}"`,
      detail: 'Kontrollera att den går att använda under hela ångerfristen, att kunden kan ange namn och vilket avtal det gäller, att den kräver en uttrycklig bekräftelse och att ett kvitto skickas direkt.',
      evidence: clip(fn.text, 120),
      page: fn.page,
    });
  } else {
    findings.push({
      severity: 'fail',
      title: 'Ingen ångerknapp hittades',
      detail: 'Sedan 19 juni 2026 ska den som säljer på nätet ha en tydligt märkt funktion, till exempel "Ångra avtalet här", som är lätt att hitta under hela ångerfristen. Vi letade på startsidan och produktsidan.',
      page: 'start',
    });
    if (info) {
      findings.push({
        severity: 'info',
        title: 'Det finns information om ångerrätten',
        detail: 'Information om ångerrätten eller en ångerblankett räcker inte. Kunden ska kunna ångra köpet direkt i butiken.',
        evidence: clip(info.text, 140),
        page: info.page,
      });
    }
  }
  findings.push({
    severity: 'info',
    title: 'Ett flöde efter inloggning syns inte här',
    detail: 'Om ångerfunktionen bara finns på Mina sidor eller i orderbekräftelsen kan vi inte se den. Den ska ändå vara lätt att hitta.',
  });
  return {
    id: 'angerknapp',
    status: fn ? 'pass' : 'fail',
    method: 'rules',
    summary: fn ? 'En ångerfunktion finns. Kontrollera att den uppfyller kraven.' : 'Vi hittade ingen funktion för att ångra köpet.',
    findings,
  };
}

/* ---------- Rabattpriser ---------- */

const PRICE = String.raw`\d[\d\s.]{0,8}(?:,\d{2})?\s*(?:kr|sek|:-)`;
const STRUCK = new RegExp(String.raw`<(s|del|strike)\b[^>]*>(?:(?!</\1>)[\s\S]){0,400}?${PRICE}`, 'giu');
const SALE_CLASS = /class\s*=\s*["'][^"']*(?:price--on-sale|\bonsale\b|\bon-sale\b|sale-price|price--sale|price__sale--active|special-price|product-price--sale|rea-pris)[^"']*["']/gi;
const SALE_TEXT = new RegExp(String.raw`(?:ord(?:inarie)?\.?\s*pris|tidigare\s+pris|förr|ord\.)\s*:?\s*${PRICE}|spara\s+\d{1,3}\s*%|(?:^|[\s(])[-–−]\s?\d{1,2}\s?%`, 'giu');
const LOWEST = /lägsta\s+pris(?:et)?[^.<]{0,90}?30\s*dag|30\s*dag(?:ar|arna)?[^.<]{0,70}?lägsta\s+pris|tidigare\s+lägsta\s+pris|lowest\s+price[^.<]{0,70}?30\s*days/iu;
const REA_WORD = /(?<!\p{L})(?:rea|black\s+friday|cyber\s+monday|mellandagsrea|outlet)(?!\p{L})/iu;

export function checkPrices(prepared) {
  let discounts = 0;
  const examples = [];
  const pagesWithDiscount = new Set();
  let lowest = null;
  let rea = false;
  for (const p of prepared) {
    let n = 0;
    for (const re of [STRUCK, SALE_CLASS, SALE_TEXT]) {
      re.lastIndex = 0;
      let m;
      const source = re === SALE_TEXT ? p.text : p.html;
      while ((m = re.exec(source)) && n < 60) {
        n++;
        if (examples.length < 3) {
          const ex = re === SALE_TEXT ? around(p.text, m.index, m[0].length, 40) : clip(m[0], 160);
          examples.push({ page: p.kind, text: ex });
        }
      }
    }
    if (n) {
      discounts += n;
      pagesWithDiscount.add(p.kind);
    }
    const lm = LOWEST.exec(p.text) || LOWEST.exec(p.html);
    if (lm && !lowest) lowest = { page: p.kind, text: clip(lm[0], 120) };
    if (REA_WORD.test(p.text)) rea = true;
  }

  const findings = [];
  let status = 'pass';
  let summary = 'Inga prissänkningar syntes på de testade sidorna.';
  if (discounts && !lowest) {
    status = 'fail';
    summary = 'Rabatter visas utan det lägsta priset de senaste 30 dagarna.';
    findings.push({
      severity: 'fail',
      title: 'Prissänkning utan lägsta pris de senaste 30 dagarna',
      detail: 'Den som anger att ett pris är sänkt ska också ange det lägsta pris varan haft de senaste 30 dagarna, och rabatten ska räknas från det priset. Vi såg nedsatta priser men ingen sådan uppgift.',
      evidence: examples[0]?.text,
      page: examples[0]?.page,
    });
  } else if (discounts && lowest) {
    summary = 'Rabatter visas tillsammans med lägsta pris de senaste 30 dagarna.';
    findings.push({
      severity: 'info',
      title: 'Lägsta pris de senaste 30 dagarna anges',
      detail: 'Kontrollera att uppgiften stämmer med prishistoriken och att procentsatsen räknas från det lägsta priset, inte från ordinarie pris.',
      evidence: lowest.text,
      page: lowest.page,
    });
  } else if (rea) {
    status = 'warn';
    summary = 'Butiken marknadsför rea, men vi såg inga nedsatta priser på de testade sidorna.';
    findings.push({
      severity: 'warn',
      title: 'Kontrollera reasidorna',
      detail: 'Vi testade startsidan, en produktsida och sökresultatet. Kampanj- och kategorisidor med nedsatta priser ingår inte i den automatiska kontrollen.',
    });
  }
  findings.push({
    severity: 'info',
    title: 'Prishistoriken kan vi inte se',
    detail: 'Om det angivna lägsta priset faktiskt stämmer går bara att kontrollera mot butikens egen prishistorik.',
  });
  return { id: 'rabatter', status, method: 'rules', summary, findings, pages: [...pagesWithDiscount] };
}

/* ---------- Miljöpåståenden ---------- */

const B = '(?<!\\p{L})';
const E = '(?!\\p{L})';
// Förbjudna i de nya EU-reglerna: klimatneutralitet genom kompensation, och generella miljöpåståenden
// utan erkänd utmärkt miljöprestanda.
const CLAIMS = [
  { risk: 'fail', kind: 'climate', re: new RegExp(`${B}(?:klimat|koldioxid|co2|co₂)[-\\s]?(?:neutral|positiv|kompenserad)(?:a|t|e)?${E}|${B}netto[-\\s]?noll${E}|${B}(?:carbon|climate)[-\\s](?:neutral|positive)${E}`, 'giu') },
  { risk: 'fail', kind: 'generic', re: new RegExp(`${B}(?:miljö|natur|klimat|eko|jord|planet)(?:vänlig|smart|snäll)(?:a|t|are|aste)?${E}|${B}eco[-\\s]?friendly${E}|${B}environmentally[-\\s]friendly${E}|${B}grönare${E}|${B}(?:bra|skonsam|snäll(?:are)?)\\s+(?:för|mot)\\s+(?:miljön|klimatet|planeten)${E}|${B}grönt\\s+val${E}`, 'giu') },
  { risk: 'warn', kind: 'needs-proof', re: new RegExp(`${B}hållbar(?:a|t|are)?${E}|${B}sustainable${E}|${B}biologiskt\\s+nedbrytbar(?:a|t)?${E}|${B}(?:100\\s?%\\s+)?återvinningsbar(?:a|t)?${E}|${B}cirkulär(?:a|t)?${E}`, 'giu') },
];

export function checkGreenClaims(prepared) {
  const hits = new Map(); // phrase -> { risk, kind, count, examples }
  for (const p of prepared) {
    for (const chunk of p.parsed.textChunks) {
      for (const c of CLAIMS) {
        c.re.lastIndex = 0;
        let m;
        while ((m = c.re.exec(chunk))) {
          const key = m[0].toLowerCase().replace(/\s+/g, ' ');
          let h = hits.get(key);
          if (!h) hits.set(key, (h = { phrase: m[0], risk: c.risk, kind: c.kind, count: 0, examples: [] }));
          h.count++;
          if (h.examples.length < 2) h.examples.push({ page: p.kind, text: around(chunk, m.index, m[0].length, 90) });
        }
      }
    }
  }
  const list = [...hits.values()].sort((a, b) => (a.risk === b.risk ? b.count - a.count : a.risk === 'fail' ? -1 : 1));
  const findings = list.slice(0, 8).map((h) => ({
    severity: h.risk,
    title: `"${h.phrase}"${h.count > 1 ? ` (${h.count} gånger)` : ''}`,
    detail:
      h.kind === 'climate'
        ? 'Påståenden om att en vara är klimatneutral eller klimatkompenserad förbjuds när de bygger på kompensation utanför den egna värdekedjan.'
        : h.kind === 'generic'
          ? 'Generella miljöpåståenden kräver bevis för erkänd utmärkt miljöprestanda, till exempel en officiell miljömärkning. Annars förbjuds de.'
          : 'Ordet förbjuds inte, men påståendet måste kunna styrkas och vara specifikt. "Hållbar" är särskilt svårt eftersom det kan uppfattas omfatta mer än miljön.',
    evidence: h.examples[0]?.text,
    page: h.examples[0]?.page,
  }));
  const status = list.length ? statusOf(findings) : 'pass';
  findings.push({
    severity: 'info',
    title: 'Bilder, miljömärken och produkttexter längre in ingår inte',
    detail: 'Vi läser texten på de tre testade sidorna. Egna miljömärken, påståenden i bilder och texter på andra sidor behöver gås igenom manuellt.',
  });
  return {
    id: 'miljo',
    status,
    method: 'rules',
    summary: !list.length
      ? 'Inga riskabla miljöpåståenden i texten på de testade sidorna.'
      : status === 'fail'
        ? `${list.filter((h) => h.risk === 'fail').length} påståenden som kan vara förbjudna utan underlag.`
        : 'Påståenden som behöver kunna styrkas.',
    findings,
  };
}

/* ---------- Spårning och samtycke ---------- */

export const TRACKERS = [
  { id: 'meta', name: 'Meta-pixeln', re: /connect\.facebook\.net\/[^"'\s]*fbevents|facebook\.com\/tr[/?]|fbq\(\s*['"]init/i },
  { id: 'ga', name: 'Google Analytics', re: /googletagmanager\.com\/gtag\/js|google-analytics\.com\/(?:analytics\.js|g\/collect|collect|mp\/collect)|region\d+\.google-analytics\.com|gtag\(\s*['"]config['"]\s*,\s*['"]G-/i },
  { id: 'ads', name: 'Google Ads', re: /googleadservices\.com|googlesyndication\.com|doubleclick\.net|gtag\(\s*['"]config['"]\s*,\s*['"]AW-/i },
  { id: 'tiktok', name: 'TikTok-pixeln', re: /analytics\.tiktok\.com|ttq\.load\(/i },
  { id: 'snap', name: 'Snapchat-pixeln', re: /sc-static\.net\/scevent|tr\.snapchat\.com|snaptr\(\s*['"]init/i },
  { id: 'pinterest', name: 'Pinterest-taggen', re: /s\.pinimg\.com\/ct\/core\.js|ct\.pinterest\.com|pintrk\(\s*['"]load/i },
  { id: 'linkedin', name: 'LinkedIn Insight', re: /snap\.licdn\.com\/li\.lms-analytics|px\.ads\.linkedin\.com/i },
  { id: 'bing', name: 'Microsoft Ads', re: /bat\.bing\.com/i },
  { id: 'hotjar', name: 'Hotjar', re: /static\.hotjar\.com|script\.hotjar\.com/i },
  { id: 'clarity', name: 'Microsoft Clarity', re: /clarity\.ms\/(?:tag|collect)/i },
];
const GTM = /googletagmanager\.com\/gtm\.js|\bGTM-[A-Z0-9]{4,}\b/;
export const CMPS = [
  { name: 'Cookiebot', re: /consent\.cookiebot\.com|cookiebot/i },
  { name: 'OneTrust', re: /cdn\.cookielaw\.org|onetrust|optanon/i },
  { name: 'CookieYes', re: /cdn-cookieyes\.com|cookieyes|cookie-law-info/i },
  { name: 'Usercentrics', re: /usercentrics/i },
  { name: 'Cookie Information', re: /cookieinformation\.com/i },
  { name: 'Didomi', re: /sdk\.privacy-center\.org|didomi/i },
  { name: 'iubenda', re: /iubenda/i },
  { name: 'Complianz', re: /complianz|cmplz/i },
  { name: 'CookieFirst', re: /cookiefirst/i },
  { name: 'Borlabs Cookie', re: /borlabs-cookie/i },
  { name: 'Real Cookie Banner', re: /real-cookie-banner/i },
  { name: 'Cookie Script', re: /cookie-script\.com/i },
  { name: 'Shopifys samtyckesbanner', re: /consent-tracking-api|customerPrivacy|shopify-privacy-banner|privacy-banner\/storefront/i },
];
const CONSENT_DEFAULT_DENIED = /gtag\(\s*['"]consent['"]\s*,\s*['"]default['"][\s\S]{0,400}?['"]denied['"]/i;
const GATED_ATTR = /\bdata-(?:cookieconsent|cookiecategory|cookie-category|category|usercentrics|cookiescript|consent|cmplz-src|borlabs-cookie-script-blocker-id)\b|class\s*=\s*["'][^"']*optanon-category/i;

/** Trackers loaded by executable script tags in the HTML. Scripts held back by a consent tool are skipped. */
export function trackersInHtml(html) {
  const found = new Map();
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase() || '';
    if (type && !/javascript|module|ecmascript/.test(type)) continue;
    if (GATED_ATTR.test(attrs)) continue;
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || '';
    const body = m[2].slice(0, 20000);
    for (const t of TRACKERS) {
      if (!found.has(t.id) && (t.re.test(src) || t.re.test(body))) found.set(t.id, { ...t, evidence: clip(src || body, 140) });
    }
  }
  return found;
}

export function checkTracking(prepared, { requests = null } = {}) {
  const start = prepared.find((p) => p.kind === 'start') || prepared[0];
  const html = start?.html || '';
  const cmp = CMPS.find((c) => c.re.test(html)) || null;
  const consentMode = CONSENT_DEFAULT_DENIED.test(html);
  const gtm = GTM.test(html);
  const measured = Array.isArray(requests) && requests.length > 0;

  const trackers = trackersInHtml(html);
  if (measured) {
    for (const url of requests) {
      for (const t of TRACKERS) {
        if (!t.re.test(url)) continue;
        const prev = trackers.get(t.id);
        // Google-taggen i "avancerat" Consent Mode skickar cookiefria mätningar (gcs=G100) innan samtycke.
        // Ett vanligt anrop väger tyngre än ett cookiefritt, så det ersätter det.
        const cookieless = t.id === 'ga' && /[?&]gcs=G1[0-1]0/.test(url);
        if (!prev || !prev.loaded || (prev.cookieless && !cookieless)) {
          trackers.set(t.id, { ...t, evidence: clip(url, 140), loaded: true, cookieless });
        }
      }
    }
  }

  const findings = [];
  for (const t of trackers.values()) {
    const before = measured && t.loaded;
    let severity = cmp ? 'warn' : 'fail';
    let detail = cmp
      ? `Butiken använder ${cmp.name}, men ${t.name} ${before ? 'skickade data i testet innan någon svarat på samtyckesfrågan' : 'laddas direkt i sidans kod'}. Kontrollera att den väntar tills besökaren har sagt ja.`
      : `${t.name} ${before ? 'skickade data i testet' : 'laddas direkt i sidans kod'}, och vi hittade ingen samtyckeslösning. Spårning för statistik och annonser kräver samtycke innan den startar.`;
    if (t.cookieless) {
      severity = 'warn';
      detail = 'Google-taggen skickar cookiefria mätningar innan samtycke (Consent Mode i avancerat läge). Det är omdiskuterat om det är förenligt med reglerna. Kontrollera er inställning.';
    }
    if (before && cmp) detail += ' Vissa samtyckesverktyg beter sig annorlunda för besökare utanför EU, så kontrollera också från en svensk uppkoppling.';
    findings.push({ severity, title: `${t.name}${before ? ' laddades innan samtycke' : ''}`, detail, evidence: t.evidence, page: 'start' });
  }
  if (!trackers.size && gtm) {
    findings.push({
      severity: 'warn',
      title: 'Google Tag Manager laddas',
      detail: 'Tag Manager kan i sin tur ladda spårning som inte syns i sidans kod. Kontrollera att taggarna i containern väntar på samtycke.',
      page: 'start',
    });
  }
  if (cmp) findings.push({ severity: 'info', title: `Samtyckeslösning: ${cmp.name}`, detail: consentMode ? 'Google Consent Mode är inställt till "nekat" som standard.' : '' });
  else if (trackers.size) findings.push({ severity: 'info', title: 'Ingen samtyckeslösning hittades', detail: 'Vi letade efter de vanligaste verktygen (Cookiebot, OneTrust, CookieYes, Usercentrics, Shopifys banner m.fl.).' });
  findings.push({
    severity: 'info',
    title: measured ? 'Mätt i Googles testmiljö och i sidans kod' : 'Kontrollerat i sidans kod',
    detail: measured
      ? 'Vi listade vad sidan laddade i ett test där ingen svarade på samtyckesfrågan, och läste sidans kod.'
      : 'Spårning som läggs till med JavaScript efter att sidan laddats syns inte i koden. En fullständig kontroll görs i webbläsare.',
  });
  const status = trackers.size || gtm ? statusOf(findings) : 'pass';
  return {
    id: 'sparning',
    status,
    method: measured ? 'measured' : 'rules',
    summary: !trackers.size
      ? gtm
        ? 'Tag Manager laddas. Kontrollera att taggarna väntar på samtycke.'
        : 'Ingen känd spårning laddas innan samtycke.'
      : status === 'fail'
        ? `${[...trackers.values()].map((t) => t.name).join(', ')} utan synlig samtyckeslösning.`
        : `${[...trackers.values()].map((t) => t.name).join(', ')}. Kontrollera att de väntar på samtycke.`,
    findings,
    cmp: cmp?.name || null,
  };
}

/* ---------- Tillgänglighet, från tillgänglighetstestet ---------- */

export function a11yArea(report) {
  const s = report.summary;
  const findings = report.issues.slice(0, 5).map((i) => ({
    severity: i.severity === 'moderate' ? 'warn' : 'fail',
    title: i.title,
    detail: i.fix || i.description || '',
    evidence: i.examples?.[0]?.snippet || '',
    page: i.pages?.[0],
  }));
  if (!report.statement?.found) {
    findings.unshift({
      severity: 'fail',
      title: 'Ingen länk till en tillgänglighetsredogörelse',
      detail: 'Lagen kräver att butiken informerar om hur tjänsten uppfyller tillgänglighetskraven.',
      page: 'start',
    });
  }
  if (report.overlay) {
    findings.push({
      severity: 'warn',
      title: `${report.overlay.name} ligger ovanpå sajten`,
      detail: 'Tillgänglighetsverktyg som läggs ovanpå sajten ändrar inte koden under. Felen finns kvar för den som använder skärmläsare eller tangentbord.',
      page: 'start',
    });
  }
  if (report.issues.length > 5) {
    findings.push({ severity: 'info', title: `Och ${report.issues.length - 5} typer av fel till`, detail: 'Se hela tillgänglighetsresultatet.' });
  }
  const status = statusOf(findings);
  return {
    id: 'tillganglighet',
    status,
    method: s.method === 'lighthouse' ? 'measured' : 'rules',
    score: s.score,
    summary:
      status === 'pass'
        ? `Inga fel i de automatiska testerna (${s.score}/100).`
        : `${s.critical + s.serious} allvarliga och ${s.moderate} mindre fel, snitt ${s.score ?? '–'}/100.`,
    findings,
    a11yId: report.id,
  };
}

export { PAGE_LABEL };
