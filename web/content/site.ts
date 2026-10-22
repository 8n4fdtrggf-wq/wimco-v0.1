import type {
  AutomationContent,
  BuildContent,
  ConsentContent,
  ContactContent,
  FaqContent,
  FooterContent,
  HeroContent,
  MetaContent,
  NavContent,
  ProcessContent,
  RepairContent,
  Station,
  StationsContent,
} from './types';

/** All copy for wimco.se. Edit here; components only render it. */

export const meta: MetaContent = {
  siteUrl: 'https://wimco.se',
  siteName: 'Wimco',
  locale: 'sv_SE',
  title: 'Wimco – gratis analys av din webbplats | Hemsidor, webbutveckling och automation',
  description:
    'Testa din webbplats gratis med Wimco Score och se vad som håller den tillbaka. Wimco designar hemsidor, bygger webbverktyg och automatiserar tidskrävande arbete.',
  ogTitle: 'Wimco Score: se vad som håller din sajt tillbaka',
  ogDescription: 'Gratis analys på en minut. Sen bygger vi det som löser det: hemsidor, webbverktyg och automation.',
  ogImage: '/assets/og-default.png',
  themeColor: '#F4F6F4',
};

export const nav: NavContent = {
  skip: 'Hoppa till innehållet',
  homeLabel: 'Wimco, till toppen',
  label: 'Huvudmeny',
  links: [
    { id: 'stationer', label: 'Så mäts det', href: '#stationer' },
    { id: 'atgarda', label: 'Åtgärder', href: '#atgarda' },
    { id: 'automation', label: 'Automation', href: '#automation' },
    { id: 'tjanster', label: 'Tjänster', href: '#tjanster' },
    { label: 'Guider', href: '/guider/' },
    { id: 'faq', label: 'Frågor', href: '#faq' },
  ],
  cta: { label: 'Starta ett projekt', href: '#projekt' },
  menu: { open: 'Meny', close: 'Stäng' },
  dock: {
    label: 'Wimco Score just nu: {score} av 100, för exempelföretaget. Gå till analysen.',
    example: 'Exempel',
    handover: 'Din sajt?',
    handoverLabel: 'Analysera din egen sajt',
  },
};

/**
 * The six Wimco Score categories. Name, weight and source are the real ones (see /wimco-score/).
 * before/after, finding and fix describe a made-up company ("Ekdahls Bygg") and are labelled
 * as an example wherever they are shown.
 */
export const stations: Station[] = [
  {
    name: 'Prestanda',
    weight: 20,
    source: 'Uppmätt',
    measures: 'Hur snabbt sidan laddar och blir användbar på mobil.',
    before: 38,
    after: 94,
    finding: 'Startbilden väger 4,2 MB och laddas före allt annat.',
    fix: 'Komprimerad till 180 kB och laddas först när den syns.',
    service: 'optimering',
  },
  {
    name: 'Mobil',
    weight: 15,
    source: 'Regelkontroll',
    measures: 'Skärmanpassning, zoom och klickytor som går att träffa med tummen.',
    before: 52,
    after: 96,
    finding: 'Menyknappar på 28 px. Svåra att träffa med tummen.',
    fix: 'Klickytor på 44 px och en meny som får plats.',
    service: 'hemsidor',
  },
  {
    name: 'Tillgänglighet',
    weight: 15,
    source: 'Uppmätt',
    measures: 'Kontrast, alt-texter och struktur som fungerar med skärmläsare.',
    before: 61,
    after: 98,
    finding: 'Grå text på grå botten. Kontrast 2,1:1.',
    fix: 'Kontrast 7:1. Läsbar även i solljus.',
    service: 'optimering',
  },
  {
    name: 'SEO och teknik',
    weight: 20,
    source: 'Uppmätt och regelkontroll',
    measures: 'Titel, metadata, rubriker och länkar som sökmotorer kan läsa.',
    before: 55,
    after: 92,
    finding: 'Sidtiteln är bara ”Hem”. Ingen huvudrubrik.',
    fix: 'En titel som säger vad och var, och en riktig H1.',
    service: 'optimering',
  },
  {
    name: 'Visuell tydlighet',
    weight: 15,
    source: 'Bedömning',
    measures: 'Om besökaren förstår erbjudandet inom några sekunder.',
    before: 40,
    after: 88,
    finding: '”Välkommen till vår hemsida!” säger ingenting.',
    fix: 'Erbjudandet på första raden: badrum klara på tre veckor.',
    service: 'hemsidor',
  },
  {
    name: 'Konvertering',
    weight: 15,
    source: 'Bedömning',
    measures: 'Hur lätt det är att ta nästa steg och höra av sig.',
    before: 30,
    after: 90,
    finding: 'Kontaktuppgifterna finns bara i sidfoten.',
    fix: 'Offertknapp överst. Kunden får svar automatiskt direkt.',
    service: 'automation',
  },
];

