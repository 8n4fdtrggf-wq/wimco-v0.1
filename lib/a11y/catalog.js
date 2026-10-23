// Tillgänglighetstestet: koppling från Lighthouse-granskningar (axe-core) till WCAG-kriterier,
// allvarlighetsgrad och vem som drabbas. Lighthouse levererar själv svenska rubriker (locale=sv),
// så här ligger bara det Lighthouse inte säger.
//
// severity: 'critical' = stoppar någon från att handla, 'serious' = gör det mycket svårt,
// 'moderate' = försvårar. Okända granskningar får grad efter Lighthouse-vikten.

const WHO = {
  sr: 'Skärmläsaranvändare',
  kb: 'Den som navigerar med tangentbord',
  vision: 'Synsvaga',
  motor: 'Den med nedsatt motorik',
  all: 'Alla besökare',
  cog: 'Den med kognitiva funktionsnedsättningar',
  hearing: 'Döva och hörselskadade',
};

const A = (wcag, severity, who, fix) => ({ wcag, severity, who: who.map((w) => WHO[w]), fix });

export const AUDITS = {
  'color-contrast': A(['1.4.3'], 'serious', ['vision', 'all'], 'Mörka texten eller ljusa bakgrunden tills kontrasten är minst 4,5:1 (3:1 för stor text).'),
  'link-in-text-block': A(['1.4.1'], 'moderate', ['vision'], 'Gör länkar i löptext synliga utan färg, till exempel med understrykning.'),
  'image-alt': A(['1.1.1'], 'critical', ['sr'], 'Ge produktbilder och andra innehållsbilder en kort alt-text. Dekorativa bilder får alt="".'),
  'input-image-alt': A(['1.1.1', '4.1.2'], 'critical', ['sr'], 'Ge bildknappar en alt-text som säger vad knappen gör.'),
  'object-alt': A(['1.1.1'], 'serious', ['sr'], 'Ge inbäddade objekt en textbeskrivning.'),
  'image-redundant-alt': A(['1.1.1'], 'moderate', ['sr'], 'Undvik att alt-texten upprepar texten bredvid bilden.'),
  'svg-img-alt': A(['1.1.1'], 'serious', ['sr'], 'Ge SVG-bilder med role="img" en tillgänglig text.'),
  'role-img-alt': A(['1.1.1'], 'serious', ['sr'], 'Ge element med role="img" en tillgänglig text.'),
  'button-name': A(['4.1.2'], 'critical', ['sr', 'kb'], 'Ge ikonknappar (meny, sök, varukorg, stäng) en etikett med text eller aria-label.'),
  'input-button-name': A(['4.1.2'], 'critical', ['sr'], 'Ge knappar av typen input ett value eller aria-label.'),
  'link-name': A(['2.4.4', '4.1.2'], 'critical', ['sr', 'kb'], 'Ge länkar som bara består av en ikon eller bild en text som säger vart de leder.'),
  'label': A(['1.3.1', '4.1.2'], 'critical', ['sr', 'cog'], 'Koppla en synlig etikett till varje formulärfält, även sökfältet och antalsväljaren.'),
  'select-name': A(['1.3.1', '4.1.2'], 'critical', ['sr'], 'Ge rullistor (storlek, färg, sortering) en etikett.'),
  'form-field-multiple-labels': A(['3.3.2'], 'moderate', ['sr'], 'Ge varje fält en enda etikett.'),
  'label-content-name-mismatch': A(['2.5.3'], 'moderate', ['motor', 'sr'], 'Se till att det tillgängliga namnet börjar med den synliga texten.'),
  'html-has-lang': A(['3.1.1'], 'serious', ['sr'], 'Ange lang="sv" på html-elementet så att skärmläsaren läser med svenskt uttal.'),
  'html-lang-valid': A(['3.1.1'], 'serious', ['sr'], 'Använd en giltig språkkod, till exempel "sv".'),
  'html-xml-lang-mismatch': A(['3.1.1'], 'moderate', ['sr'], 'Låt lang och xml:lang ange samma språk.'),
  'valid-lang': A(['3.1.2'], 'moderate', ['sr'], 'Använd giltiga språkkoder på delar av sidan.'),
  'document-title': A(['2.4.2'], 'serious', ['sr', 'all'], 'Ge varje sida en beskrivande titel.'),
  'frame-title': A(['4.1.2'], 'serious', ['sr'], 'Ge iframes (chatt, betalning, karta) ett title-attribut.'),
  'heading-order': A(['1.3.1'], 'moderate', ['sr'], 'Använd rubriknivåer i ordning utan att hoppa över nivåer.'),
  'empty-heading': A(['1.3.1', '2.4.6'], 'moderate', ['sr'], 'Ta bort tomma rubriker eller ge dem text.'),
  'bypass': A(['2.4.1'], 'serious', ['kb', 'sr'], 'Lägg till en "Hoppa till innehållet"-länk eller tydliga landmärken.'),
  'skip-link': A(['2.4.1'], 'moderate', ['kb'], 'Se till att hopplänken leder till ett element som finns och går att fokusera.'),
  'landmark-one-main': A(['1.3.1'], 'moderate', ['sr'], 'Märk upp sidans huvudinnehåll med ett main-element.'),
  'tabindex': A(['2.4.3'], 'serious', ['kb'], 'Ta bort tabindex större än 0 så att tabbordningen följer sidan.'),
  'accesskeys': A(['4.1.2'], 'moderate', ['kb'], 'Använd unika snabbtangenter.'),
  'target-size': A(['2.5.8'], 'moderate', ['motor'], 'Gör klickytor minst 24 × 24 pixlar, helst 44, med luft emellan.'),
  'meta-viewport': A(['1.4.4'], 'serious', ['vision'], 'Tillåt zoom: ta bort user-scalable=no och maximum-scale under 5.'),
  'meta-refresh': A(['2.2.1', '3.2.5'], 'serious', ['cog', 'sr'], 'Ta bort automatisk omladdning eller vidarebefordran med tidsfördröjning.'),
  'list': A(['1.3.1'], 'moderate', ['sr'], 'Låt ul och ol bara innehålla li-element.'),
  'listitem': A(['1.3.1'], 'moderate', ['sr'], 'Placera li-element inuti ul eller ol.'),
  'definition-list': A(['1.3.1'], 'moderate', ['sr'], 'Låt dl bara innehålla dt- och dd-grupper.'),
  'dlitem': A(['1.3.1'], 'moderate', ['sr'], 'Placera dt och dd inuti dl.'),
  'td-headers-attr': A(['1.3.1'], 'serious', ['sr'], 'Låt headers-attribut peka på rubrikceller i samma tabell.'),
  'th-has-data-cells': A(['1.3.1'], 'serious', ['sr'], 'Se till att tabellrubriker beskriver dataceller.'),
  'td-has-header': A(['1.3.1'], 'serious', ['sr'], 'Ge stora tabeller rubrikceller.'),
  'table-duplicate-name': A(['1.3.1'], 'moderate', ['sr'], 'Låt tabellens caption och summary skilja sig åt.'),
  'table-fake-caption': A(['1.3.1'], 'serious', ['sr'], 'Använd caption för tabellrubrik i stället för en sammanslagen cell.'),
  'video-caption': A(['1.2.2'], 'critical', ['hearing'], 'Lägg till undertexter på videor.'),
  'duplicate-id-aria': A(['4.1.2'], 'serious', ['sr'], 'Använd unika id:n på element som refereras av ARIA eller etiketter.'),
  'aria-hidden-body': A(['4.1.2'], 'critical', ['sr'], 'Ta bort aria-hidden från body – det döljer hela sidan för skärmläsare.'),
  'aria-hidden-focus': A(['4.1.2'], 'serious', ['sr', 'kb'], 'Element som döljs med aria-hidden får inte gå att fokusera (vanligt i dolda menyer och karuseller).'),
  'aria-dialog-name': A(['4.1.2'], 'serious', ['sr'], 'Ge dialoger och popupfönster en rubrik eller aria-label.'),
  'aria-command-name': A(['4.1.2'], 'serious', ['sr'], 'Ge knappar, länkar och menyval en tillgänglig text.'),
  'aria-input-field-name': A(['4.1.2'], 'serious', ['sr'], 'Ge ARIA-fält en etikett.'),
  'aria-toggle-field-name': A(['4.1.2'], 'serious', ['sr'], 'Ge kryssrutor och reglage en etikett.'),
  'aria-progressbar-name': A(['1.1.1'], 'serious', ['sr'], 'Ge förloppsindikatorer en etikett.'),
  'aria-meter-name': A(['1.1.1'], 'serious', ['sr'], 'Ge mätare en etikett.'),
  'aria-tooltip-name': A(['4.1.2'], 'serious', ['sr'], 'Ge tooltips en text.'),
  'aria-treeitem-name': A(['4.1.2'], 'serious', ['sr'], 'Ge trädnoder en text.'),
};

