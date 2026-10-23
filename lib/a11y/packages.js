// Tillgänglighetspaketen. Samma källa används av sidan /tillganglighet/ (tools/build-pages.mjs)
// och av servern när en beställning tas emot. Ändra priser och innehåll här och kör
// `npm run build:pages`.
//
// Alla priser exklusive moms.

export const PACKAGES = {
  granskning: {
    id: 'granskning',
    name: 'Granskning',
    price: '12 900 kr',
    priceNote: 'fast pris',
    summary: 'Vet exakt var ni står och vad som måste göras – innan någon annan gör det åt er.',
    includes: [
      'Automatiska och manuella tester av startsida, produktsida, sök, varukorg och kassa',
      'Test med tangentbord och skärmläsare (VoiceOver och NVDA)',
      'Prioriterad åtgärdslista mot WCAG 2.1 AA och EN 301 549',
      'Utkast till tillgänglighetsredogörelse, klart att publicera',
      '30 minuters genomgång av resultatet',
    ],
    delivery: 'Leverans inom 10 arbetsdagar',
  },
  atgard: {
    id: 'atgard',
    name: 'Granskning och åtgärd',
    price: 'från 34 900 kr',
    priceNote: 'fast pris efter granskningen',
    summary: 'Vi granskar, rättar felen i ert tema eller er kod och lämnar en sajt som håller.',
    includes: [
      'Allt i Granskning',
      'Vi rättar felen i ert tema, era mallar och komponenter',
      'Omtest efter åtgärd med dokumenterat resultat',
      'Slutlig tillgänglighetsredogörelse',
      'Fast pris bestäms efter granskningen – inga löpande timmar',
    ],
    delivery: 'Normalt 3–6 veckor',
    recommended: true,
  },
  bevakning: {
    id: 'bevakning',
    name: 'Bevakning',
    price: '1 490 kr/mån',
    priceNote: 'en månads uppsägning',
    summary: 'Nya produkter, kampanjer och appar skapar nya fel. Vi ser till att de inte blir kvar.',
    includes: [
      'Månatlig mätning av era viktigaste sidor',
      'Larm när nya allvarliga fel dyker upp',
      'Uppdaterad tillgänglighetsredogörelse varje kvartal',
      'Upp till en timmes rättningar per månad ingår',
    ],
    delivery: 'Passar efter en granskning',
  },
};

export const PACKAGE_IDS = Object.keys(PACKAGES);

export const SHOP_PLATFORMS = {
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  centra: 'Centra',
  norce: 'Norce / Jetshop',
  magento: 'Magento / Adobe Commerce',
  annan: 'Annan plattform',
  vetej: 'Vet inte',
};

export const COMPANY_SIZES = {
  under10: 'Färre än 10 anställda',
  '10-49': '10–49 anställda',
  '50-249': '50–249 anställda',
  '250+': '250 anställda eller fler',
};