export const serviceNames: Record<Station['service'], string> = {
  hemsidor: 'Hemsida',
  webbutveckling: 'Webbutveckling',
  automation: 'Automation',
  optimering: 'Optimering',
};

export const hero: HeroContent = {
  title: 'Se vad som håller din sajt tillbaka.',
  lede: 'Gratis analys på en minut. Sen bygger vi hemsidan, verktyget eller automationen som löser det.',
  proof: ['Uppmätt med Google Lighthouse', 'Ingen registrering', 'Svar från Willem, inte en säljare'],
  example: {
    host: 'ekdahls-bygg.exempel',
    tag: 'Exempel · påhittat företag',
    ringLabel: 'Wimco Score för exempelföretaget Ekdahls Bygg: {score} av 100.',
    caption: 'av 100',
    log: [
      'Lighthouse, mobil',
      'Skärm, zoom och klickytor',
      'Kontrast och struktur',
      'Titel, rubriker och länkar',
      'Budskap ovanför vecket',
      'Kontaktvägar',
    ],
    running: 'Analyserar {host}',
    done: 'Klar · 6 av 6 kontroller',
    chips: ['LCP 4,8 s', 'Kontrast 2,1:1', 'Titel: ”Hem”'],
    siteHeadline: 'Välkommen till vår hemsida!',
  },
};

export const stationsSection: StationsContent = {
  title: 'Sex saker avgör om besökaren stannar.',
  lede: 'Wimco Score väger ihop dem till ett betyg mellan 0 och 100. Varje siffra visar var den kommer ifrån.',
  sourcesNote: 'Uppmätt betyder Google Lighthouse. Regelkontroll betyder att sidans kod granskas mot fasta regler. Bedömning görs enligt fasta kriterier.',
  link: { label: 'Så räknas poängen', href: '/wimco-score/' },
};

export const repair: RepairContent = {
  pause: 'Ett betyg är bara början. Så här ser det ut när vi åtgärdar det.',
  title: 'Sex fynd. Sex åtgärder.',
  lede: 'Scrolla och se exempelsajten lagas, ett fynd i taget.',
  note: 'Påhittat företag. Fynd och poäng är illustrativa, men räknade med Wimco Scores riktiga vikter.',
  ringLabel: 'Exempelföretagets Wimco Score under åtgärderna.',
  serviceLabel: 'Åtgärdas med',
  findingLabel: 'Fynd',
  fixLabel: 'Åtgärd',
  site: {
    host: 'ekdahls-bygg.exempel',
    tabBefore: 'Hem',
    tabAfter: 'Badrum i Stockholm · Ekdahls Bygg',
    company: 'Ekdahls Bygg AB',
    navBefore: ['Hem', 'Om oss', 'Tjänster', 'Galleri', 'Länkar', 'Kontakt'],
    navAfter: ['Badrum', 'Kök', 'Om oss'],
    headlineBefore: 'Välkommen till vår hemsida!',
    headlineAfter: 'Badrum klara på 3 veckor.',
    bodyBefore: 'Vi utför alla typer av byggtjänster i Stockholmsområdet sedan 1998. Kontakta oss gärna för mer information.',
    bodyAfter: 'Fast pris och ROT-avdraget direkt på fakturan.',
    imageWeight: '4,2 MB',
    cookie: 'Denna webbplats använder cookies för att förbättra din upplevelse.',
    cookieButton: 'OK',
    cta: 'Få offert inom 24 h',
    toast: 'Ny förfrågan · svar skickat',
  },
};