// Övriga ARIA-regler (aria-allowed-attr, aria-required-children m.fl.) delar samma följd:
// skärmläsaren får fel eller ingen information om komponenten.
const ARIA_FALLBACK = A(['4.1.2'], 'serious', ['sr'], 'Rätta ARIA-attributen så att komponenten beskrivs korrekt för hjälpmedel.');

export function auditInfo(id, weight = 0) {
  if (AUDITS[id]) return AUDITS[id];
  if (id.startsWith('aria-')) return ARIA_FALLBACK;
  const severity = weight >= 10 ? 'critical' : weight >= 7 ? 'serious' : 'moderate';
  return { wcag: [], severity, who: [], fix: null };
}

export const SEVERITY_ORDER = { critical: 0, serious: 1, moderate: 2 };
export const SEVERITY_LABEL = { critical: 'Kritisk', serious: 'Allvarlig', moderate: 'Måttlig' };

// Sidtyperna PTS granskar i sin tillsyn av e-handel: startsida, produktsida och sökfunktion.
export const PAGE_KINDS = {
  start: 'Startsida',
  product: 'Produktsida',
  search: 'Sökresultat',
};

// "Tillgänglighetsverktyg" som läggs ovanpå sajten. De rättar inte den underliggande koden.
export const OVERLAYS = [
  { re: /acsbapp\.com|accessibe\.com/i, name: 'accessiBe' },
  { re: /userway\.org/i, name: 'UserWay' },
  { re: /equalweb\.com|nagich\./i, name: 'EqualWeb' },
  { re: /audioeye\.com/i, name: 'AudioEye' },
  { re: /enableall|enable-all/i, name: 'EnableAll' },
  { re: /eye-able\.com/i, name: 'Eye-Able' },
  { re: /maxaccess|max-access/i, name: 'MaxAccess' },
  { re: /accessiblyapp|accessibly\.app/i, name: 'Accessibly' },
  { re: /adally\.com/i, name: 'Adally' },
  { re: /allyable\.com/i, name: 'Allyable' },
  { re: /ally\.ac|getally\.io/i, name: 'Ally' },
];

export const PLATFORMS = [
  { re: /cdn\.shopify\.com|Shopify\.theme|shopify-section/i, id: 'shopify', name: 'Shopify' },
  { re: /woocommerce|wp-content\/plugins\/woocommerce/i, id: 'woocommerce', name: 'WooCommerce' },
  { re: /centra\.(com|io)|centraapi/i, id: 'centra', name: 'Centra' },
  { re: /norce|storm\.io/i, id: 'norce', name: 'Norce' },
  { re: /mage\/cookies|Magento_|magento/i, id: 'magento', name: 'Magento / Adobe Commerce' },
  { re: /askas\./i, id: 'askas', name: 'Askås' },
  { re: /abicart|textalk/i, id: 'abicart', name: 'Abicart' },
  { re: /jetshop|norce-commerce/i, id: 'jetshop', name: 'Jetshop' },
  { re: /wix\.com|wixstatic/i, id: 'wix', name: 'Wix' },
  { re: /squarespace/i, id: 'squarespace', name: 'Squarespace' },
];
