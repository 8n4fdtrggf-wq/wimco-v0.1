import type {
  CompareContent,
  ConsentContent,
  ContactContent,
  FactsContent,
  FaqContent,
  FooterContent,
  HeroContent,
  LineId,
  LineInfo,
  ManifestoContent,
  MetaContent,
  NavContent,
  ProcessContent,
  ScoreContent,
  ServicesContent,
} from './types';

/** All copy for wimco.se. Edit here; components only render it. */

export const lines: Record<LineId, LineInfo> = {
  h: { letter: 'H', name: 'Hemsidor' },
  w: { letter: 'W', name: 'Webbutveckling' },
  a: { letter: 'A', name: 'AI och automation' },
  o: { letter: 'O', name: 'Optimering' },
};

export const meta: MetaContent = {
  siteUrl: 'https://wimco.se',
  siteName: 'Wimco',
  locale: 'sv_SE',
  title: 'Wimco – hemsidor, webbverktyg och automation | Gratis analys av din webbplats',
  description:
    'Wimco designar hemsidor, bygger digitala verktyg och automatiserar tidskrävande arbete. Testa din webbplats gratis med Wimco Score och se var potentialen finns.',
  ogTitle: 'Wimco – digitala upplevelser som presterar',
  ogDescription: 'Hemsidor, webbutveckling och automation. Testa din webbplats gratis med Wimco Score.',
  ogImage: '/assets/og-default.png',
  themeLight: '#F3F5F4',
  themeDark: '#0C1110',
};

export const nav: NavContent = {
  skip: 'Hoppa till innehållet',
  homeLabel: 'Wimco, till toppen',
  label: 'Huvudmeny',
  links: [
    { id: 'tjanster', label: 'Tjänster', href: '#tjanster', line: 'h' },
    { id: 'score', label: 'Wimco Score', href: '#score', line: 'w' },
    { id: 'arbetssatt', label: 'Arbetssätt', href: '#arbetssatt', line: 'a' },
    { label: 'Guider', href: '/guider/', line: 'o' },
    { id: 'faq', label: 'Frågor', href: '#faq', line: 'h' },
  ],
  cta: { label: 'Starta ett projekt', href: '#starta' },
  menu: { open: 'Meny', close: 'Stäng' },
};

export const hero: HeroContent = {
  label: 'Introduktion',
  eyebrow: 'Design- och teknikpartner för små och medelstora företag',
  headline: [
    { text: 'Hemsidor', line: 'h' },
    { text: ', ' },
    { text: 'webbverktyg', line: 'w' },
    { text: ' och ' },
    { text: 'automation', line: 'a' },
    { text: ' som ' },
    { text: 'presterar', line: 'o' },
    { text: '.' },
  ],
  lede: 'Wimco designar hemsidor, utvecklar digitala verktyg och automatiserar tidskrävande arbete. Du pratar direkt med den som bygger.',
  primary: { label: 'Analysera min webbplats', href: '#analys' },
  secondary: { label: 'Starta ett projekt', href: '#starta' },
  map: {
    ariaLabel:
      'Linjekarta: Hemsidor, Webbutveckling, Automation och Optimering möts i stationen Fler kunder',
    stops: { h: 'Strategi', w: 'Kundportal', a: 'Leads', o: 'Laddtid' },
    destination: 'Fler kunder',
    destinationSub: 'mindre manuellt arbete',
  },
  hint: { fine: 'Peka på en linje', coarse: 'Tryck på en linje' },
  cue: 'Scrolla',
};

export const manifesto: ManifestoContent = {
  label: 'Vad Wimco gör',
  segments: [
    { text: 'Vi bygger ' },
    { text: 'hemsidor', line: 'h' },
    { text: ' som får besökare att höra av sig, ' },
    { text: 'verktyg', line: 'w' },
    { text: ' som ett färdigt tema inte klarar och ' },
    { text: 'automationer', line: 'a' },
    { text: ' som gör jobbet medan du gör ditt. Allt mätt, allt ' },
    { text: 'snabbt', line: 'o' },
    { text: '.' },
  ],
  byline: { initial: 'W', text: 'Willem, grundare av Wimco' },
};

export const facts: FactsContent = {
  label: 'Så är det att jobba med Wimco',
  items: [
    { title: 'Du pratar direkt med Willem', body: 'som designar och bygger det du beställer.' },
    { title: 'Första samtalet är gratis', body: '20 minuter, utan förpliktelser.' },
    { title: 'Ny hemsida på 3–6 veckor', body: 'En enklare uppdatering kan vara klar på en vecka.' },
    { title: 'Mätt med Google Lighthouse', body: 'Googles eget verktyg för att mäta webbsidor.' },
  ],
};

