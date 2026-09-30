// Alla kontroller som bygger Wimco Score. Varje kontroll är ren data och anger sin källa:
//   measured  – uppmätt av Google Lighthouse via PageSpeed Insights
//   rules     – deterministisk kontroll av sidans HTML/HTTP-svar
//   heuristic – designbedömning enligt fasta regler (tolkning, inte mätning)
//   ai        – bedömning från språkmodell (endast om AI är konfigurerat)
import { metaMap } from './html-parse.js';

const CTA_RE = /\b(kontakta|kontakt|boka|bokning|offert|beställ|köp|handla|ring|mejla|maila|skriv till|starta|kom igång|prova|testa|anmäl|registrera|begär|få en|få offert|hör av|book|contact|buy|shop|order|get started|start|try|sign up|request|call|demo|quote)\b/i;
const CONTACT_HREF_RE = /(kontakt|contact|boka|booking|offert|quote)/i;
const ANALYTICS_RE = /(googletagmanager\.com|google-analytics\.com|gtag\/js|plausible\.io|matomo|piwik|analytics\.js|hotjar|clarity\.ms|fathom|umami|segment\.com|pinimg|facebook\.net\/.*fbevents)/i;

function mk(o) {
  return {
    id: o.id,
    category: o.category,
    source: o.source || 'rules',
    status: o.status,
    weight: o.weight ?? 2,
    title: o.title,
    detail: o.detail || '',
    fix: o.fix || '',
    impact: o.impact || 'Medel',
    impactText: o.impactText || '',
    effort: o.effort || 'Liten',
    guide: o.guide || null,
    service: o.service || 'optimering',
    cta: o.cta || null,
    value: o.value ?? null,
  };
}

