// UTVECKLINGSDATA. Används endast när DEV_FIXTURES=1 (lokalt utan PSI-åtkomst).
// Rapporter som bygger på detta märks med devData=true och visas med tydlig varning.

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function psiFixture(url) {
  const h = hash(url);
  const r = (n) => ((h >> n) & 0xff) / 255;
  const lcp = 1800 + r(0) * 3600;
  const cls = Math.round(r(8) * 30) / 100;
  const tbt = 80 + r(16) * 700;
  const fcp = 1100 + r(24) * 1900;
  const perf = Math.max(0.2, Math.min(0.98, 1.15 - lcp / 6000 - tbt / 3000));
  const audit = (title, numericValue, score = 1) => ({ title, numericValue, score });
  return {
    lighthouseResult: {
      lighthouseVersion: 'dev-fixture',
      fetchTime: new Date().toISOString(),
      finalDisplayedUrl: url,
      categories: {
        performance: { score: perf },
        accessibility: { score: 0.78 + r(4) * 0.2, auditRefs: [{ id: 'color-contrast', weight: 7 }, { id: 'link-name', weight: 7 }] },
        seo: { score: 0.82 + r(12) * 0.17 },
        'best-practices': { score: 0.74 + r(20) * 0.25 },
      },
      audits: {
        'largest-contentful-paint': audit('Largest Contentful Paint', lcp),
        'cumulative-layout-shift': audit('Cumulative Layout Shift', cls),
        'total-blocking-time': audit('Total Blocking Time', tbt),
        'first-contentful-paint': audit('First Contentful Paint', fcp),
        'speed-index': audit('Speed Index', fcp + 900),
        'color-contrast': { title: 'Bakgrunds- och förgrundsfärger har inte tillräcklig kontrast (simulerat)', score: 0 },
        'link-name': { title: 'Länkarna har inte urskiljbara namn (simulerat)', score: r(2) > 0.5 ? 0 : 1 },
        'render-blocking-resources': { title: 'Eliminera resurser som blockerar renderingen (simulerat)', score: 0.3, details: { type: 'opportunity', overallSavingsMs: 600 } },
        'uses-optimized-images': { title: 'Koda bilder effektivt (simulerat)', score: 0.4, details: { type: 'opportunity', overallSavingsMs: 450 } },
      },
    },
    loadingExperience: null,
  };
}