export const services: ServicesContent = {
  label: 'Tjänster',
  eyebrow: 'Fyra linjer',
  title: 'Fyra linjer. Samma riktning.',
  stepperLabel: 'Välj linje',
  urlPrefix: 'wimco.se / linje-',
  lineLabel: 'Linje',
  steps: [
    {
      line: 'h',
      title: 'Hemsidor som gör besökare till kunder.',
      body: 'En hemsida ska få rätt personer att förstå vad du erbjuder och våga höra av sig. Vi börjar i strategin och slutar inte vid lansering.',
      stops: ['Strategi och struktur', 'Unik visuell design', 'Konvertering', 'SEO-grund'],
      visual: 'site',
      caption: 'Struktur → design',
    },
    {
      line: 'w',
      title: 'Webbverktyg som ett färdigt tema inte klarar.',
      body: 'När standardlösningen tar slut bygger vi det du faktiskt behöver, kopplat till systemen du redan använder.',
      stops: ['Kundportaler', 'Interna verktyg', 'Integrationer och API:er', 'Webbapplikationer'],
      visual: 'portal',
      caption: 'Kundportal · exempeldata',
    },
    {
      line: 'a',
      title: 'Automationer som gör jobbet medan du gör ditt.',
      body: 'En förfrågan som kommer in en söndagskväll ska inte vänta till måndag. Systemen pratar med varandra och du får sammanfattningen.',
      stops: ['Leadhantering', 'Kopplingar mellan system', 'Rapporter', 'AI-assistenter'],
      visual: 'flow',
      caption: 'Exempel på leadflöde',
    },
    {
      line: 'o',
      title: 'Vässa det du redan har.',
      body: 'Ofta behövs ingen ny sajt. Laddtid, tydlighet och kontaktvägar avgör om besökaren stannar.',
      stops: ['Core Web Vitals', 'Tydlighet och budskap', 'Teknisk SEO', 'Tillgänglighet'],
      visual: 'rings',
      caption: 'Lighthouse, mobil · exempel',
    },
  ],
  portal: {
    head: ['Kund', 'Ärende', 'Status'],
    rows: [
      { customer: 'Ekdahls Bygg', matter: 'Offert, badrum', status: 'Ny', resolvesTo: 'Klar', delayMs: 900 },
      { customer: 'Norrvik Café', matter: 'Bokning, lokal', status: 'Pågår' },
      { customer: 'Lindqvist Revision', matter: 'Uppladdade underlag', status: 'Ny', resolvesTo: 'Klar', delayMs: 1300 },
      { customer: 'Sjöberg Fastighet', matter: 'Felanmälan', status: 'Pågår' },
    ],
  },
  flow: [
    { time: '08:14', title: 'En förfrågan kommer in', body: 'Via formuläret på din sajt' },
    { time: '08:14', title: 'Den sorteras och sparas', body: 'Rätt tjänst, direkt i kundregistret' },
    { time: '08:14', title: 'Kunden får svar direkt', body: 'Med en länk för att boka tid' },
    { time: '08:30', title: 'Du får en sammanfattning', body: 'Det viktigaste först' },
  ],
  rings: {
    items: [
      { label: 'Prestanda', from: 54, to: 96 },
      { label: 'Tillgänglighet', from: 78, to: 98 },
      { label: 'Bästa praxis', from: 74, to: 100 },
      { label: 'SEO', from: 82, to: 100 },
    ],
    bands: [
      { label: '0–49', tone: 'poor' },
      { label: '50–89', tone: 'avg' },
      { label: '90–100', tone: 'good' },
    ],
  },
};