export const automation: AutomationContent = {
  title: 'Och sen sköter sig resten.',
  lede: 'En förfrågan som kommer in en söndagskväll ska inte vänta till måndag. Tryck på knappen och se vad som händer.',
  run: 'Skicka en testförfrågan',
  rerun: 'Skicka en till',
  demoNote: 'Demo i din webbläsare. Inget skickas någonstans.',
  form: { name: 'Sara Lind', message: 'Hej! Vi vill renovera badrummet i höst. Vad kostar det ungefär?', service: 'Badrum' },
  steps: [
    { title: 'Förfrågan kommer in', body: 'Via offertformuläret på sajten.' },
    { title: 'Sorteras och sparas', body: 'Rätt tjänst, direkt i kundregistret.' },
    { title: 'Kunden får svar', body: 'Ett personligt mejl med en länk för att boka hembesök.' },
    { title: 'Du får en sammanfattning', body: 'Det viktigaste först, i mobilen.' },
  ],
  surface: {
    formTitle: 'Offertförfrågan',
    crmHead: ['Kund', 'Tjänst', 'Status'],
    crmStatus: 'Ny',
    replySubject: 'Tack Sara, vi har fått din förfrågan',
    replyBody: 'Välj en tid för hembesök så tittar vi på badrummet tillsammans.',
    summary: '1 ny förfrågan · badrum · svar skickat',
  },
  more: {
    title: 'Annat vi ofta automatiserar',
    items: ['Bokningsbekräftelser', 'Uppföljningsmejl', 'Rapporter som skriver sig själva', 'Kopplingar mellan system', 'AI-assistent för vanliga frågor'],
  },
};

export const build: BuildContent = {
  title: 'Det här bygger vi.',
  lede: 'Samma studio som hittar felen bygger lösningen. Du pratar direkt med den som gör jobbet.',
  head: { name: 'Tjänst', what: 'Vad det är', time: 'Tid' },
  items: [
    {
      service: 'hemsidor',
      name: 'Hemsidor',
      what: 'Strategi, struktur, design och text som får rätt besökare att höra av sig.',
      examples: ['Ny sajt', 'Omdesign', 'Landningssidor'],
      time: 'Oftast 3–6 veckor',
    },
    {
      service: 'webbutveckling',
      name: 'Webbutveckling',
      what: 'Det ett färdigt tema inte klarar, kopplat till systemen du redan har.',
      examples: ['Kundportaler', 'Interna verktyg', 'Integrationer och API:er'],
      time: 'Efter omfattning',
    },
    {
      service: 'automation',
      name: 'AI och automation',
      what: 'System som pratar med varandra, så att jobbet blir gjort medan du gör ditt.',
      examples: ['Leadhantering', 'Rapporter', 'AI-assistenter'],
      time: 'Ofta några dagar',
    },
    {
      service: 'optimering',
      name: 'Optimering',
      what: 'Vässa det du redan har. Laddtid, tydlighet och kontaktvägar avgör om besökaren stannar.',
      examples: ['Core Web Vitals', 'Teknisk SEO', 'Tillgänglighet'],
      time: 'Ofta en vecka',
    },
  ],
  cta: { label: 'Starta ett projekt', href: '#projekt' },
};

