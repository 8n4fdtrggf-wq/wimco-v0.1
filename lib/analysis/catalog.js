// Gemensamma kataloger: kategorier, tjänster och guider. Används av både server och rapport.

export const CATEGORIES = [
  { id: 'performance', name: 'Prestanda', weight: 0.2 },
  { id: 'mobile', name: 'Mobilupplevelse', weight: 0.15 },
  { id: 'accessibility', name: 'Tillgänglighet', weight: 0.15 },
  { id: 'seo', name: 'SEO och teknisk grund', weight: 0.2 },
  { id: 'visual', name: 'Visuell tydlighet', weight: 0.15 },
  { id: 'conversion', name: 'Konverteringsförmåga', weight: 0.15 },
];

export const SERVICES = {
  hemsidor: { id: 'hemsidor', name: 'Hemsidor', line: 'H' },
  webbutveckling: { id: 'webbutveckling', name: 'Webbutveckling', line: 'W' },
  automation: { id: 'automation', name: 'AI och automation', line: 'A' },
  optimering: { id: 'optimering', name: 'Optimering', line: 'O' },
};

export const GUIDES = {
  prestanda: { title: 'Snabbare webbplats: Core Web Vitals på svenska', url: '/guider/prestanda/' },
  seo: { title: 'SEO-grunden varje företagssajt behöver', url: '/guider/seo-grund/' },
  tillganglighet: { title: 'Tillgänglighet som gör sajten bättre för alla', url: '/guider/tillganglighet/' },
  konvertering: { title: 'Från besökare till förfrågan: UX som konverterar', url: '/guider/konvertering/' },
  automation: { title: 'Automatisera leadhanteringen utan krångel', url: '/guider/automatisera-leads/' },
  kostnad: { title: 'Hur mycket kostar en hemsida?', url: '/blogg/hur-mycket-kostar-en-hemsida.html' },
};

export const SOURCE_LABELS = {
  measured: 'Uppmätt',
  rules: 'Regelkontroll',
  heuristic: 'Bedömning',
  ai: 'AI-bedömning',
};

export const STEPS = [
  { id: 'structure', label: 'Kontrollerar webbplatsens struktur' },
  { id: 'seo', label: 'Kontrollerar SEO och tillgänglighet' },
  { id: 'performance', label: 'Testar prestanda' },
  { id: 'mobile', label: 'Bedömer mobilupplevelsen' },
  { id: 'compile', label: 'Sammanställer förbättringsmöjligheter' },
];
