import type { FaqContent } from './types';

/**
 * All copy for /tillganglighet/: the free check of the pages PTS reviews, the packages and the order.
 * Package names, prices and contents are not here: they come from ../lib/a11y/packages.js,
 * the same file the API uses when an order comes in.
 */

export const meta = {
  title: 'Tillgänglighet för e-handel: gratis test, granskning och åtgärd | Wimco',
  description:
    'Testa gratis om er e-handel klarar tillgänglighetslagen på sidorna PTS granskar: startsida, produktsida och sök. Beställ granskning och åtgärd till fast pris.',
  ogTitle: 'Klarar er e-handel tillgänglighetslagen?',
  ogDescription: 'Gratis test av startsida, produktsida och sök. Granskning och åtgärd till fast pris.',
};

export const hero = {
  tag: 'Tillgänglighetslagen',
  title: 'Klarar er e-handel tillgänglighets­lagen?',
  lede: 'Sedan 28 juni 2025 ska e-handel kunna användas av alla. PTS granskar startsidan, en produktsida och sökfunktionen. Testa just de sidorna gratis.',
  proof: ['Mätt med Google Lighthouse (axe-core)', 'Ingen registrering', 'Fast pris om ni vill ha hjälp'],
};

export const check = {
  id: 'testa',
  tag: 'Gratis test · ca 1 minut',
  title: 'Testa sidorna PTS tittar på',
  inputLabel: 'Butikens webbadress',
  placeholder: 'dinbutik.se',
  submit: 'Testa',
  productToggle: 'Välj produktsida själv',
  productLabel: 'Adress till en produktsida (valfritt)',
  productPlaceholder: 'dinbutik.se/products/en-produkt',
  invalid: 'Ange butikens webbadress, till exempel dinbutik.se.',
  pages: { start: 'Startsida', product: 'Produktsida', search: 'Sökresultat' } as Record<string, string>,
  pageHints: { start: 'Första intrycket', product: 'Bild, pris, köpknapp', search: 'Sökfält och träffar' } as Record<string, string>,
  waiting: 'Väntar',
  measuring: 'Testas',
  missing: 'Hittades inte',
  failed: 'Kunde inte mätas',
  idleNote: 'Vi letar upp en produktsida och sökfunktionen själva.',
  preparing: 'Startar testet…',
  measuringNote: 'Testar sidorna. Det tar oftast 30–60 sekunder.',
  networkError: 'Anslutningen bröts. Kontrollera nätet och försök igen.',
  unexpectedEnd: 'Testet avbröts innan det var klart. Försök igen.',
  loadingSaved: 'Hämtar resultatet…',
};

export const result = {
  tag: 'Resultat',
  devTitle: 'Utvecklingsdata',
  devBody: 'Det här resultatet bygger på simulerade mätningar och beskriver inte den riktiga sajten.',
  scoreOf: 'snitt av {n} {pages}',
  counts: { critical: '{n} kritiska', serious: '{n} allvarliga', moderate: '{n} måttliga', instances: '{n} förekomster' },
  severity: { critical: 'Kritisk', serious: 'Allvarlig', moderate: 'Måttlig' } as Record<string, string>,
  source: { found: 'Hittad på startsidan', given: 'Angiven', guess: 'Plattformens sökadress', missing: 'Hittades inte' } as Record<string, string>,
  issuesTitle: 'Det här behöver rättas',
  noIssues: 'De automatiska testerna hittade inga fel på de här sidorna.',
  showAll: 'Visa alla {n}',
  fix: 'Så rättas det',
  who: 'Drabbar',
  pagesLabel: 'Sidor',
  examples: 'Exempel från sidan',
  count: '{n} st',
  issueTypes: '{n} typer av fel',
  noneOnPage: 'Inga fel i de automatiska testerna',
  statementFound:
    'Startsidan länkar till information om tillgänglighet. Kontrollera att den beskriver hur butiken uppfyller kraven och vilka brister som finns.',
  statementMissingTitle: 'Ingen länk till en tillgänglighetsredogörelse.',
  statementMissing: 'Lagen kräver att ni informerar om hur tjänsten uppfyller kraven. Den ingår i alla våra paket.',
  overlayTitle: '{name} ligger ovanpå sajten.',
  overlay: 'Sådana verktyg ändrar inte koden under, så felen finns kvar för den som använder skärmläsare eller tangentbord.',
  manualTitle: 'Det här kan inget automatiskt test se.',
  manual: 'Tangentbord, fokusordning, skärmläsare, varukorg och kassa måste testas av en människa.',
  ctaTitleIssues: 'Vill du att vi tar hand om det?',
  ctaTitleClean: 'Vill du veta säkert?',
  ctaBody:
    'En granskning testar hela köpflödet med tangentbord och skärmläsare, ger en prioriterad åtgärdslista och en tillgänglighetsredogörelse. Vi kan också rätta felen åt er, till fast pris.',
  ctaFix: 'Beställ granskning och åtgärd',
  ctaReview: 'Beställ granskning',
  ctaCompare: 'Jämför paketen',
  again: 'Testa en annan butik',
  saved: 'Resultatet sparas privat i 180 dagar.',
  method: { lighthouse: 'Uppmätt med Lighthouse', rules: 'Kontrollerad i koden' } as Record<string, string>,
  rulesTitle: 'Googles mätverktyg svarade inte just nu, så vi kontrollerade sidornas kod direkt.',
  rulesBody:
    'Det fångar bland annat saknade etiketter, alt-texter, knappnamn och avstängd zoom, men inte kontrast eller innehåll som laddas med JavaScript. Kör testet igen om en stund för en fullständig mätning.',
  rulesAgain: 'Kör testet igen',
  savedLink: 'Länk till resultatet',
};