export const compare: CompareContent = {
  label: 'Före och efter',
  line: 'o',
  eyebrow: 'Optimering',
  title: 'Samma sajt. Dra och se skillnaden.',
  lede: 'En optimering ändrar sällan vad företaget erbjuder. Den ändrar hur snabbt och tydligt besökaren förstår det.',
  slider: {
    label: 'Jämför före och efter',
    valueText: '{before} % före, {after} % efter',
    before: 'Före',
    after: 'Efter',
    snaps: [0.06, 0.5, 0.94],
  },
  before: {
    company: 'Ekdahls Bygg AB',
    welcome: 'Välkommen till vår hemsida!',
    body: 'Vi utför alla typer av byggtjänster i Stockholmsområdet sedan 1998. Kontakta oss gärna för mer information om våra tjänster.',
    cookie: 'Denna webbplats använder cookies för att förbättra din upplevelse.',
    cookieButton: 'OK',
    score: 41,
    scoreLabel: 'Prestanda',
  },
  after: {
    company: 'Ekdahls',
    nav: ['Badrum', 'Kök', 'Om oss'],
    navCta: 'Boka besök',
    headline: 'Badrum klara på 3 veckor.',
    sub: 'Fast pris och ROT-avdrag direkt på fakturan.',
    cta: 'Få offert inom 24 h →',
    score: 96,
    scoreLabel: 'Prestanda',
  },
  metricsHead: ['Mätpunkt', 'Före', 'Efter'],
  metrics: [
    { label: 'Prestanda (Lighthouse, mobil)', before: '41', after: '96' },
    { label: 'Största innehållet laddat (LCP)', before: '4,8 s', after: '1,1 s' },
    { label: 'Layoutskift (CLS)', before: '0,31', after: '0,01' },
    { label: 'Kontaktväg synlig utan scroll', before: 'Nej', after: 'Ja' },
  ],
  note: 'Exempel på en optimering för ett påhittat företag. Värdena är illustrativa.',
};

export const score: ScoreContent = {
  eyebrow: 'Wimco Score · 0–100',
  title: 'Sex stationer. En ärlig poäng.',
  lede: 'Wimco Score väger ihop sex delar av din digitala närvaro till ett betyg. Varje siffra visar var den kommer ifrån: uppmätt, regelkontroll eller bedömning.',
  stackLabel: 'Viktning av Wimco Score',
  weights: [
    { name: 'Prestanda', pct: 20, line: 'h', source: 'Uppmätt · Lighthouse', body: 'Hur snabbt sidan laddar och blir användbar på mobil: LCP, CLS och TBT.' },
    { name: 'Mobil', pct: 15, line: 'w', source: 'Regelkontroll', body: 'Skärmanpassning, zoom och klickytor som går att träffa med tummen.' },
    { name: 'Tillgänglighet', pct: 15, line: 'a', source: 'Uppmätt · Lighthouse', body: 'Kontrast, alt-texter och struktur som fungerar med skärmläsare.' },
    { name: 'SEO och teknik', pct: 20, line: 'o', source: 'Uppmätt + regelkontroll', body: 'Titel, metadata, rubriker och länkar som sökmotorer kan läsa.' },
    { name: 'Visuell tydlighet', pct: 15, line: 'h', muted: true, source: 'Bedömning', body: 'Om besökaren förstår erbjudandet inom några sekunder.' },
    { name: 'Konvertering', pct: 15, line: 'w', muted: true, source: 'Bedömning', body: 'Hur lätt det är att ta nästa steg och höra av sig.' },
  ],
  primary: { label: 'Analysera min webbplats', href: '#analys' },
  secondary: { label: 'Så räknas poängen', href: '/wimco-score/' },
};

export const process: ProcessContent = {
  eyebrow: 'Arbetssätt',
  title: 'Så jobbar vi.',
  steps: [
    { label: 'STEG 1', title: 'Kostnadsfritt samtal', body: '20 minuter om dina mål och vad som skaver i dag. Du får ett ärligt svar, även om det är att behålla det du har.' },
    { label: 'STEG 2', title: 'Förslag och prioritering', body: 'En konkret plan som utgår från din budget och börjar med det som ger mest effekt.' },
    { label: 'STEG 3', title: 'Genomförande', body: 'Vi bygger och sätter upp. Du ser och godkänner längs vägen.' },
    { label: 'STEG 4', title: 'Uppföljning', body: 'Vi mäter resultaten och fortsätter förbättra. Vi försvinner inte efter leverans.' },
  ],
};

export const faq: FaqContent = {
  eyebrow: 'Frågor',
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
  eyebrow: 'Nästa station',
  title: 'Var står du i dag?',
  analyse: {
    id: 'analys',
    line: 'o',
    eyebrow: 'Jag har redan en webbplats',
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
    line: 'h',
    eyebrow: 'Jag vill bygga något nytt',
    title: 'Berätta vad du behöver.',
    body: 'Du får svar från Willem med förslag på nästa steg.',
    typeLegend: 'Vad gäller det?',
    types: [
      { line: 'h', label: 'Hemsida', service: 'hemsidor' },
      { line: 'w', label: 'Webblösning', service: 'webbutveckling' },
      { line: 'a', label: 'Automation', service: 'automation' },
      { line: 'o', label: 'Förbättra befintlig', service: 'optimering' },
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