export const process: ProcessContent = {
  title: 'Så jobbar vi.',
  steps: [
    { title: 'Kostnadsfritt samtal', body: '20 minuter om dina mål och vad som skaver. Du får ett ärligt svar, även om det är att behålla det du har.' },
    { title: 'Förslag', body: 'En konkret plan utifrån din budget, som börjar med det som ger mest effekt.' },
    { title: 'Bygge', body: 'Du ser och godkänner längs vägen.' },
    { title: 'Uppföljning', body: 'Vi mäter resultatet och fortsätter förbättra. Vi försvinner inte efter lansering.' },
  ],
};

export const faq: FaqContent = {
  title: 'Vanliga frågor.',
  items: [
    {
      question: 'Vad kostar analysen?',
      answer:
        'Ingenting. Wimco Score är gratis och kräver ingen registrering. Du kan välja att få rapporten via e-post, men hela rapporten visas utan att du lämnar några uppgifter.',
    },
    {
      question: 'Hur exakt är Wimco Score?',
      answer:
        'Prestanda, tillgänglighet och delar av SEO mäts med Google Lighthouse. Övriga delar är regelkontroller av sidans kod och bedömningar enligt fasta regler. Rapporten visar vilken källa varje siffra kommer från. Lighthouse testar en emulerad mobil, så resultaten kan variera något mellan körningar.',
    },
    {
      question: 'Vad händer med min data?',
      answer:
        'Vi sparar adressen du analyserar och resultatet, så att rapportlänken fungerar. Rapporter är privata och visas inte i sökmotorer om du inte själv väljer det. E-post sparas bara om du anger den.',
      link: { label: 'Läs mer om integritet', href: '/integritet/' },
    },
    {
      question: 'Vad kostar ett projekt?',
      answer:
        'Det beror helt på dina behov. Vi utgår alltid från din budget och prioriterar det som ger mest effekt först. Boka ett samtal så får du en kostnadsfri uppskattning.',
    },
    {
      question: 'Hur lång tid tar ett projekt?',
      answer:
        'En enklare uppdatering kan vara klar på en vecka. En ny hemsida tar oftast 3–6 veckor, beroende på omfattning och hur snabbt vi får material från dig.',
    },
    {
      question: 'Måste jag bygga en helt ny hemsida?',
      answer:
        'Nej, ofta räcker det med att vässa det du redan har. Vi utgår från din befintliga plattform om den fungerar tekniskt och bara behöver ett lyft.',
    },
    {
      question: 'Kan ni hjälpa till med automatisering även om jag har ett litet företag?',
      answer:
        'Absolut. Små företag har ofta allra mest att vinna på att automatisera tidskrävande moment, som bokningsbekräftelser, uppföljningsmejl och rapporter.',
    },
  ],
};

