// Prospektering med E-handelskollen: kör kontrollen mot en butik, hittar butikens kontaktadress och
// skriver ett mejlutkast när något är rött. Används av POST /api/admin/prospect och tools/prospect.mjs.
// Inget skickas härifrån: utkasten läses och skickas av en människa.
import { normalizeUrl, displayHost } from '../net/url-guard.js';
import { fetchHtml } from '../a11y/check.js';
import { runKollen } from './run.js';
import { AREAS, KOLLEN_PACKAGES } from './catalog.js';

const AREA = Object.fromEntries(AREAS.map((a) => [a.id, a]));
const PACKAGE_FOR_AREA = Object.fromEntries(Object.values(KOLLEN_PACKAGES).filter((p) => p.area).map((p) => [p.area, p]));

// Ämnesrad efter det mest konkreta röda området: ett tydligt fel slår ett allmänt.
const SUBJECT_ORDER = ['angerknapp', 'rabatter', 'sparning', 'miljo', 'tillganglighet'];
const SUBJECT = {
  tillganglighet: (h) => `${h} och tillgänglighetslagen`,
  angerknapp: (h) => `Ångerknappen saknas på ${h}`,
  rabatter: (h) => `Rabattpriserna på ${h} saknar lägsta pris 30 dagar`,
  miljo: (h) => `Miljöpåståenden på ${h}`,
  sparning: (h) => `Spårning före samtycke på ${h}`,
};

const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

/** "Kravet gäller sedan 19 juni 2026." or "Kravet gäller från …" for a date still ahead. Null when there is no date. */
export function sinceText(since, now = new Date()) {
  if (!since || /redan/i.test(since)) return null;
  const m = /(\d{1,2})?\s*([a-zåäö]+)\s+(\d{4})/i.exec(since);
  let date = null;
  if (m) {
    const month = MONTHS.indexOf(m[2].toLowerCase());
    date = month >= 0 ? new Date(Number(m[3]), month, Number(m[1] || 1)) : new Date(Number(m[3]), 8, 1); // "Hösten" ≈ september
  }
  const text = since.charAt(0).toLowerCase() + since.slice(1);
  return `Kravet gäller ${date && date > now ? 'från' : 'sedan'} ${text}.`;
}

// Rimliga sidor att leta kontaktadress på, utöver startsidan.
const CONTACT_PATHS = [
  '/kontakt', '/kontakta-oss', '/pages/kontakt', '/pages/kontakta-oss', '/pages/contact', '/contact',
  '/policies/contact-information', // Shopify
  '/kundservice', '/pages/kundservice', '/kundtjanst', '/pages/kundtjanst', '/om-oss', '/pages/om-oss',
  '/policies/terms-of-service', '/kopvillkor', '/pages/kopvillkor', '/villkor',
];
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi;
// Adresser som inte går till en människa på butiken.
const IGNORE_EMAIL = /^(no-?reply|noreply|donotreply|mailer-daemon|example|exempel|namn|name|test|privacy|gdpr|dataskydd|abuse|postmaster)@|@(example\.|exempel\.|domain\.|sentry|wixpress|shopify\.com|klarna\.com|wordpress\.com)/i;
const PREFERRED_LOCAL = ['info', 'hej', 'hello', 'welcome', 'kontakt', 'kundservice', 'customercare', 'customerservice', 'support', 'order', 'butik', 'shop'];

/**
 * Finds a contact e-mail published on the shop's site. An address on the shop's own brand (any top-level
 * domain, so butik.com counts for butik.se) is trusted; otherwise the most frequent address on the site is
 * returned with `check: true`, for a human to confirm. Returns null when the site shows no address.
 */
