import type { StationsContent } from './types';

/** All copy for /wimco-score/, the method page. Edit here; components only render it. */

export const meta = {
  title: 'Wimco Score – så analyserar och poängsätter vi din webbplats | Wimco',
  description:
    'Så fungerar Wimco Score: sex kategorier, vilka källor som används, hur poängen viktas och prioriteras, och hur analysen skyddas mot missbruk.',
  ogTitle: 'Så fungerar Wimco Score',
  ogDescription: 'Ett betyg mellan 0 och 100 för din webbplats, och exakt var varje siffra kommer ifrån.',
};

export const hero = {
  tag: 'Metod',
  title: 'Så fungerar Wimco Score.',
  // The definition comes first, so the page answers "what is Wimco Score?" on its own.
  lede:
    'Wimco Score är en gratis analys som ger en webbplats ett betyg mellan 0 och 100. Betyget väger ihop sex områden: prestanda, mobil, tillgänglighet, SEO och teknik, visuell tydlighet och konvertering. Prestanda och tillgänglighet mäts med Google Lighthouse. Analysen tar ungefär en minut och kräver ingen registrering.',
  cta: { label: 'Analysera din webbplats', href: '/#analys' },
  secondary: { label: 'Så räknas poängen', href: '#berakning' },
  ringLabel: 'Exempel på ett Wimco Score-betyg, fördelat på sex delar',
  ringCaption: 'av 100',
  ringNote: 'Exempel',
};

export const sources = {
  tag: 'Källor',
  title: 'Tre sorters källor.',
  lede: 'Rapporten visar vilken källa varje siffra kommer från, så att du vet vad som är mätt och vad som är bedömt.',
  items: [
    {
      kind: 'measured' as const,
      label: 'Uppmätt',
      title: 'Google Lighthouse',
      text: 'Värden från Google Lighthouse via PageSpeed Insights: laddtider, layoutskift, blockeringstid och automatiska tester av tillgänglighet, SEO och bästa praxis. Testet körs som en mellanklasstelefon på mobilnät. Har sajten tillräckligt med trafik visas även riktiga besökares upplevelse från Chrome UX Report.',
    },
    {
      kind: 'measured' as const,
      label: 'Regelkontroll',
      title: 'Sidans kod',
      text: 'Fasta kontroller av sidans HTML och serverns svar: HTTPS, titel, metabeskrivning, rubriker, alt-texter, formuläretiketter, viewport, sitemap, strukturerad data och tecken på föråldrad teknik.',
    },
    {
      kind: 'judged' as const,
      label: 'Bedömning',
      title: 'Tydlighet och konvertering',
      text: 'Tolkningar enligt fasta regler: hur långt huvudbudskapet är, om det finns uppmaningar och var de syns, kontaktvägar och förtroendesignaler. När AI-bedömning är aktiverad får en språkmodell dessutom se sidans första skärm. Det märks då som AI-bedömning.',
    },
  ],
};

export const stationsSection: StationsContent = {
  title: 'Sex delar, ett betyg.',
  lede: 'Vikten avgör hur mycket varje del påverkar totalen. Prestanda och SEO väger tyngst.',
  sourcesNote: 'Uppmätt betyder Google Lighthouse. Regelkontroll betyder att sidans kod granskas mot fasta regler. Bedömning görs enligt fasta kriterier.',
  link: { label: 'Så räknas varje del', href: '#berakning' },
};

export const calculation = {
  tag: 'Beräkning',
  title: 'Så räknas poängen.',
  lede: 'Varje del är en blandning av Lighthouse och egna kontroller. Totalen är ett viktat snitt av delarna.',
  rows: [
    { label: 'Prestanda', weight: '20 %', text: '80 % Lighthouse-prestanda, 20 % egna kontroller.' },
    { label: 'Mobil', weight: '15 %', text: 'Egna kontroller, varav flera uppmätta i Lighthouse.' },
    { label: 'Tillgänglighet', weight: '15 %', text: '60 % Lighthouse-tillgänglighet, 40 % egna kontroller.' },
    { label: 'SEO och teknik', weight: '20 %', text: '40 % Lighthouse-SEO, 60 % egna kontroller.' },
    { label: 'Visuell tydlighet', weight: '15 %', text: 'Bedömning. Med AI vägs AI och regler lika.' },
    { label: 'Konvertering', weight: '15 %', text: 'Bedömning. Med AI vägs AI och regler lika.' },
  ],
  checksTitle: 'Varje kontroll',
  checks: [
    { tone: 'good' as const, label: 'Godkänd', value: 'Full poäng' },
    { tone: 'avg' as const, label: 'Kan förbättras', value: 'Halv poäng' },
    { tone: 'poor' as const, label: 'Brist', value: 'Ingen poäng' },
  ],
  note: 'Varje kontroll har en vikt mellan 1 och 5. Om en del inte kan mätas, till exempel för att Lighthouse inte når sidan, räknas den bort och vikterna fördelas om. Rapporten säger det.',
};

export const priority = {
  tag: 'Prioritering',
  title: 'Det viktigaste först.',
  lede: 'Alla brister rangordnas efter kontrollens vikt, hur allvarlig bristen är, delens vikt, möjlig effekt och uppskattad insats.',
  tiers: [
    { tone: 'poor' as const, label: 'Åtgärda först', text: 'De tre brister som ger mest effekt i förhållande till insatsen.' },
    { tone: 'avg' as const, label: 'Nästa förbättring', text: 'Det som ger tydlig effekt när det viktigaste är gjort.' },
    { tone: 'good' as const, label: 'Bra redan nu', text: 'Det som fungerar. Bra att veta så att det inte byggs bort.' },
  ],
};

export const limits = {
  tag: 'Ärligt talat',
  title: 'Begränsningar.',
  items: [
    'Analysen gäller den adress du anger, inte hela sajten.',
    'Lighthouse-värden varierar något mellan körningar.',
    'Sajter som blockerar automatiska besök kan inte analyseras.',
    'Bedömningar av tydlighet och konvertering är förenklingar. En människa ser saker regler missar, därför erbjuder vi en kostnadsfri genomgång.',
  ],
};

export const security = {
  tag: 'Säkerhet',
  title: 'Säkerhet och integritet.',
  paragraphs: [
    'Analysen hämtar bara publika http- och https-adresser på standardportar. Interna nätverk, lokala adresser, molnleverantörers metadatatjänster och vidarebefordringar dit stoppas innan någon anslutning görs. Hämtningen har tidsgräns, storleksgräns och ett begränsat antal vidarebefordringar, och antalet analyser per besökare är begränsat. Sidans kod körs aldrig, den läses som text.',
    'Rapporter sparas i 180 dagar och är privata. De nås bara via sin länk och visas inte i sökmotorer om inte den som skapade rapporten väljer det.',
  ],
  link: { label: 'Läs integritetspolicyn', href: '/integritet/' },
};

export const close = {
  title: 'Testa din sajt.',
  body: 'Gratis, ungefär en minut och ingen registrering. Sen bygger vi det som löser det, om du vill.',
  cta: { label: 'Analysera din webbplats', href: '/#analys' },
  secondary: { label: 'Starta ett projekt', href: '/#projekt' },
};