export const law = {
  tag: 'Lagen i korthet',
  title: 'Det här gäller.',
  lede: 'Lagen (2023:254) om vissa produkters och tjänsters tillgänglighet bygger på EU:s tillgänglighetsdirektiv.',
  rows: [
    { label: 'Sedan', text: '28 juni 2025.' },
    {
      label: 'Vilka',
      text: 'E-handel som riktar sig till konsumenter. Mikroföretag som säljer tjänster, med färre än 10 anställda och högst 2 miljoner euro i omsättning, är undantagna.',
    },
    { label: 'Vem granskar', text: 'Post- och telestyrelsen (PTS). Tillsynen sker stegvis och börjar med startsida, produktsida och sökfunktion.' },
    {
      label: 'Vad krävs',
      text: 'Att butiken följer standarden EN 301 549, i praktiken WCAG 2.1 nivå AA, och att det finns information om hur tjänsten uppfyller kraven.',
    },
  ],
  note: 'En sammanfattning, inte juridisk rådgivning. Läs mer hos',
  noteLink: { label: 'PTS', href: 'https://pts.se/digital-inkludering/lagen-om-vissa-produkters-och-tjansters-tillganglighet/' },
};

export const packages = {
  id: 'paket',
  tag: 'Paket',
  title: 'Tre sätt att bli klar.',
  lede: 'Fasta priser, en kontaktperson och dokumentation ni kan visa upp. Alla priser exklusive moms.',
  recommended: 'Rekommenderas',
  order: 'Beställ',
};

export const process = {
  tag: 'Så går det till',
  title: 'Inget är bindande förrän du har sagt ja.',
  steps: [
    { title: 'Du beställer', body: 'Gärna med ditt testresultat, så ser vi direkt var ni står.' },
    { title: 'Vi hör av oss', body: 'Inom en arbetsdag, med omfattning, pris och startdatum skriftligt.' },
    { title: 'Du godkänner', body: 'Först då blir beställningen bindande.' },
    { title: 'Vi granskar och rättar', body: 'Du får åtgärdslista, tillgänglighetsredogörelse och faktura efter leverans.' },
  ],
};

