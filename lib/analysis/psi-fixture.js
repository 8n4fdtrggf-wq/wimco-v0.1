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
