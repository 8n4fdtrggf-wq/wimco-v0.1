import type { FaqContent } from './types';

/**
 * All copy for /e-handelskollen/. The five areas (law, date, authority) and the packages with prices
 * come from ../lib/kollen/catalog.js, the same file the API uses.
 */

export const meta = {
  title: 'E-handelskollen: fem lagkrav för nätbutiker i en gratis kontroll | Wimco',
  description:
    'Kontrollera gratis om er nätbutik klarar tillgänglighetslagen, ångerknappen, reglerna för rabattpriser, de nya reglerna för miljöpåståenden och kraven på samtycke för spårning.',
  ogTitle: 'E-handelskollen: fem lagkrav, en kontroll',
  ogDescription: 'Rött och grönt för tillgänglighet, ångerknapp, rabattpriser, miljöpåståenden och spårning. Åtgärd till fast pris.',
};

export const hero = {
  tag: 'E-handelskollen',
  title: 'Fem lagkrav. En kontroll.',
  lede: 'Tillgänglighet, ångerknapp, rabattpriser, miljöpåståenden och spårning. E-handelskollen visar på ett par minuter vad som är rött och grönt i er butik, och vad det kostar att rätta.',
  proof: ['Gratis och utan registrering', 'Fast pris på varje åtgärd', 'Bevakning varje månad'],
};

export const check = {
  id: 'kolla',
  tag: 'Gratis kontroll · 1–2 minuter',
  title: 'Kontrollera er butik',
  inputLabel: 'Butikens webbadress',
  placeholder: 'dinbutik.se',
  submit: 'Kontrollera',
  idleNote: 'Vi testar startsidan, en produktsida och sökresultatet.',
  preparing: 'Startar kontrollen…',
  measuringNote: 'Tillgängligheten mäts med Lighthouse. Det tar oftast en minut.',
  waiting: 'Väntar',
  running: 'Kontrolleras',
  invalid: 'Ange butikens webbadress, till exempel dinbutik.se.',
  networkError: 'Anslutningen bröts. Kontrollera nätet och försök igen.',
  unexpectedEnd: 'Kontrollen avbröts innan den var klar. Försök igen.',
  loadingSaved: 'Hämtar resultatet…',
};

export const result = {
  tag: 'Resultat',
  status: { fail: 'Rött', warn: 'Kontrollera', pass: 'Grönt', unknown: 'Okänt' } as Record<string, string>,
  method: { measured: 'Uppmätt', rules: 'Kontrollerat i koden' } as Record<string, string>,
  page: { start: 'Startsida', product: 'Produktsida', search: 'Sökresultat' } as Record<string, string>,
  devTitle: 'Utvecklingsdata',
  devBody: 'Det här resultatet bygger på simulerade mätningar och beskriver inte den riktiga sajten.',
  counts: { fail: '{n} röda', warn: '{n} att kontrollera', pass: '{n} gröna' },
  law: 'Lag',
  since: 'Gäller från',
  authority: 'Tillsyn',
  add: 'Lägg till åtgärd',
  added: 'Tillagd',
  a11yFull: 'Se hela tillgänglighetsresultatet',
  ctaTitle: 'Vill ni att vi rättar det röda?',
  ctaTitleClean: 'Vill ni hålla det grönt?',
  ctaBody: 'Varje röd punkt har ett åtgärdspaket med fast pris. Bevakningen kontrollerar alla fem områdena varje månad och säger till när något blir rött.',
  ctaOrder: 'Gå till beställningen',
  ctaWatch: 'Beställ bevakning',
  selected: '{n} valda · {total}',
  saved: 'Resultatet sparas privat i ett år.',
  savedLink: 'Länk till resultatet',
  again: 'Kontrollera en annan butik',
};

export const laws = {
  id: 'kraven',
  tag: 'Kraven',
  title: 'Det här kontrollerar vi.',
  lede: 'Fem regler som träffar svenska nätbutiker, de flesta nya. Alla granskas av en myndighet.',
  head: { area: 'Område', law: 'Regel', since: 'Gäller från', authority: 'Tillsyn', checks: 'Vi kontrollerar' },
  note: 'En sammanfattning, inte juridisk rådgivning. Reglerna har undantag som kan gälla er butik.',
};

export const packages = {
  id: 'paket',
  tag: 'Åtgärder',
  title: 'Varje röd punkt har ett fast pris.',
  lede: 'Välj det ni behöver. Vi bekräftar omfattningen skriftligt innan något är bindande. Alla priser exklusive moms.',
  watchFlag: 'Håller det grönt',
  add: 'Lägg till',
  added: 'Tillagd',
};

export const process = {
  tag: 'Så går det till',
  title: 'Från rött till grönt.',
  steps: [
    { title: 'Ni kör kollen', body: 'Gratis, på ett par minuter. Resultatet sparas och skickas med beställningen.' },
    { title: 'Vi hör av oss', body: 'Inom en arbetsdag, med omfattning, pris och startdatum skriftligt.' },
    { title: 'Ni godkänner', body: 'Först då blir beställningen bindande.' },
    { title: 'Vi rättar och bevakar', body: 'Varje åtgärd dokumenteras. Med bevakning kör vi kollen varje månad.' },
  ],
};

