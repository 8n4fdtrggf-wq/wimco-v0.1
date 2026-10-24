// E-handelskollen: de fem områdena, lagen bakom varje område och åtgärdspaketen med fasta priser.
// Samma fil används av sidan /e-handelskollen/ (web/) och av API:t när en beställning kommer in.
// Ändra priser och innehåll här och kör `npm run build:home`. Alla priser exklusive moms.

export const AREAS = [
  {
    id: 'tillganglighet',
    name: 'Tillgänglighet',
    law: 'Lagen (2023:254) om vissa produkters och tjänsters tillgänglighet',
    since: '28 juni 2025',
    authority: 'PTS',
    checks: 'Startsida, produktsida och sök med Lighthouse (axe-core), och länk till tillgänglighetsredogörelse.',
    package: 'tillganglighet',
  },
  {
    id: 'angerknapp',
    name: 'Ångerknapp',
    law: 'Lagen (2005:59) om distansavtal och avtal utanför affärslokaler',
    since: '19 juni 2026',
    authority: 'Konsumentverket',
    checks: 'Att det finns en tydligt märkt funktion för att ångra köpet, till exempel "Ångra avtalet här".',
    package: 'angerknapp',
  },
  {
    id: 'rabatter',
    name: 'Rabattpriser',
    law: 'Prisinformationslagen (2004:347)',
    since: 'Hösten 2022',
    authority: 'Konsumentverket',
    checks: 'Att nedsatta priser visas tillsammans med lägsta pris de senaste 30 dagarna.',
    package: 'rabatter',
  },
  {
    id: 'miljo',
    name: 'Miljöpåståenden',
    law: 'EU-direktiv 2024/825 om grön omställning, genom marknadsföringslagen',
    since: '27 september 2026',
    authority: 'Konsumentverket',
    checks: 'Ord som "miljövänlig", "klimatneutral" och "hållbar" i sidornas text.',
    package: 'miljo',
  },
  {
    id: 'sparning',
    name: 'Spårning och samtycke',
    law: 'Lagen (2022:482) om elektronisk kommunikation och GDPR',
    since: 'Gäller redan',
    authority: 'PTS och IMY',
    checks: 'Om Meta-pixeln, Google Analytics och liknande laddas innan besökaren har svarat på samtyckesfrågan.',
    package: 'sparning',
  },
];

export const AREA_IDS = AREAS.map((a) => a.id);

export const KOLLEN_PACKAGES = {
  tillganglighet: {
    id: 'tillganglighet',
    area: 'tillganglighet',
    name: 'Tillgänglighet',
    price: 'från 34 900 kr',
    amount: 34900,
    from: true,
    summary: 'Granskning av hela köpflödet, rättningar i tema och komponenter, omtest och tillgänglighetsredogörelse.',
    includes: ['Test med tangentbord och skärmläsare', 'Rättningar i ert tema', 'Tillgänglighetsredogörelse'],
  },
  angerknapp: {
    id: 'angerknapp',
    area: 'angerknapp',
    name: 'Ångerknapp på plats',
    price: '9 900 kr',
    amount: 9900,
    summary: 'En ångerfunktion som uppfyller kraven, kopplad till era ordrar.',
    includes: ['"Ångra avtalet här" i butiken', 'Bekräftelse och kvitto via e-post', 'Uppdaterade köpvillkor och kassatext'],
  },
  rabatter: {
    id: 'rabatter',
    area: 'rabatter',
    name: 'Rätta rabattpriser',
    price: '7 900 kr',
    amount: 7900,
    summary: 'Lägsta pris de senaste 30 dagarna, automatiskt, på alla sidor där rabatter visas.',
    includes: ['Prishistorik som sparas automatiskt', 'Visning i produkt- och listsidor', 'Rutin inför kampanjer'],
  },
  miljo: {
    id: 'miljo',
    area: 'miljo',
    name: 'Miljöpåståenden som håller',
    price: '5 900 kr',
    amount: 5900,
    summary: 'Vi går igenom era texter och skriver om det som riskerar att vara förbjudet.',
    includes: ['Genomgång av sajtens texter', 'Omskrivningar som ni godkänner', 'Lista över vad som kräver underlag'],
  },
  sparning: {
    id: 'sparning',
    area: 'sparning',
    name: 'Samtycke som håller',
    price: '6 900 kr',
    amount: 6900,
    summary: 'Spårningen startar först när besökaren har sagt ja.',
    includes: ['Samtyckesbanner och Google Consent Mode', 'Pixlar och taggar som väntar på samtycke', 'Uppdaterad cookiepolicy'],
  },
  bevakning: {
    id: 'bevakning',
    area: null,
    name: 'E-handelsbevakning',
    price: '1 990 kr/mån',
    amount: 1990,
    monthly: true,
    summary: 'Alla fem områdena kontrolleras varje månad. Ni får veta direkt när något blir rött.',
    includes: ['Ny kontroll varje månad', 'Larm när något blir rött', 'Upp till en timmes rättningar per månad', 'En månads uppsägning'],
  },
};

export const KOLLEN_PACKAGE_IDS = Object.keys(KOLLEN_PACKAGES);

export const DISCLAIMER =
  'E-handelskollen flaggar risker utifrån det som syns i butikens kod. Den kan inte intyga att butiken följer lagen och är inte juridisk rådgivning.';