const sec = (ms) => (ms / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' s';
const kb = (b) => Math.round(b / 1024).toLocaleString('sv-SE') + ' kB';
const band = (v, good, ok) => (v <= good ? 'pass' : v <= ok ? 'warn' : 'fail');

export function buildChecks(ctx) {
  const { parsed, psi } = ctx;
  const meta = metaMap(parsed);
  const checks = [];
  const push = (o) => checks.push(mk(o));
  const finalUrl = new URL(ctx.url);
  const images = parsed.images.filter((i) => !i.ariaHidden);

  // ---------------- SEO och teknisk grund ----------------
  push({
    id: 'https', category: 'seo', weight: 5, guide: 'seo', service: 'optimering',
    status: finalUrl.protocol === 'https:' ? 'pass' : 'fail',
    title: finalUrl.protocol === 'https:' ? 'Sajten använder säker anslutning (HTTPS)' : 'Sajten saknar säker anslutning (HTTPS)',
    detail: finalUrl.protocol === 'https:' ? 'Webbläsaren visar hänglåset och Google ser sajten som säker.' : 'Besökare får varningen ”Inte säker” och Google nedprioriterar osäkra sidor.',
    fix: 'Aktivera ett TLS-certifikat (ofta gratis via webbhotellet) och skicka all trafik till https://.',
    impact: 'Hög', impactText: 'Förtroende och synlighet i Google.', effort: 'Liten',
    cta: 'Få hjälp med prestanda och utveckling',
  });

  const title = parsed.title || '';
  const tLen = [...title].length;
  push({
    id: 'title', category: 'seo', weight: 4, guide: 'seo',
    status: !title ? 'fail' : tLen < 15 || tLen > 65 ? 'warn' : 'pass',
    value: title ? `${tLen} tecken` : null,
    title: !title ? 'Sidan saknar sidtitel' : tLen < 15 ? 'Sidtiteln är väldigt kort' : tLen > 65 ? 'Sidtiteln är för lång för Google' : 'Sidtiteln har bra längd',
    detail: title ? `Titel: ”${title.slice(0, 90)}”` : 'Titeln är den blå rubriken i Googles sökresultat.',
    fix: 'Skriv en unik titel på 30–60 tecken med vad ni gör och var, t.ex. ”Elektriker i Uppsala | Företagsnamn”.',
    impact: 'Hög', impactText: 'Avgör hur ni syns och hur ofta folk klickar i sökresultaten.', effort: 'Liten',
  });

  const desc = meta.description || '';
  const dLen = [...desc].length;
  push({
    id: 'meta-description', category: 'seo', weight: 3, guide: 'seo',
    status: !desc ? 'fail' : dLen < 50 || dLen > 170 ? 'warn' : 'pass',
    value: desc ? `${dLen} tecken` : null,
    title: !desc ? 'Metabeskrivning saknas' : dLen < 50 ? 'Metabeskrivningen är för kort' : dLen > 170 ? 'Metabeskrivningen klipps i Google' : 'Metabeskrivningen har bra längd',
    detail: desc ? `”${desc.slice(0, 140)}${dLen > 140 ? '…' : ''}”` : 'Utan beskrivning väljer Google själv en textbit, ofta en dålig.',
    fix: 'Skriv 120–160 tecken som säger vad besökaren får och avslutas med en tydlig uppmaning.',
    impact: 'Medel', impactText: 'Fler klick från samma placering i Google.', effort: 'Liten',
  });

  const h1s = parsed.headings.filter((h) => h.level === 1);
  push({
    id: 'h1', category: 'seo', weight: 3, guide: 'seo',
    status: h1s.length === 1 ? 'pass' : h1s.length === 0 ? 'fail' : 'warn',
    value: `${h1s.length} st`,
    title: h1s.length === 1 ? 'Sidan har en tydlig huvudrubrik (H1)' : h1s.length === 0 ? 'Huvudrubrik (H1) saknas' : `Sidan har ${h1s.length} huvudrubriker`,
    detail: h1s.length ? `H1: ”${h1s[0].text.slice(0, 90)}”` : 'Både Google och skärmläsare använder H1 för att förstå vad sidan handlar om.',
    fix: 'Använd exakt en H1 som beskriver sidans huvudbudskap. Resten av rubrikerna blir H2 och H3.',
    impact: 'Medel', impactText: 'Tydligare för Google och för besökare som skumläser.', effort: 'Liten',
  });

  const canonical = parsed.links.find((l) => (l.rel || '').toLowerCase().split(/\s+/).includes('canonical'));
  push({
    id: 'canonical', category: 'seo', weight: 2, guide: 'seo',
    status: canonical?.href ? 'pass' : 'warn',
    title: canonical?.href ? 'Kanonisk adress är angiven' : 'Kanonisk adress saknas',
    detail: canonical?.href ? 'Google vet vilken version av sidan som är originalet.' : 'Utan canonical kan samma sida indexeras under flera adresser (med och utan www, parametrar m.m.).',
    fix: 'Lägg till <link rel="canonical"> som pekar på sidans föredragna adress.',
    impact: 'Låg', impactText: 'Undviker dubbletter i Googles index.', effort: 'Liten',
  });

  const robotsMeta = (meta.robots || '') + ' ' + (meta.googlebot || '') + ' ' + (ctx.fetch.headers?.get?.('x-robots-tag') || '');
  const noindex = /noindex/i.test(robotsMeta);
  push({
    id: 'indexable', category: 'seo', weight: 5, guide: 'seo',
    status: noindex ? 'fail' : 'pass',
    title: noindex ? 'Sidan är blockerad för Google (noindex)' : 'Sidan får visas i Google',
    detail: noindex ? 'En robots-instruktion säger åt sökmotorer att inte visa sidan. Ofta en kvarglömd inställning från utvecklingen.' : 'Inga instruktioner hindrar sökmotorer från att indexera sidan.',
    fix: 'Ta bort ”noindex” från robots-metataggen eller X-Robots-Tag-headern.',
    impact: 'Hög', impactText: 'Sidan kan inte hittas i Google alls så länge den är blockerad.', effort: 'Liten',
  });

  const hasOg = !!(meta['og:title'] && meta['og:image']);
  push({
    id: 'open-graph', category: 'seo', weight: 1, guide: 'seo',
    status: hasOg ? 'pass' : 'warn',
    title: hasOg ? 'Delningsbild och titel för sociala medier finns' : 'Delningsbild för sociala medier saknas',
    detail: hasOg ? 'Länkar till sajten får bild och rubrik när de delas.' : 'När någon delar länken på LinkedIn, Facebook eller i Slack blir förhandsvisningen tom eller slumpmässig.',
    fix: 'Lägg till og:title, og:description och en og:image på 1200×630 px.',
    impact: 'Låg', impactText: 'Snyggare och fler klickade delningar.', effort: 'Liten',
  });

  const hasJsonLd = parsed.jsonLd.some((j) => j.trim().length > 10);
  push({
    id: 'structured-data', category: 'seo', weight: 2, guide: 'seo',
    status: hasJsonLd ? 'pass' : 'warn',
    title: hasJsonLd ? 'Strukturerad data finns' : 'Strukturerad data saknas',
    detail: hasJsonLd ? 'Sidan beskriver sig själv för sökmotorer med schema.org.' : 'Strukturerad data (schema.org) hjälper Google att förstå företagsnamn, adress, öppettider och tjänster.',
    fix: 'Lägg till JSON-LD för Organization eller LocalBusiness med namn, kontaktuppgifter och adress.',
    impact: 'Medel', impactText: 'Bättre förutsättningar för rika sökresultat och lokal synlighet.', effort: 'Liten',
  });

  if (ctx.robots) {
    const sitemapFromRobots = /^\s*sitemap\s*:/im.test(ctx.robots.text || '');
    const hasSitemap = ctx.sitemapFound || sitemapFromRobots;
    push({
      id: 'sitemap', category: 'seo', weight: 2, guide: 'seo',
      status: hasSitemap ? 'pass' : 'warn',
      title: hasSitemap ? 'Sitemap hittades' : 'Ingen sitemap hittades',
      detail: hasSitemap ? 'Sökmotorer får en karta över sajtens sidor.' : `Vi hittade varken /sitemap.xml eller en sitemap-rad i robots.txt${ctx.robots.status === 200 ? '' : ' (robots.txt saknas också)'}.`,
      fix: 'Skapa en sitemap.xml, länka den från robots.txt och skicka in den i Google Search Console.',
      impact: 'Låg', impactText: 'Snabbare och mer komplett indexering av nya sidor.', effort: 'Liten',
    });
  }

  // Föråldrad teknik
  const generator = meta.generator || '';
  const wpVer = /wordpress\s+(\d+)\.(\d+)/i.exec(generator);
  const jq = parsed.scripts.map((s) => s.src || '').map((s) => /jquery[.-]?(\d)\.(\d+)/i.exec(s)).find(Boolean);
  const outdated = [];
  if (wpVer && Number(wpVer[1]) < 6) outdated.push(`WordPress ${wpVer[1]}.${wpVer[2]}`);
  if (jq && Number(jq[1]) < 3) outdated.push(`jQuery ${jq[1]}.${jq[2]}`);
  if (parsed.legacyTags > 0) outdated.push('HTML-taggar som slutat stödjas');
  if (!parsed.doctype) outdated.push('saknad doctype');
  push({
    id: 'modern-tech', category: 'seo', weight: 2, guide: 'kostnad', service: 'webbutveckling',
    status: outdated.length === 0 ? 'pass' : outdated.length > 1 ? 'fail' : 'warn',
    title: outdated.length === 0 ? 'Inga tecken på föråldrad teknik' : 'Tecken på föråldrad teknik',
    detail: outdated.length ? `Vi hittade: ${outdated.join(', ')}.` : 'Vi hittade inga kända föråldrade versioner i sidans kod.',
    fix: 'Uppdatera plattform och bibliotek – eller överväg en modern, lättskött lösning om grunden är för gammal.',
    impact: 'Medel', impactText: 'Säkerhet, hastighet och lägre underhållskostnad.', effort: outdated.length > 1 ? 'Stor' : 'Medel',
    cta: 'Diskutera en modern webblösning',
  });

  if (psi?.categories?.bestPractices != null) {
    const bp = Math.round(psi.categories.bestPractices * 100);
    push({
      id: 'best-practices', category: 'seo', source: 'measured', weight: 2, guide: 'seo', service: 'webbutveckling',
      status: bp >= 90 ? 'pass' : bp >= 70 ? 'warn' : 'fail', value: `${bp}/100`,
      title: bp >= 90 ? 'God teknisk hygien enligt Lighthouse' : 'Lighthouse hittade tekniska brister',
      detail: `Lighthouse ”Bästa praxis” ger ${bp} av 100 – bland annat konsolfel, föråldrade API:er och säkerhetsinställningar.`,
      fix: 'Åtgärda konsolfel och varningar, uppdatera bibliotek och se över säkerhetsheaders.',
      impact: 'Låg', impactText: 'Stabilare sajt med färre fel för besökarna.', effort: 'Medel',
      cta: 'Diskutera en modern webblösning',
    });
  }

  // ---------------- Prestanda ----------------
  if (psi?.metrics) {
    const m = psi.metrics;
    if (m.lcp != null) push({
      id: 'lcp', category: 'performance', source: 'measured', weight: 5, guide: 'prestanda',
      status: band(m.lcp, 2500, 4000), value: sec(m.lcp),
      title: `Största innehållet visas efter ${sec(m.lcp)} på mobil`,
      detail: 'Largest Contentful Paint (LCP) mäter när sidans huvudinnehåll syns. Google räknar 2,5 s eller snabbare som bra.',
      fix: psi.opportunities?.[0] ? `Börja med: ${psi.opportunities.slice(0, 2).map((o) => o.title.toLowerCase()).join(' och ')}.` : 'Komprimera och skala ned stora bilder, ladda typsnitt smartare och minska skript som blockerar rendering.',
      impact: 'Hög', impactText: 'Besökare lämnar långsamma sidor innan de ens sett erbjudandet.', effort: 'Medel',
      cta: 'Få hjälp med prestanda och utveckling',
    });
    if (m.cls != null) push({
      id: 'cls', category: 'performance', source: 'measured', weight: 3, guide: 'prestanda',
      status: band(m.cls, 0.1, 0.25), value: m.cls.toLocaleString('sv-SE', { maximumFractionDigits: 2 }),
      title: m.cls <= 0.1 ? 'Layouten ligger still medan sidan laddar' : 'Innehållet hoppar medan sidan laddar',
      detail: `Cumulative Layout Shift är ${m.cls.toLocaleString('sv-SE', { maximumFractionDigits: 2 })}. Under 0,1 räknas som bra.`,
      fix: 'Ange bredd och höjd på bilder och inbäddningar och reservera plats för banners och typsnitt.',
      impact: 'Medel', impactText: 'Färre felklick och en lugnare upplevelse.', effort: 'Liten',
      cta: 'Få hjälp med prestanda och utveckling',
    });
    if (m.tbt != null) push({
      id: 'tbt', category: 'performance', source: 'measured', weight: 3, guide: 'prestanda',
      status: band(m.tbt, 200, 600), value: `${Math.round(m.tbt).toLocaleString('sv-SE')} ms`,
      title: m.tbt <= 200 ? 'Sidan svarar snabbt på tryck' : 'Tunga skript gör sidan seg att använda',
      detail: `Total Blocking Time är ${Math.round(m.tbt).toLocaleString('sv-SE')} ms i Lighthouse-testet. Under 200 ms räknas som bra.`,
      fix: 'Skala ned tredjepartsskript (chattar, spårning, sliders) och ladda resten först när de behövs.',
      impact: 'Medel', impactText: 'Knappar och menyer reagerar direkt.', effort: 'Medel',
      cta: 'Få hjälp med prestanda och utveckling',
    });
    if (psi.field?.lcp != null || psi.field?.inp != null) {
      const f = psi.field;
      const slow = (f.lcp ?? 0) > 2500 || (f.inp ?? 0) > 200 || (f.cls ?? 0) > 0.1;
      push({
        id: 'field-data', category: 'performance', source: 'measured', weight: 3, guide: 'prestanda',
        status: slow ? 'warn' : 'pass',
        value: [f.lcp != null ? `LCP ${sec(f.lcp)}` : null, f.inp != null ? `INP ${f.inp} ms` : null].filter(Boolean).join(' · '),
        title: slow ? 'Riktiga besökare upplever sajten som långsam' : 'Riktiga besökare får en snabb upplevelse',
        detail: 'Baserat på Chrome-användares faktiska besök de senaste 28 dagarna (Chrome UX Report).',
        fix: 'Prioritera åtgärderna för LCP och INP – det är dessa värden Google använder i sökrankningen.',
        impact: 'Hög', impactText: 'Detta är vad dina riktiga kunder upplever.', effort: 'Medel',
        cta: 'Få hjälp med prestanda och utveckling',
      });
    }
  }

  push({
    id: 'server-response', category: 'performance', weight: psi ? 1 : 3, guide: 'prestanda',
    status: band(ctx.fetch.ttfb, 800, 1800), value: `${ctx.fetch.ttfb.toLocaleString('sv-SE')} ms`,
    title: ctx.fetch.ttfb <= 800 ? 'Servern svarar snabbt' : 'Servern svarar långsamt',
    detail: `Det tog ${ctx.fetch.ttfb.toLocaleString('sv-SE')} ms innan servern började skicka sidan (mätt från Wimcos server).`,
    fix: 'Se över webbhotell, cache och plugin. En snabb server är grunden för allt annat.',
    impact: 'Medel', impactText: 'Allt annat väntar på serverns första svar.', effort: 'Medel',
    cta: 'Få hjälp med prestanda och utveckling',
  });

  const htmlSize = ctx.fetch.bytesLength;
  push({
    id: 'html-size', category: 'performance', weight: 1, guide: 'prestanda',
    status: band(htmlSize, 150 * 1024, 500 * 1024), value: kb(htmlSize),
    title: htmlSize <= 150 * 1024 ? 'HTML-koden är lätt' : 'HTML-koden är tung',
    detail: `Själva HTML-dokumentet är ${kb(htmlSize)}${ctx.fetch.truncated ? ' (eller mer – vi slutade läsa vid 3 MB)' : ''}.`,
    fix: 'Ta bort inbäddad kod och inaktiva sektioner, och flytta stora datamängder ut ur HTML:en.',
    impact: 'Låg', impactText: 'Snabbare första visning, särskilt på mobilnät.', effort: 'Medel',
  });

  const blocking = parsed.scripts.filter((s) => s.src && s.inHead && !s.async && !s.defer && !s.module).length;
  push({
    id: 'render-blocking', category: 'performance', weight: psi ? 1 : 3, guide: 'prestanda',
    status: blocking <= 1 ? 'pass' : blocking <= 4 ? 'warn' : 'fail', value: `${blocking} st`,
    title: blocking <= 1 ? 'Få skript blockerar visningen' : `${blocking} skript blockerar visningen`,
    detail: 'Skript i <head> utan async eller defer måste laddas klart innan något visas.',
    fix: 'Lägg till defer på skript som inte behövs direkt, och ta bort de som inte används.',
    impact: 'Medel', impactText: 'Sidan börjar visas tidigare.', effort: 'Liten',
    cta: 'Få hjälp med prestanda och utveckling',
  });

  if (images.length >= 4) {
    const modern = images.filter((i) => /\.(webp|avif)(\?|$)/i.test(i.src) || i.inPicture).length;
    const lazy = images.filter((i) => i.loading === 'lazy').length;
    const ok = modern / images.length >= 0.5 || lazy >= Math.min(3, images.length - 2);
    push({
      id: 'images', category: 'performance', weight: psi ? 1 : 3, guide: 'prestanda',
      status: ok ? 'pass' : 'warn', value: `${images.length} bilder`,
      title: ok ? 'Bilderna laddas på ett modernt sätt' : 'Bilderna kan laddas smartare',
      detail: `${modern} av ${images.length} bilder använder moderna format (WebP/AVIF) och ${lazy} laddas först när de behövs.`,
      fix: 'Konvertera bilder till WebP/AVIF, skala dem till rätt storlek och använd loading="lazy" längre ned på sidan.',
      impact: 'Medel', impactText: 'Bilder är oftast den största delen av sidans vikt.', effort: 'Liten',
      cta: 'Få hjälp med prestanda och utveckling',
    });
  }

  // ---------------- Mobilupplevelse ----------------
  const vp = (meta.viewport || '').toLowerCase();
  const hasVp = /width\s*=\s*device-width/.test(vp);
  push({
    id: 'viewport', category: 'mobile', weight: 5, guide: 'konvertering', service: 'hemsidor',
    status: hasVp ? 'pass' : 'fail',
    title: hasVp ? 'Sidan anpassar sig efter mobilskärmen' : 'Sidan är inte anpassad för mobil',
    detail: hasVp ? 'Viewport-inställningen gör att sidan skalas rätt på telefoner.' : 'Utan viewport-inställning visas en förminskad datorversion på mobilen.',
    fix: 'Lägg till <meta name="viewport" content="width=device-width, initial-scale=1"> och en responsiv layout.',
    impact: 'Hög', impactText: 'Majoriteten av besöken sker ofta på mobil.', effort: hasVp ? 'Liten' : 'Stor',
    cta: 'Bygg min nya webbplats',
  });

  const maxScale = /maximum-scale\s*=\s*([\d.]+)/.exec(vp);
  const zoomBlocked = /user-scalable\s*=\s*(no|0)/.test(vp) || (maxScale && Number(maxScale[1]) < 2);
  push({
    id: 'zoom', category: 'accessibility', weight: 3, guide: 'tillganglighet',
    status: zoomBlocked ? 'fail' : 'pass',
    title: zoomBlocked ? 'Besökare kan inte zooma på mobilen' : 'Zoom fungerar på mobilen',
    detail: zoomBlocked ? 'Viewport-inställningen stänger av zoom, vilket stänger ute personer som behöver större text.' : 'Besökare med nedsatt syn kan förstora sidan.',
    fix: 'Ta bort user-scalable=no och maximum-scale från viewport-taggen.',
    impact: 'Medel', impactText: 'Tillgänglighetskrav och bättre läsbarhet.', effort: 'Liten',
  });

  if (psi?.metrics?.fcp != null) {
    push({
      id: 'fcp', category: 'mobile', source: 'measured', weight: 3, guide: 'prestanda',
      status: band(psi.metrics.fcp, 1800, 3000), value: sec(psi.metrics.fcp),
      title: `Första innehållet syns efter ${sec(psi.metrics.fcp)} på mobilnät`,
      detail: 'First Contentful Paint i Lighthouse mobiltest (emulerad mellanklasstelefon på 4G). 1,8 s eller snabbare räknas som bra.',
      fix: 'Minska det som laddas före första visningen: typsnitt, CSS och skript i <head>.',
      impact: 'Medel', impactText: 'Mobilbesökare ser direkt att något händer.', effort: 'Medel',
      cta: 'Få hjälp med prestanda och utveckling',
    });
  }
  for (const [id, label, fix] of [
    ['content-width', 'Innehållet ryms i mobilskärmen', 'Se till att inget element är bredare än skärmen, till exempel tabeller och bilder.'],
    ['tap-targets', 'Knappar och länkar går att träffa med tummen', 'Gör klickytor minst 44×44 px och ge dem luft emellan.'],
    ['font-size', 'Texten är läsbar utan att zooma', 'Använd minst 16 px brödtext på mobil.'],
  ]) {
    const a = psi?.audits?.[id];
    if (a && a.score != null) {
      push({
        id: `lh-${id}`, category: 'mobile', source: 'measured', weight: 3, guide: 'konvertering', service: 'hemsidor',
        status: a.score >= 0.9 ? 'pass' : a.score >= 0.5 ? 'warn' : 'fail',
        title: a.score >= 0.9 ? label : `Brist: ${a.title}`,
        detail: a.displayValue ? `Lighthouse: ${a.displayValue}` : 'Mätt i Lighthouse mobiltest.',
        fix, impact: 'Medel', impactText: 'Mobilbesökare kan använda sidan utan att kämpa.', effort: 'Medel',
        cta: 'Se hur Wimco skulle designa om sidan',
      });
    }
  }

  if (images.length >= 3) {
    const responsive = images.filter((i) => i.srcset || i.inPicture).length;
    const ratio = responsive / images.length;
    push({
      id: 'responsive-images', category: 'mobile', weight: 2, guide: 'prestanda',
      status: ratio >= 0.5 ? 'pass' : ratio > 0 ? 'warn' : 'warn', value: `${responsive}/${images.length}`,
      title: ratio >= 0.5 ? 'Bilderna anpassas efter skärmstorlek' : 'Mobilen laddar samma stora bilder som datorn',
      detail: `${responsive} av ${images.length} bilder har alternativa storlekar (srcset/picture).`,
      fix: 'Leverera flera bildstorlekar med srcset så att telefoner slipper ladda datorbilder.',
      impact: 'Medel', impactText: 'Snabbare och billigare laddning på mobilnät.', effort: 'Liten',
      cta: 'Få hjälp med prestanda och utveckling',
    });
  }

  const telLinks = parsed.anchors.filter((a) => /^tel:/i.test(a.href)).length;
  push({
    id: 'tap-to-call', category: 'mobile', weight: 2, guide: 'konvertering', service: 'hemsidor',
    status: telLinks > 0 ? 'pass' : 'warn',
    title: telLinks > 0 ? 'Telefonnumret går att ringa med ett tryck' : 'Inget klickbart telefonnummer',
    detail: telLinks > 0 ? 'Mobilbesökare kan ringa direkt från sidan.' : 'Vi hittade ingen tel:-länk. På mobilen måste besökaren då kopiera numret själv.',
    fix: 'Gör telefonnumret till en länk (<a href="tel:+46…">) i sidhuvud eller kontaktsektion.',
    impact: 'Låg', impactText: 'Lägre tröskel för att höra av sig.', effort: 'Liten',
    cta: 'Boka en genomgång av kundresan',
  });

  // ---------------- Tillgänglighet ----------------
  push({
    id: 'lang', category: 'accessibility', weight: 3, guide: 'tillganglighet',
    status: parsed.lang ? 'pass' : 'fail', value: parsed.lang || null,
    title: parsed.lang ? `Sidans språk är angivet (${parsed.lang})` : 'Sidans språk är inte angivet',
    detail: parsed.lang ? 'Skärmläsare vet vilket språk texten ska läsas upp på.' : 'Skärmläsare kan läsa svensk text med engelskt uttal.',
    fix: 'Lägg till lang="sv" på <html>-taggen.',
    impact: 'Medel', impactText: 'Begriplig uppläsning för skärmläsaranvändare.', effort: 'Liten',
  });

  if (images.length > 0) {
    const missing = images.filter((i) => i.alt === null && i.role !== 'presentation').length;
    push({
      id: 'alt-text', category: 'accessibility', weight: 4, guide: 'tillganglighet',
      status: missing === 0 ? 'pass' : missing / images.length <= 0.2 ? 'warn' : 'fail',
      value: `${images.length - missing}/${images.length}`,
      title: missing === 0 ? 'Alla bilder har alt-attribut' : `${missing} bilder saknar alt-text`,
      detail: missing === 0 ? 'Bilder beskrivs för skärmläsare och sökmotorer (tomt alt för dekorbilder räknas som rätt).' : 'Bilder utan alt-attribut är osynliga för skärmläsare och för Googles bildsök.',
      fix: 'Beskriv innehållsbärande bilder kort i alt-texten och ge dekorbilder alt="".',
      impact: 'Medel', impactText: 'Tillgänglighet och bildsök.', effort: 'Liten',
    });
  }

  if (parsed.inputs.length > 0) {
    const unlabeled = parsed.inputs.filter((i) => !i.wrapped && !i.ariaLabel && !(i.id && parsed.labelsFor.has(i.id))).length;
    push({
      id: 'form-labels', category: 'accessibility', weight: 4, guide: 'tillganglighet', service: 'hemsidor',
      status: unlabeled === 0 ? 'pass' : 'fail',
      value: `${parsed.inputs.length - unlabeled}/${parsed.inputs.length}`,
      title: unlabeled === 0 ? 'Formulärfälten har etiketter' : `${unlabeled} formulärfält saknar etikett`,
      detail: unlabeled === 0 ? 'Varje fält har en kopplad etikett.' : 'Fält som bara har platshållartext blir otydliga när man börjar skriva och går inte att förstå med skärmläsare.',
      fix: 'Koppla en synlig <label> till varje fält.',
      impact: 'Medel', impactText: 'Fler som faktiskt fyller i och skickar formuläret.', effort: 'Liten',
      cta: 'Boka en genomgång av kundresan',
    });
  }

  const emptyLinks = parsed.anchors.filter((a) => a.href && !a.text && !a.ariaLabel && !a.imgAlt).length;
  const emptyButtons = parsed.buttons.filter((b) => !b.text && !b.ariaLabel && !b.imgAlt).length;
  if (parsed.anchors.length + parsed.buttons.length > 0) {
    const n = emptyLinks + emptyButtons;
    push({
      id: 'control-names', category: 'accessibility', weight: 3, guide: 'tillganglighet',
      status: n === 0 ? 'pass' : n <= 2 ? 'warn' : 'fail', value: `${n} st`,
      title: n === 0 ? 'Länkar och knappar har begripliga namn' : `${n} länkar eller knappar saknar namn`,
      detail: n === 0 ? 'Alla klickbara element har text eller etikett.' : 'Ikonknappar utan etikett läses upp som ”länk” eller ”knapp” utan sammanhang.',
      fix: 'Ge ikonlänkar och ikonknappar en aria-label, t.ex. ”Öppna meny” eller ”Instagram”.',
      impact: 'Medel', impactText: 'Navigering fungerar för alla.', effort: 'Liten',
    });
  }

  const levels = parsed.headings.map((h) => h.level);
  let skips = 0;
  for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) skips++;
  if (levels.length > 1) push({
    id: 'heading-order', category: 'accessibility', weight: 2, guide: 'tillganglighet',
    status: skips === 0 ? 'pass' : skips <= 2 ? 'warn' : 'fail',
    title: skips === 0 ? 'Rubrikerna följer en logisk ordning' : 'Rubriknivåerna hoppar',
    detail: skips === 0 ? 'Rubrikstrukturen går att navigera med skärmläsare.' : `Rubrikerna hoppar över nivåer ${skips} gång${skips === 1 ? '' : 'er'} (t.ex. H2 → H4).`,
    fix: 'Använd rubriknivåer efter innehållets struktur – inte efter hur stora de ska se ut.',
    impact: 'Låg', impactText: 'Lättare att skumma för både människor och maskiner.', effort: 'Liten',
  });

  push({
    id: 'landmarks', category: 'accessibility', weight: 1, guide: 'tillganglighet',
    status: parsed.landmarks.main > 0 ? 'pass' : 'warn',
    title: parsed.landmarks.main > 0 ? 'Sidan har tydliga regioner' : 'Huvudinnehållet är inte markerat',
    detail: parsed.landmarks.main > 0 ? 'Skärmläsare kan hoppa direkt till huvudinnehållet.' : 'Utan <main> måste skärmläsaranvändare lyssna sig igenom menyn på varje sida.',
    fix: 'Omslut huvudinnehållet med <main> och menyer med <nav>.',
    impact: 'Låg', impactText: 'Snabbare navigering med tangentbord och skärmläsare.', effort: 'Liten',
  });

  for (const a of (psi?.failingA11y || []).slice(0, 3)) {
    push({
      id: `lh-a11y-${a.id}`, category: 'accessibility', source: 'measured', weight: 3, guide: 'tillganglighet',
      status: 'fail', title: a.title,
      detail: 'Hittat av Lighthouse tillgänglighetstest (axe-core).',
      fix: A11Y_FIX[a.id] || 'Åtgärda enligt Lighthouse-rapporten för respektive element.',
      impact: 'Medel', impactText: 'Fler kan läsa och använda sidan.', effort: 'Liten',
      cta: 'Se hur Wimco skulle designa om sidan', service: 'hemsidor',
    });
  }

  // ---------------- Visuell tydlighet (bedömning) ----------------
  const h1Words = h1s[0]?.text ? h1s[0].text.split(' ').filter(Boolean).length : 0;
  push({
    id: 'headline-clarity', category: 'visual', source: 'heuristic', weight: 4, guide: 'konvertering', service: 'hemsidor',
    status: h1Words === 0 ? 'fail' : h1Words <= 12 ? 'pass' : 'warn',
    value: h1Words ? `${h1Words} ord` : null,
    title: h1Words === 0 ? 'Inget tydligt huvudbudskap' : h1Words <= 12 ? 'Huvudbudskapet är kort och koncist' : 'Huvudbudskapet är långt',
    detail: h1Words === 0 ? 'Sidan saknar en huvudrubrik som säger vad ni erbjuder.' : 'Besökare bestämmer sig på några sekunder. Korta rubriker läses, långa skummas förbi.',
    fix: 'Formulera en rubrik på högst 8–10 ord som säger vad ni gör och för vem.',
    impact: 'Hög', impactText: 'Fler förstår direkt att de hamnat rätt.', effort: 'Liten',
    cta: 'Se hur Wimco skulle designa om sidan',
  });

  const h2 = levels.filter((l) => l === 2).length;
  const scannable = parsed.wordCount < 250 || h2 >= Math.min(3, Math.ceil(parsed.wordCount / 300));
  push({
    id: 'scannability', category: 'visual', source: 'heuristic', weight: 3, guide: 'konvertering', service: 'hemsidor',
    status: scannable ? 'pass' : 'warn', value: `${parsed.wordCount.toLocaleString('sv-SE')} ord · ${h2} H2`,
    title: scannable ? 'Innehållet är lätt att skumma' : 'Texten är svår att skumma',
    detail: scannable ? 'Mellanrubriker delar upp innehållet i tydliga avsnitt.' : `Sidan har ${parsed.wordCount.toLocaleString('sv-SE')} ord men bara ${h2} mellanrubriker.`,
    fix: 'Dela upp innehållet i tydliga avsnitt med beskrivande mellanrubriker och korta stycken.',
    impact: 'Medel', impactText: 'Besökare hittar det de letar efter.', effort: 'Liten',
    cta: 'Se hur Wimco skulle designa om sidan',
  });

  const dense = parsed.wordCount > 2500;
  push({
    id: 'text-density', category: 'visual', source: 'heuristic', weight: 2, guide: 'konvertering', service: 'hemsidor',
    status: dense ? 'warn' : 'pass',
    title: dense ? 'Startsidan är mycket textrik' : 'Lagom textmängd',
    detail: dense ? 'Mycket text på samma sida gör det svårt att se vad som är viktigast.' : 'Textmängden ger utrymme för ett tydligt budskap.',
    fix: 'Flytta fördjupning till undersidor och låt startsidan leda vidare.',
    impact: 'Låg', impactText: 'Tydligare prioritering.', effort: 'Medel',
    cta: 'Se hur Wimco skulle designa om sidan',
  });

  const fontFamilies = new Set();
  for (const l of parsed.links) {
    const href = l.href || '';
    const gf = /fonts\.googleapis\.com\/css2?\?([^"]+)/.exec(href);
    if (gf) for (const fam of gf[1].matchAll(/family=([^&:]+)/g)) fontFamilies.add(decodeURIComponent(fam[1]).replace(/\+/g, ' '));
  }
  const fontCount = fontFamilies.size + Math.min(parsed.fontFaces, 6) / 2;
  push({
    id: 'type-consistency', category: 'visual', source: 'heuristic', weight: 2, guide: 'konvertering', service: 'hemsidor',
    status: fontCount <= 3 ? 'pass' : 'warn',
    title: fontCount <= 3 ? 'Samlat typografiskt uttryck' : 'Många olika typsnitt laddas',
    detail: fontFamilies.size ? `Typsnitt från Google Fonts: ${[...fontFamilies].slice(0, 5).join(', ')}.` : 'Vi hittade få externa typsnitt.',
    fix: 'Begränsa er till ett eller två typsnitt med tydliga roller för rubrik och brödtext.',
    impact: 'Låg', impactText: 'Mer genomarbetat intryck och snabbare laddning.', effort: 'Liten',
    cta: 'Se hur Wimco skulle designa om sidan',
  });

  push({
    id: 'code-health', category: 'visual', source: 'heuristic', weight: 1, guide: 'kostnad', service: 'webbutveckling',
    status: parsed.inlineStyleCount > 80 ? 'warn' : 'pass', value: `${parsed.inlineStyleCount} st`,
    title: parsed.inlineStyleCount > 80 ? 'Utseendet styrs från många ställen' : 'Konsekvent styrd design',
    detail: parsed.inlineStyleCount > 80 ? `${parsed.inlineStyleCount} element har egna inline-stilar, vilket ofta ger spretig design och tungt underhåll.` : 'Utseendet verkar styras från gemensamma stilmallar.',
    fix: 'Samla färger, typsnitt och avstånd i ett designsystem så att sidan hänger ihop.',
    impact: 'Låg', impactText: 'Enklare att hålla sajten konsekvent.', effort: 'Medel',
    cta: 'Diskutera en modern webblösning',
  });

  const favicon = parsed.links.some((l) => /icon/i.test(l.rel || ''));
  push({
    id: 'favicon', category: 'visual', weight: 1, guide: 'seo', service: 'hemsidor',
    status: favicon ? 'pass' : 'warn',
    title: favicon ? 'Ikon för webbläsarflik finns' : 'Ikon för webbläsarflik saknas',
    detail: favicon ? 'Sajten känns igen bland öppna flikar och i Googles mobilresultat.' : 'Google visar favicon i mobilresultaten – utan den ser sajten ofullständig ut.',
    fix: 'Lägg till en favicon i SVG och PNG.',
    impact: 'Låg', impactText: 'Igenkänning och ett genomarbetat intryck.', effort: 'Liten',
  });

  // ---------------- Konverteringsförmåga (bedömning) ----------------
  const ctaEls = [...parsed.anchors, ...parsed.buttons].filter((e) => CTA_RE.test(`${e.text} ${e.ariaLabel || ''}`) || CONTACT_HREF_RE.test(e.href || ''));
  push({
    id: 'cta-present', category: 'conversion', source: 'heuristic', weight: 5, guide: 'konvertering', service: 'hemsidor',
    status: ctaEls.length === 0 ? 'fail' : 'pass', value: `${ctaEls.length} st`,
    title: ctaEls.length === 0 ? 'Ingen tydlig uppmaning att höra av sig' : 'Sidan har tydliga uppmaningar',
    detail: ctaEls.length ? `T.ex. ”${(ctaEls[0].text || ctaEls[0].ariaLabel || '').slice(0, 60)}”.` : 'Vi hittade inga knappar eller länkar som ber besökaren boka, kontakta eller köpa.',
    fix: 'Välj en huvudhandling (t.ex. ”Boka kostnadsfritt samtal”) och upprepa den på strategiska ställen.',
    impact: 'Hög', impactText: 'Besökare som inte vet vad nästa steg är lämnar.', effort: 'Liten',
    cta: 'Boka en genomgång av kundresan',
  });

  if (ctaEls.length) {
    const first = Math.min(...ctaEls.map((e) => e.textIndex));
    const early = first <= Math.max(120, parsed.wordCount * 0.15);
    push({
      id: 'cta-early', category: 'conversion', source: 'heuristic', weight: 3, guide: 'konvertering', service: 'hemsidor',
      status: early ? 'pass' : 'warn',
      title: early ? 'Uppmaningen syns tidigt' : 'Uppmaningen dyker upp sent',
      detail: early ? 'Första uppmaningen kommer i början av sidan.' : `Första uppmaningen kommer efter ungefär ${first.toLocaleString('sv-SE')} ord.`,
      fix: 'Placera huvudhandlingen i första skärmbilden, direkt under rubriken.',
      impact: 'Medel', impactText: 'Fler agerar medan intresset är som störst.', effort: 'Liten',
      cta: 'Boka en genomgång av kundresan',
    });
  }

  const mailto = parsed.anchors.filter((a) => /^mailto:/i.test(a.href)).length;
  const contactPage = parsed.anchors.some((a) => CONTACT_HREF_RE.test(a.href));
  push({
    id: 'contact-paths', category: 'conversion', source: 'rules', weight: 3, guide: 'konvertering', service: 'hemsidor',
    status: telLinks + mailto > 0 || parsed.forms > 0 || contactPage ? 'pass' : 'fail',
    title: telLinks + mailto > 0 || parsed.forms > 0 || contactPage ? 'Det finns vägar att ta kontakt' : 'Svårt att hitta hur man tar kontakt',
    detail: `Telefonlänkar: ${telLinks}, e-postlänkar: ${mailto}, formulär: ${parsed.forms}${contactPage ? ', kontaktsida länkad' : ''}.`,
    fix: 'Visa telefon, e-post och ett kort formulär – helst både i sidhuvud och sidfot.',
    impact: 'Hög', impactText: 'Varje hinder kostar förfrågningar.', effort: 'Liten',
    cta: 'Boka en genomgång av kundresan',
  });

  const manual = parsed.forms === 0 && mailto > 0;
  push({
    id: 'lead-flow', category: 'conversion', source: 'heuristic', weight: 2, guide: 'automation', service: 'automation',
    status: manual ? 'warn' : parsed.forms > 0 ? 'pass' : 'info',
    title: manual ? 'Förfrågningar verkar hanteras manuellt via e-post' : parsed.forms > 0 ? 'Förfrågningar tas emot via formulär' : 'Inget formulär för förfrågningar',
    detail: manual ? 'Utan formulär hamnar förfrågningar i inkorgen utan struktur, bekräftelse eller uppföljning.' : parsed.forms > 0 ? 'Ett formulär kan kopplas vidare till CRM, bekräftelsemejl och påminnelser.' : 'Vi ser inga formulär på sidan.',
    fix: 'Samla förfrågningar i ett formulär som automatiskt bekräftar, sorterar och påminner om uppföljning.',
    impact: 'Medel', impactText: 'Snabbare svar och inga tappade leads.', effort: 'Medel',
    cta: 'Automatisera leadhanteringen',
  });

  const tooManyFields = parsed.inputs.length > 8 && parsed.forms <= 2;
  if (parsed.forms > 0) push({
    id: 'form-friction', category: 'conversion', source: 'heuristic', weight: 2, guide: 'konvertering', service: 'hemsidor',
    status: tooManyFields ? 'warn' : 'pass', value: `${parsed.inputs.length} fält`,
    title: tooManyFields ? 'Formulären har många fält' : 'Formulären är korta',
    detail: tooManyFields ? 'Varje extra fält minskar sannolikheten att formuläret skickas.' : 'Få fält gör det lätt att höra av sig.',
    fix: 'Fråga bara efter det ni behöver för att svara – resten kan tas i samtalet.',
    impact: 'Medel', impactText: 'Fler skickade förfrågningar.', effort: 'Liten',
    cta: 'Boka en genomgång av kundresan',
  });

  const fullText = parsed.textChunks.join(' ');
  const trust = [];
  if (/\b\d{6}-\d{4}\b/.test(fullText)) trust.push('organisationsnummer');
  if (/\b\d{3}\s?\d{2}\s+[A-ZÅÄÖ][a-zåäö]+/.test(fullText)) trust.push('adress');
  if (/(omdöme|recension|kundcase|referens|kunder säger|betyg|stjärnor|review|testimonial)/i.test(fullText)) trust.push('omdömen/referenser');
  if (/(certifierad|auktoriserad|medlem i|garanti|behörig)/i.test(fullText)) trust.push('certifiering/garanti');
  push({
    id: 'trust', category: 'conversion', source: 'heuristic', weight: 2, guide: 'konvertering', service: 'hemsidor',
    status: trust.length >= 2 ? 'pass' : trust.length === 1 ? 'warn' : 'fail',
    title: trust.length >= 2 ? 'Sidan visar förtroendesignaler' : 'Få förtroendesignaler',
    detail: trust.length ? `Vi hittade: ${trust.join(', ')}.` : 'Vi hittade inga omdömen, organisationsnummer, adress eller certifieringar i texten.',
    fix: 'Visa riktiga kundomdömen, organisationsnummer, adress och eventuella certifieringar nära kontaktvägarna.',
    impact: 'Medel', impactText: 'Nya besökare vågar ta kontakt.', effort: 'Liten',
    cta: 'Boka en genomgång av kundresan',
  });

  const hasAnalytics = parsed.scripts.some((s) => ANALYTICS_RE.test(s.src || ''));
  push({
    id: 'analytics', category: 'conversion', source: 'rules', weight: 2, guide: 'automation', service: 'automation',
    status: hasAnalytics ? 'pass' : 'warn',
    title: hasAnalytics ? 'Besök mäts' : 'Ingen besöksmätning hittades',
    detail: hasAnalytics ? 'Sidan laddar ett analysverktyg, så ni kan följa vad som fungerar.' : 'Vi hittade inget känt analysverktyg i sidans kod (det kan laddas via samtyckesverktyg eller server).',
    fix: 'Mät åtminstone besök, klick på kontaktvägar och skickade formulär – med samtycke enligt GDPR.',
    impact: 'Låg', impactText: 'Beslut baserade på data i stället för magkänsla.', effort: 'Liten',
    cta: 'Hitta vad vi kan automatisera',
  });

  return checks;
}

const A11Y_FIX = {
  'color-contrast': 'Öka kontrasten mellan text och bakgrund till minst 4,5:1 för brödtext.',
  'image-alt': 'Ge alla innehållsbärande bilder en kort, beskrivande alt-text.',
  'link-name': 'Ge länkar en begriplig text eller aria-label.',
  'button-name': 'Ge alla knappar en synlig text eller aria-label.',
  label: 'Koppla en synlig etikett till varje formulärfält.',
  'html-has-lang': 'Lägg till lang="sv" på <html>.',
  'heading-order': 'Använd rubriknivåer i logisk ordning.',
  'meta-viewport': 'Tillåt zoom genom att ta bort user-scalable=no.',
  'target-size': 'Gör klickytor minst 24×24 px, helst 44×44 px.',
  'link-in-text-block': 'Gör länkar i löptext urskiljbara med mer än bara färg, t.ex. understrykning.',
  'aria-allowed-attr': 'Rätta ARIA-attributen så att de matchar elementens roller.',
  'document-title': 'Ge sidan en beskrivande titel.',
  'frame-title': 'Ge inbäddade iframes en title som beskriver innehållet.',
  'duplicate-id-aria': 'Se till att id-värden som används av ARIA är unika.',
  'list': 'Använd <ul>/<ol> med <li> direkt under.',
  'listitem': 'Placera <li> inuti <ul> eller <ol>.',
};