// Tillgänglighetstestet: ett Lighthouse-svar med bara kategorin "accessibility".
// Felen varierar med adressen så att olika sidor ger olika resultat.
export function a11yFixture(url) {
  const h = hash(url);
  const on = (bit) => ((h >> bit) & 1) === 1;
  const node = (label, snippet, selector) => ({ node: { type: 'node', nodeLabel: label, snippet, selector } });
  const audits = {
    'color-contrast': { title: 'Bakgrunds- och förgrundsfärger har inte tillräckligt kontrastförhållande (simulerat)', description: 'Text med låg kontrast är svår eller omöjlig att läsa för många användare. [Läs mer](https://dequeuniversity.com/rules/axe/4.10/color-contrast).', score: 0, scoreDisplayMode: 'binary', details: { items: [node('Fri frakt över 499 kr', '<p class="announcement">Fri frakt över 499 kr</p>', 'p.announcement'), node('Ord. pris 399 kr', '<s class="price--compare">Ord. pris 399 kr</s>', 's.price--compare')] } },
    'button-name': { title: 'Knappar har inte tillgängliga namn (simulerat)', description: 'När en knapp saknar tillgängligt namn läser skärmläsare upp den som "knapp".', score: on(1) ? 0 : 1, scoreDisplayMode: 'binary', details: { items: [node('', '<button class="header__icon--cart"><svg>…</svg></button>', 'button.header__icon--cart')] } },
    'image-alt': { title: 'Bildelement saknar [alt]-attribut (simulerat)', description: 'Informativa element ska ha korta, beskrivande alternativtexter.', score: on(2) ? 0 : 1, scoreDisplayMode: 'binary', details: { items: [node('', '<img src="/cdn/produkt-1.jpg" width="600">', 'img'), node('', '<img src="/cdn/produkt-2.jpg" width="600">', 'img'), node('', '<img src="/cdn/produkt-3.jpg" width="600">', 'img')] } },
    'label': { title: 'Formulärelement har inte etiketter (simulerat)', description: 'Etiketter gör att hjälpmedel kan läsa upp formulärfälten.', score: on(3) ? 0 : 1, scoreDisplayMode: 'binary', details: { items: [node('', '<input type="search" name="q" placeholder="Sök">', 'input[name="q"]')] } },
    'link-name': { title: 'Länkar har inte urskiljbara namn (simulerat)', description: 'Länktext som är urskiljbar, unik och fokuserbar gör det lättare att navigera.', score: on(4) ? 0 : 1, scoreDisplayMode: 'binary', details: { items: [node('', '<a href="https://instagram.com/butiken"><svg>…</svg></a>', 'footer a')] } },
    'heading-order': { title: 'Rubrikelement visas inte i fallande ordning (simulerat)', description: 'Rubriker i rätt ordning gör sidans struktur begriplig.', score: on(5) ? 0 : 1, scoreDisplayMode: 'binary', details: { items: [node('Populära produkter', '<h4>Populära produkter</h4>', 'h4')] } },
    'aria-hidden-focus': { title: '[aria-hidden="true"]-element innehåller fokuserbara underordnade element (simulerat)', description: 'Fokuserbara element i ett dolt område går att nå med tangentbordet men inte att uppfatta.', score: on(6) ? 0 : 1, scoreDisplayMode: 'binary', details: { items: [node('Stäng', '<div aria-hidden="true" class="drawer"><button>Stäng</button></div>', 'div.drawer')] } },
    'target-size': { title: 'Tryckytorna är inte tillräckligt stora (simulerat)', description: 'Små tryckytor är svåra att träffa.', score: on(7) ? 0 : 1, scoreDisplayMode: 'binary', details: { items: [node('1', '<a href="?page=1">1</a>', 'nav.pagination a')] } },
    'html-has-lang': { title: '<html>-elementet har ett [lang]-attribut', score: 1, scoreDisplayMode: 'binary' },
    'document-title': { title: 'Dokumentet har ett <title>-element', score: 1, scoreDisplayMode: 'binary' },
    'meta-viewport': { title: 'Zoom är inte inaktiverat', score: 1, scoreDisplayMode: 'binary' },
    'focus-traps': { title: 'Användaren fastnar inte i någon del av sidan', score: null, scoreDisplayMode: 'manual' },
    'logical-tab-order': { title: 'Sidan har en logisk tabbordning', score: null, scoreDisplayMode: 'manual' },
    'video-caption': { title: 'Videor har undertexter', score: null, scoreDisplayMode: 'notApplicable' },
  };
  const weights = { 'color-contrast': 7, 'button-name': 10, 'image-alt': 10, label: 7, 'link-name': 7, 'heading-order': 3, 'aria-hidden-focus': 7, 'target-size': 7, 'html-has-lang': 7, 'document-title': 7, 'meta-viewport': 10, 'focus-traps': 0, 'logical-tab-order': 0, 'video-caption': 10 };
  const auditRefs = Object.keys(audits).map((id) => ({ id, weight: weights[id] }));
  const total = auditRefs.reduce((n, r) => n + (audits[r.id].scoreDisplayMode === 'binary' ? r.weight : 0), 0);
  const ok = auditRefs.reduce((n, r) => n + (audits[r.id].scoreDisplayMode === 'binary' && audits[r.id].score === 1 ? r.weight : 0), 0);
  // Nätverksanrop som i ett test där ingen svarat på samtyckesfrågan (används av E-handelskollen).
  audits['network-requests'] = {
    title: 'Nätverksbegäranden',
    score: null,
    scoreDisplayMode: 'informative',
    details: {
      items: [
        { url },
        { url: 'https://connect.facebook.net/en_US/fbevents.js' },
        { url: 'https://www.facebook.com/tr/?id=123456789&ev=PageView' },
        { url: 'https://region1.google-analytics.com/g/collect?v=2&tid=G-TEST&gcs=G100' },
      ],
    },
  };
  return {
    lighthouseResult: {
      lighthouseVersion: 'dev-fixture',
      fetchTime: new Date().toISOString(),
      finalDisplayedUrl: url,
      categories: { accessibility: { score: ok / total, auditRefs } },
      audits,
    },
  };
}