export const contact: ContactContent = {
  title: 'Din tur.',
  lede: 'Resten av sidan handlade om ett påhittat byggföretag. Nu gäller det din sajt.',
  analyse: {
    id: 'din-sajt',
    eyebrow: 'Jag har en webbplats',
    title: 'Se vad som håller den tillbaka.',
    body: 'Analysen tar ungefär en minut. Gratis, och ingen registrering krävs.',
    inputLabel: 'Webbadress',
    placeholder: 'dittforetag.se',
    submit: 'Analysera',
    cancel: 'Avbryt',
    error: 'Skriv en webbadress, till exempel dittforetag.se.',
    preparing: 'Förbereder analys…',
    running: 'Analyserar {host}',
    stepRunning: 'Pågår…',
    stepCached: 'Klar (sparad analys)',
    cancelled: 'Analysen avbröts.',
    networkError: 'Vi fick ingen kontakt med analysservern. Kontrollera din uppkoppling och försök igen.',
    streamError: 'Anslutningen bröts under analysen. Försök igen.',
    unexpectedEnd: 'Analysen avslutades oväntat. Försök igen.',
    resultLabel: 'Wimco Score',
    previous: 'Förra analysen: {prev}. Nu: {now} ({diff}).',
    compareHint: 'Resultatet jämförs med din förra analys.',
    openReport: 'Visa hela rapporten',
    again: 'Analysera en annan sajt',
    gets: [
      'Ett betyg mellan 0 och 100',
      'Det som ger mest effekt att åtgärda först',
      'Konkreta åtgärder med uppskattad insats',
      'En rapport du kan dela med kollegor',
    ],
  },
  project: {
    id: 'projekt',
    eyebrow: 'Jag vill bygga något nytt',
    title: 'Berätta vad du behöver.',
    body: 'Du får svar från Willem med förslag på nästa steg.',
    typeLegend: 'Vad gäller det?',
    types: [
      { label: 'Hemsida', service: 'hemsidor' },
      { label: 'Webblösning', service: 'webbutveckling' },
      { label: 'Automation', service: 'automation' },
      { label: 'Förbättra befintlig', service: 'optimering' },
    ],
    fields: {
      name: 'Namn',
      email: 'E-post',
      company: 'Företag (valfritt)',
      budget: 'Ungefärlig budget (valfritt)',
      message: 'Vad vill du åstadkomma?',
      honeypot: 'Lämna tomt',
    },
    budgets: ['Vet inte än', 'Under 25 000 kr', '25 000–75 000 kr', '75 000–150 000 kr', 'Över 150 000 kr'],
    privacy: { text: 'Vi använder uppgifterna bara för att svara dig.', link: { label: 'Integritet', href: '/integritet/' } },
    submit: 'Skicka förfrågan',
    sending: 'Skickar…',
    successTitle: 'Tack, förfrågan är skickad.',
    successBody: 'Willem återkommer till {email} så snart som möjligt. Vill du prata direkt? Ring 072-218 05 09.',
    failure: 'Det gick inte att skicka just nu. Mejla {email} så svarar Willem därifrån.',
    mailLink: 'Skriv mejlet i stället',
    mailSubject: 'Projektförfrågan',
    errors: {
      name: 'Skriv ditt namn så vi vet vem vi svarar.',
      email: 'Ange en giltig e-postadress, t.ex. namn@foretag.se.',
      message: 'Beskriv kort vad du vill ha hjälp med (minst 10 tecken).',
    },
  },
  willem: {
    initial: 'W',
    title: 'Hej, jag är Willem.',
    body: 'Jag startade Wimco för att alltför många duktiga företagare kämpar med teknik som borde vara enkel. Första samtalet är gratis: 20 minuter, utan förpliktelser.',
    email: 'hej@wimco.se',
    phone: '072-218 05 09',
    phoneHref: '+46722180509',
    copy: 'Kopiera',
    copied: 'Kopierad',
    copyEmailLabel: 'Kopiera e-postadressen',
    copyPhoneLabel: 'Kopiera telefonnumret',
  },
};

export const footer: FooterContent = {
  tagline: 'Hemsidor, webbutveckling och automation för små och medelstora företag.',
  columns: [
    {
      title: 'Kontakt',
      links: [
        { label: 'hej@wimco.se', href: 'mailto:hej@wimco.se' },
        { label: '+46 72 218 05 09', href: 'tel:+46722180509' },
      ],
    },
    {
      title: 'Läs mer',
      links: [
        { label: 'Guider', href: '/guider/' },
        { label: 'Så fungerar Wimco Score', href: '/wimco-score/' },
        { label: 'Playground', href: '/playground/' },
      ],
    },
    {
      title: 'Integritet',
      links: [{ label: 'Integritetspolicy', href: '/integritet/' }],
    },
  ],
  consentLabel: 'Cookieinställningar',
  legal: '© 2026 Wimco',
};

export const consent: ConsentContent = {
  text: 'Vi vill använda Google Analytics för att se hur sajten används. Det sätter cookies och körs bara om du godkänner.',
  link: { label: 'Läs mer', href: '/integritet/' },
  deny: 'Nej tack',
  allow: 'Godkänn',
};