export const order = {
  id: 'bestall',
  tag: 'Beställ',
  title: 'Beställ granskning eller åtgärd.',
  body: 'Vi återkommer inom en arbetsdag med en skriftlig bekräftelse. Beställningen blir bindande först när du har godkänt den.',
  talkFirst: 'Hellre prata först? Mejla',
  email: 'hej@wimco.se',
  attached: 'Ert testresultat för {host} skickas med.',
  packageLegend: 'Paket',
  fields: {
    name: 'Namn',
    company: 'Företag',
    email: 'E-post',
    phone: 'Telefon (valfritt)',
    site: 'Butikens webbadress',
    platform: 'Plattform (valfritt)',
    size: 'Antal anställda (valfritt)',
    message: 'Något vi bör veta? (valfritt)',
    messagePlaceholder: 'Till exempel om ni har en app, en deadline eller en extern kassa.',
    honeypot: 'Lämna tomt',
  },
  choose: 'Välj',
  terms:
    'Jag förstår att Wimco bekräftar omfattning, pris och startdatum skriftligt, och att beställningen blir bindande först när jag har godkänt bekräftelsen.',
  privacy: { text: 'Vi använder uppgifterna bara för att hantera beställningen.', link: { label: 'Integritet', href: '/integritet/' } },
  submit: 'Skicka beställning',
  sending: 'Skickar…',
  successTitle: 'Tack, beställningen är skickad.',
  successMailed: 'Du har fått en bekräftelse till {email}. Vi hör av oss inom en arbetsdag med omfattning, pris och startdatum.',
  successPlain: 'Vi hör av oss till {email} inom en arbetsdag med omfattning, pris och startdatum.',
  successNote: 'Inget är bindande förrän du har godkänt bekräftelsen.',
  failure: 'Det gick inte att skicka just nu. Mejla {email} så tar vi det därifrån.',
  mailLink: 'Skriv mejlet i stället',
  mailSubject: 'Beställning: tillgänglighet',
  errors: {
    name: 'Skriv ditt namn så vi vet vem vi svarar.',
    company: 'Skriv företagets namn.',
    email: 'Ange en giltig e-postadress, t.ex. namn@foretag.se.',
    site: 'Ange butikens webbadress, t.ex. dinbutik.se.',
    terms: 'Bekräfta att du har läst hur beställningen går till.',
    package: 'Välj ett paket.',
  } as Record<string, string>,
};

export const faq: FaqContent = {
  title: 'Vanliga frågor.',
  items: [
    {
      question: 'Gäller lagen för oss?',
      answer:
        'Lagen gäller e-handel som riktar sig till konsumenter. Mikroföretag som säljer tjänster, alltså färre än 10 anställda och högst 2 miljoner euro i årsomsättning eller balansomslutning, är undantagna. Säljer ni enbart till företag, eller är ni osäkra, går vi igenom det på första samtalet. Det här är ingen juridisk rådgivning.',
    },
    {
      question: 'Räcker det med en tillgänglighetswidget?',
      answer:
        'Nej. Verktyg som lägger en knapp eller verktygsrad ovanpå sajten ändrar inte koden under. Knappar utan namn, bilder utan alt-text och fält utan etiketter finns kvar för den som använder skärmläsare eller tangentbord. Vi rättar felen där de uppstår, i ert tema och era komponenter.',
    },
    {
      question: 'Kan ni garantera att vi klarar en granskning från PTS?',
      answer:
        'Ingen kan lova det, och den som gör det ska man vara skeptisk mot. Vi granskar och åtgärdar mot WCAG 2.1 AA och EN 301 549, den standard lagen hänvisar till, och dokumenterar allt. Det är det bästa underlaget ni kan ha om PTS hör av sig.',
    },
    {
      question: 'Hur exakt är gratistestet?',
      answer:
        'Testet använder Google Lighthouse, som bygger på axe-core, och mäter samma tre sidtyper som PTS börjar med. Automatiska tester hittar bara en del av felen. Tangentbord, fokusordning, skärmläsare och kassan måste testas av en människa, och det ingår i granskningen.',
    },
    {
      question: 'Vilka plattformar jobbar ni med?',
      answer:
        'Shopify, WooCommerce och de flesta svenska plattformar där vi kan ändra tema eller mallar. Ligger delar av butiken hos en leverantör ni inte styr över, till exempel kassan, dokumenterar vi felen så att ni kan ställa krav på leverantören.',
    },
    {
      question: 'Vad kostar det och hur betalar vi?',
      answer:
        'Priserna på sidan är exklusive moms. Granskningen har fast pris. Åtgärden får ett fast pris efter granskningen, när vi vet hur mycket som behöver göras. Ni får faktura efter leverans, och bevakningen faktureras månadsvis.',
    },
  ],
};