export async function findContactEmail(url, platform, { startHtml = null } = {}) {
  const brand = brandOf(displayHost(url));
  const counts = new Map();
  const collect = (html) => {
    for (const m of String(html || '').replace(/&#64;|\[at\]|\(at\)/gi, '@').match(EMAIL_RE) || []) {
      const e = m.toLowerCase().replace(/\.$/, '');
      if (!IGNORE_EMAIL.test(e) && !/\.(png|jpe?g|webp|svg|gif)$/.test(e)) counts.set(e, (counts.get(e) || 0) + 1);
    }
  };
  const own = () => [...counts.keys()].filter((e) => brandOf(e.split('@')[1]) === brand);
  collect(startHtml ?? (await fetchHtml(url.toString(), platform).catch(() => '')));
  for (const p of CONTACT_PATHS) {
    if (own().length) break;
    try {
      collect(await fetchHtml(new URL(p, url).toString(), platform));
    } catch {
      // Sidan finns inte; prova nästa.
    }
  }
  const mine = own().sort((a, b) => rank(a) - rank(b) || counts.get(b) - counts.get(a));
  if (mine.length) return { email: mine[0], check: false };
  const other = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
  return other.length ? { email: other[0], check: true } : null;
}

// "www.timiofsweden.se" → "timiofsweden" (ignores co.uk-style suffixes well enough for Swedish shops).
const brandOf = (host) => host.toLowerCase().replace(/^www\./, '').split('.').slice(-2, -1)[0] || host;

const rank = (e) => {
  const i = PREFERRED_LOCAL.indexOf(e.split('@')[0]);
  return i === -1 ? PREFERRED_LOCAL.length : i;
};

/** The e-mail draft for a report with at least one red area, or null when nothing is red. */
export function draftEmail(report, { siteUrl = 'https://wimco.se', sender = 'Wim', phone = '070-094 54 80', now = new Date() } = {}) {
  const red = report.areas.filter((a) => a.status === 'fail').sort((x, y) => SUBJECT_ORDER.indexOf(x.id) - SUBJECT_ORDER.indexOf(y.id));
  if (!red.length) return null;
  const host = report.host;
  const link = `${siteUrl}/e-handelskollen/?r=${report.id}`;
  const lines = red.slice(0, 3).map((a) => {
    const pkg = PACKAGE_FOR_AREA[a.id];
    const since = sinceText(AREA[a.id]?.since, now);
    const price = pkg ? ` Vi rättar det ${/^från /.test(pkg.price) ? pkg.price : `för ${pkg.price}`}.` : '';
    return `- ${AREA[a.id]?.name || a.id}: ${a.summary}${since ? ` ${since}` : ''}${price}`;
  });
  const intro = red.length === 1 ? 'En punkt blev röd:' : red.length > 3 ? `${red.length} punkter blev röda. De viktigaste:` : `${red.length} punkter blev röda:`;
  const subject = SUBJECT[red[0].id]?.(host) || `E-handelskollen för ${host}`;
  const body = [
    'Hej!',
    '',
    `Vi körde E-handelskollen, vår kontroll av de nya lagkraven för nätbutiker, på ${host}. ${intro}`,
    '',
    ...lines,
    '',
    `Hela resultatet, med vad vi kontrollerade på varje sida: ${link}`,
    '',
    'Vill ni ha hjälp? Svara på det här mejlet, så får ni ett fast pris innan något är bindande.',
    '',
    'Vänliga hälsningar',
    `${sender}, Wimco`,
    `${phone} · ${siteUrl.replace(/^https?:\/\//, '')}`,
    '',
    'Kontrollen flaggar risker utifrån butikens kod och är inte juridisk rådgivning.',
    'Vill du inte få fler mejl från oss? Svara "nej tack" så hör vi inte av oss igen.',
  ].join('\n');
  return { subject, body, link };
}

/** Runs the kollen for one shop and returns a compact row for the prospect list. */
export async function prospectShop(input, { env, platform, store, siteUrl }) {
  const url = normalizeUrl(String(input || ''));
  let report = null;
  let error = null;
  try {
    for await (const ev of runKollen(url.toString(), { env, platform, store })) {
      if (ev.type === 'result') report = ev.report;
      if (ev.type === 'error') error = ev.message;
    }
  } catch (err) {
    error = err?.message || 'Kontrollen misslyckades.';
  }
  if (!report) return { ok: false, host: displayHost(url), url: url.toString(), error: error || 'Inget resultat.' };
  const contact = await findContactEmail(url, platform).catch(() => null);
  return {
    ok: true,
    host: report.host,
    url: report.url,
    id: report.id,
    email: contact?.email || null,
    emailCheck: !!contact?.check,
    summary: report.summary,
    areas: Object.fromEntries(report.areas.map((a) => [a.id, a.status])),
    draft: draftEmail(report, { siteUrl }),
  };
}