export const order = {
  id: 'bestall',
  tag: 'Beställ',
  title: 'Beställ åtgärder eller bevakning.',
  body: 'Vi återkommer inom en arbetsdag med en skriftlig bekräftelse. Beställningen blir bindande först när du har godkänt den.',
  talkFirst: 'Hellre prata först? Mejla',
  email: 'hej@wimco.se',
  attached: 'Ert resultat för {host} skickas med.',
  packagesLegend: 'Vad vill ni beställa?',
  total: 'Totalt',
  totalNote: 'exkl. moms',
  none: 'Välj minst ett paket.',
  fields: {
    name: 'Namn',
    company: 'Företag',
    email: 'E-post',
    phone: 'Telefon (valfritt)',
    site: 'Butikens webbadress',
    message: 'Något vi bör veta? (valfritt)',
    messagePlaceholder: 'Till exempel vilken plattform ni har, en deadline eller en extern kassa.',
    honeypot: 'Lämna tomt',
  },
  terms:
    'Jag förstår att E-handelskollen flaggar risker men inte intygar att butiken följer lagen, och att beställningen blir bindande först när jag har godkänt Wimcos skriftliga bekräftelse.',
  privacy: { text: 'Vi använder uppgifterna bara för att hantera beställningen.', link: { label: 'Integritet', href: '/integritet/' } },
  submit: 'Skicka beställning',
  sending: 'Skickar…',
  successTitle: 'Tack, beställningen är skickad.',
  successMailed: 'Du har fått en bekräftelse till {email}. Vi hör av oss inom en arbetsdag med omfattning, pris och startdatum.',
  successPlain: 'Vi hör av oss till {email} inom en arbetsdag med omfattning, pris och startdatum.',
  successNote: 'Inget är bindande förrän du har godkänt bekräftelsen.',
  failure: 'Det gick inte att skicka just nu. Mejla {email} så tar vi det därifrån.',
  mailLink: 'Skriv mejlet i stället',
  mailSubject: 'Beställning: E-handelskollen',
  errors: {
    packages: 'Välj minst ett paket.',
    name: 'Skriv ditt namn så vi vet vem vi svarar.',
    company: 'Skriv företagets namn.',
    email: 'Ange en giltig e-postadress, t.ex. namn@foretag.se.',
    site: 'Ange butikens webbadress, t.ex. dinbutik.se.',
    terms: 'Bekräfta att du har läst hur beställningen går till.',
  } as Record<string, string>,
};

export const faq: FaqContent = {
  title: 'Vanliga frågor.',
  items: [
    {
      question: 'Är det här juridisk rådgivning?',
      answer:
        'Nej. E-handelskollen flaggar risker utifrån det som syns i butikens kod. Den kan inte intyga att butiken följer lagen. Vi rättar det tekniska och skriver om texter, men frågor om hur lagen ska tolkas i ert fall hör hemma hos en jurist.',
    },
    {
      question: 'Hur säker är kontrollen?',
      answer:
        'Tillgängligheten mäts med Google Lighthouse. Övriga områden kontrolleras i sidornas kod, och spårningen även i Googles testmiljö där ingen svarat på samtyckesfrågan. Vi testar startsidan, en produktsida och sökresultatet. Kassa, Mina sidor och kampanjsidor kräver en manuell genomgång, och den ingår i åtgärdspaketen.',
    },
    {
      question: 'Gäller alla fem kraven för oss?',
      answer:
        'De flesta gäller alla som säljer till konsumenter på nätet. Tillgänglighetslagen undantar mikroföretag som säljer tjänster, och vissa regler har fler undantag. Säljer ni enbart till företag gäller färre av dem. Vi går igenom det på första samtalet.',
    },
    {
      question: 'Vad händer om myndigheterna hör av sig?',
      answer:
        'Konsumentverket, PTS och IMY kan förelägga om ändringar, ofta med vite, och vid allvarliga brott mot marknadsföringsreglerna kan det bli en marknadsstörningsavgift. Dokumentationen från åtgärderna är det bästa underlaget ni kan ha.',
    },
    {
      question: 'Hur fungerar bevakningen?',
      answer:
        'Vi kör E-handelskollen på er butik varje månad. Ni och vi får en sammanfattning, och om något område har blivit rött hör vi av oss. Upp till en timmes rättningar per månad ingår. Bevakningen har en månads uppsägning.',
    },
    {
      question: 'Vad kostar det och hur betalar vi?',
      answer:
        'Kontrollen är gratis. Åtgärderna har fasta priser exklusive moms, och omfattningen bekräftas skriftligt innan något är bindande. Ni får faktura efter leverans. Bevakningen faktureras månadsvis.',
    },
  ],
};
