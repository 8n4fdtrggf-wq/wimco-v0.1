#!/usr/bin/env node
// Genererar undersidor med gemensam header/footer från public/index.html.
// Kör: node tools/build-pages.mjs  (skriver till public/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const SITE = 'https://wimco.se';
const TODAY = '2026-09-30';

const index = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
const HEADER = index.slice(index.indexOf('<a class="skip"'), index.indexOf('<main id="main">'));
const FOOTER = index.slice(index.indexOf('<footer class="site-footer">'), index.indexOf('</body>'));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function page({ file, title, description, canonical, robots = 'index, follow', ogType = 'website', ogImage = `${SITE}/assets/og-default.png`, scripts = [], jsonLd = null, body, slots = false }) {
  const slot = (name) => (slots ? ` data-slot="${name}"` : '');
  const html = `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title${slot('title')}>${esc(title)}</title>
<meta name="description" content="${esc(description)}"${slot('description')}>
<meta name="robots" content="${robots}"${slot('robots')}>
${canonical ? `<link rel="canonical" href="${canonical}"${slot('canonical')}>` : ''}
<meta name="theme-color" content="#F3F5F4">
<meta name="color-scheme" content="light">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="Wimco">
<meta property="og:locale" content="sv_SE">
<meta property="og:title" content="${esc(title)}"${slot('og-title')}>
<meta property="og:description" content="${esc(description)}"${slot('og-description')}>
${canonical ? `<meta property="og:url" content="${canonical}"${slot('og-url')}>` : `<meta property="og:url" content="${SITE}/"${slot('og-url')}>`}
<meta property="og:image" content="${ogImage}"${slot('og-image')}>
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}"${slot('twitter-image')}>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/archivo-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css">
<script type="module" src="/assets/js/site.js"></script>
${scripts.map((s) => `<script type="module" src="${s}"></script>`).join('\n')}
${jsonLd ? `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>` : ''}
</head>
<body>
${HEADER}<main id="main">
${body}
</main>

${FOOTER}</body>
</html>
`.replace(/\n{3,}/g, '\n\n');
  const out = path.join(PUB, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  return out;
}

const cta = (text, sub) => `<aside class="callout">
  <h2 class="h-md">${text}</h2>
  <p>${sub}</p>
  <p><a class="btn btn-signal" href="/#analys">Analysera min webbplats</a></p>
</aside>`;

const aside = (badge, line, text, btn, href) => `<aside class="guide-aside" aria-label="Hjälp från Wimco">
  <p class="aside-line"><span class="badge badge-${badge}" aria-hidden="true">${line}</span> ${({ O: 'Optimering', H: 'Hemsidor', W: 'Webbutveckling', A: 'AI och automation' })[line]}</p>
  <p>${text}</p>
  <a class="btn btn-ink" href="${href}">${btn}</a>
  <a class="link-arrow" href="/#analys">Gratis analys av din sajt</a>
</aside>`;

function article({ slug, file, title, h1, description, lead, updated = TODAY, body, badge, line, asideText, asideBtn, asideHref }) {
  const canonical = `${SITE}${slug}`;
  return page({
    file, title: `${title} | Wimco`, description, canonical, ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'Article', headline: h1, description,
      datePublished: updated, dateModified: updated, inLanguage: 'sv-SE',
      author: { '@type': 'Person', name: 'Willem' },
      publisher: { '@type': 'Organization', name: 'Wimco', url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}/assets/favicon.svg` } },
      mainEntityOfPage: canonical,
    },
    body: `<div class="wrap">
  <header class="page-head">
    <p class="crumbs"><a href="/">Wimco</a> <span aria-hidden="true">/</span> <a href="/guider/">Guider</a></p>
    <h1 class="display">${h1}</h1>
    <p class="lead">${lead}</p>
    <p class="crumbs">Uppdaterad <time datetime="${updated}">${new Date(updated).toLocaleDateString('sv-SE', { dateStyle: 'long' })}</time> · Willem, Wimco</p>
  </header>
  <div class="guide-layout">
    <article class="prose">
${body}
    </article>
    ${aside(badge, line, asideText, asideBtn, asideHref)}
  </div>
</div>`,
  });
}

/* ---------------- Guider ---------------- */
const GUIDES = [
  {
    slug: '/guider/prestanda/', file: 'guider/prestanda/index.html', badge: 'o', line: 'O',
    title: 'Snabbare webbplats: Core Web Vitals på svenska',
    h1: 'Snabbare webbplats: Core Web Vitals på svenska',
    description: 'Vad LCP, INP och CLS betyder, vilka gränsvärden Google använder och vad som oftast gör en företagssajt långsam – med en åtgärdslista i prioritetsordning.',
    lead: 'Tre mått avgör om Google och dina besökare upplever sajten som snabb. Här är vad de betyder och vad du gör åt dem.',
    asideText: 'Vill du att någon annan tar hand om hastigheten? Wimco optimerar befintliga sajter och bygger nya som är snabba från start.',
    asideBtn: 'Få hjälp med prestanda', asideHref: '/#starta',
    body: `<p>En långsam sida kostar på två sätt. Besökare som väntar lämnar innan de sett ditt erbjudande, och Google använder laddupplevelsen som en av signalerna när sidor rankas. Den goda nyheten är att de vanligaste problemen går att åtgärda utan att bygga om allt.</p>
<h2>De tre måtten</h2>
<table>
<thead><tr><th scope="col">Mått</th><th scope="col">Vad det mäter</th><th scope="col">Bra enligt Google</th></tr></thead>
<tbody>
<tr><td><strong>LCP</strong> – Largest Contentful Paint</td><td>När sidans största synliga innehåll, ofta en bild eller rubrik, har laddats.</td><td>2,5 sekunder eller snabbare</td></tr>
<tr><td><strong>INP</strong> – Interaction to Next Paint</td><td>Hur snabbt sidan reagerar när någon klickar, trycker eller skriver.</td><td>200 millisekunder eller snabbare</td></tr>
<tr><td><strong>CLS</strong> – Cumulative Layout Shift</td><td>Hur mycket innehållet hoppar medan sidan laddar.</td><td>0,1 eller lägre</td></tr>
</tbody>
</table>
<p>Google bedömer värdena för 75 procent av besöken. Det räcker alltså inte att sidan är snabb på din egen dator med fiber – den ska vara snabb för de flesta, även på mobilnät.</p>
<h2>Labbdata och riktiga besökare</h2>
<p>Verktyg som Lighthouse och PageSpeed Insights testar sidan i en kontrollerad miljö: en emulerad mellanklasstelefon på ett begränsat mobilnät. Det kallas labbdata och är perfekt för att hitta orsaker. Om din sajt har tillräckligt många besökare visar PageSpeed Insights också fältdata från Chrome-användare, och det är de siffrorna Google använder i sökrankningen.</p>
<p>INP kräver riktiga interaktioner och kan inte mätas i labbet. Där används i stället <em>Total Blocking Time</em> (TBT) som en indikator: hur länge tunga skript blockerar sidan.</p>
<h2>Det här gör oftast en sajt långsam</h2>
<ul>
<li><strong>Stora bilder.</strong> En bild från mobilkameran kan väga flera megabyte. Skala ned, konvertera till WebP eller AVIF och låt bilder längre ned på sidan laddas först när de behövs.</li>
<li><strong>Tredjepartsskript.</strong> Chattwidgetar, spårningspixlar, sliders och inbäddade flöden laddar ofta mer kod än resten av sidan tillsammans.</li>
<li><strong>Många typsnitt.</strong> Varje typsnitt och vikt är en egen fil. Två familjer räcker nästan alltid.</li>
<li><strong>Långsam server.</strong> Om servern tar mer än en knapp sekund innan den svarar hjälper ingen optimering längre fram. Billiga webbhotell och tunga plugin är vanliga orsaker.</li>
<li><strong>Innehåll utan reserverad plats.</strong> Bilder utan angiven bredd och höjd, sena cookiebanners och annonser får innehållet att hoppa.</li>
</ul>
<h2>Åtgärder i prioritetsordning</h2>
<ol>
<li>Mät startsidan och din viktigaste undersida i PageSpeed Insights eller <a href="/#analys">Wimco Score</a>.</li>
<li>Optimera den bild som är ditt LCP-element – oftast hero-bilden. Rätt storlek, modernt format och ingen lazy loading på just den.</li>
<li>Gå igenom tredjepartsskripten. Ta bort det som inte används och ladda resten med <code>defer</code> eller först efter samtycke.</li>
<li>Ange <code>width</code> och <code>height</code> på bilder och reservera plats för det som laddas sent.</li>
<li>Se över hosting och cache om serverns svarstid är hög.</li>
<li>Mät igen och jämför. Följ fältdatan i Google Search Console över tid.</li>
</ol>
${cta('Hur snabb är din sajt?', 'Wimco Score mäter med Google Lighthouse och visar vad som bromsar mest – gratis och utan registrering.')}`,
  },
  {
    slug: '/guider/seo-grund/', file: 'guider/seo-grund/index.html', badge: 'o', line: 'O',
    title: 'SEO-grunden varje företagssajt behöver',
    h1: 'SEO-grunden varje företagssajt behöver',
    description: 'Den tekniska och innehållsmässiga grunden för att synas i Google: HTTPS, indexering, titlar, metabeskrivningar, rubriker, strukturerad data och lokal synlighet.',
    lead: 'Innan det är lönt att jaga placeringar måste grunden sitta. Det här är checklistan vi själva går igenom på varje sajt.',
    asideText: 'Wimco bygger sajter med SEO-grunden på plats från dag ett och hjälper befintliga sajter att komma ikapp.',
    asideBtn: 'Prata SEO med Wimco', asideHref: '/#starta',
    body: `<h2>1. Låt Google komma åt sajten</h2>
<ul>
<li><strong>HTTPS överallt.</strong> Utan säker anslutning varnar webbläsaren besökarna, och Google föredrar säkra sidor.</li>
<li><strong>Inga kvarglömda spärrar.</strong> En <code>noindex</code>-tagg från utvecklingen kan göra sidan osynlig i sökresultaten. Kontrollera även att robots.txt inte blockerar viktiga delar.</li>
<li><strong>Sitemap.</strong> En sitemap.xml listar sajtens sidor. Länka den från robots.txt och skicka in den i Google Search Console.</li>
<li><strong>Kanonisk adress.</strong> Samma sida kan nås med och utan www eller med parametrar. <code>rel="canonical"</code> talar om vilken som är originalet.</li>
</ul>
<h2>2. Berätta vad varje sida handlar om</h2>
<ul>
<li><strong>Sidtitel.</strong> Den blå rubriken i sökresultatet. Unik för varje sida, cirka 30–60 tecken, med vad ni gör och gärna var: <em>Elektriker i Uppsala | Företagsnamn</em>.</li>
<li><strong>Metabeskrivning.</strong> Texten under titeln. Den påverkar inte placeringen direkt, men avgör om folk klickar. Skriv 120–160 tecken som säger vad besökaren får.</li>
<li><strong>En tydlig H1.</strong> Varje sida ska ha en huvudrubrik som beskriver innehållet. Övriga rubriker blir H2 och H3 i logisk ordning.</li>
<li><strong>Beskrivande länktexter.</strong> ”Läs om våra badrumsrenoveringar” säger mer än ”klicka här”.</li>
</ul>
<h2>3. Gör det lätt att förstå företaget</h2>
<p>Strukturerad data i formatet JSON-LD beskriver företaget på ett sätt maskiner förstår: namn, adress, telefon, öppettider och tjänster. För lokala företag är typen <code>LocalBusiness</code> ett bra val. Komplettera med en uppdaterad Google Business Profile – för många lokala sökningar är den viktigare än själva sajten.</p>
<h2>4. Skriv för dem som söker</h2>
<p>Teknik gör sajten sökbar, men det är innehållet som gör den relevant. Svara på de frågor kunderna faktiskt ställer: vad det kostar, hur lång tid det tar, vilka områden ni täcker. En sida per huvudtjänst slår en lång sida med allt.</p>
<h2>5. Mät och följ upp</h2>
<p>Google Search Console är gratis och visar vilka sökningar som ger visningar och klick, vilka sidor som är indexerade och om något är fel. Koppla på det från början.</p>
${cta('Hur ser din SEO-grund ut?', 'Wimco Score kontrollerar titlar, metadata, indexering, sitemap och strukturerad data automatiskt.')}`,
  },
  {
    slug: '/guider/tillganglighet/', file: 'guider/tillganglighet/index.html', badge: 'h', line: 'H',
    title: 'Tillgänglighet som gör sajten bättre för alla',
    h1: 'Tillgänglighet som gör sajten bättre för alla',
    description: 'Vad webbtillgänglighet innebär, vad lagen säger, och de åtgärder som gör störst skillnad: kontrast, alt-texter, etiketter, tangentbord och zoom.',
    lead: 'En tillgänglig sajt fungerar för fler människor – och nästan alltid bättre för alla andra också.',
    asideText: 'Wimco designar och utvecklar enligt WCAG 2.1 AA och kan granska och åtgärda befintliga sajter.',
    asideBtn: 'Få hjälp med tillgänglighet', asideHref: '/#starta',
    body: `<p>Tillgänglighet handlar om att personer med olika förutsättningar ska kunna läsa och använda sajten: den som ser dåligt, använder skärmläsare, navigerar med tangentbord, har en tillfälligt skadad arm eller bara läser på en mobil i starkt solljus.</p>
<h2>Vad säger lagen?</h2>
<p>Offentlig sektor har sedan länge krav på digital tillgänglighet. Sedan den 28 juni 2025 gäller dessutom lagen om vissa produkters och tjänsters tillgänglighet, den svenska versionen av EU:s tillgänglighetsdirektiv. Den omfattar bland annat e-handel riktad till konsumenter. Mikroföretag som tillhandahåller tjänster är undantagna, men kraven är ändå en bra måttstock. Kontrollera vad som gäller för just er verksamhet.</p>
<p>Den vanliga standarden att följa är WCAG 2.1 på nivå AA.</p>
<h2>Åtgärderna som gör störst skillnad</h2>
<ul>
<li><strong>Kontrast.</strong> Brödtext behöver en kontrast på minst 4,5:1 mot bakgrunden. Ljusgrå text på vit bakgrund är det vanligaste felet.</li>
<li><strong>Alt-texter.</strong> Beskriv innehållsbärande bilder kort. Dekorativa bilder får ett tomt <code>alt=""</code> så att skärmläsare hoppar över dem.</li>
<li><strong>Etiketter på formulär.</strong> Varje fält behöver en synlig etikett. Platshållartext försvinner när man börjar skriva och räcker inte.</li>
<li><strong>Tangentbord.</strong> Allt som går att klicka på ska gå att nå med Tab och använda med Enter eller mellanslag – med ett tydligt synligt fokus.</li>
<li><strong>Språk.</strong> Ange <code>lang="sv"</code> så att skärmläsare använder svenskt uttal.</li>
<li><strong>Zoom.</strong> Stäng aldrig av möjligheten att zooma på mobilen.</li>
<li><strong>Begripliga länkar och knappar.</strong> Ikonknappar behöver en etikett, till exempel ”Öppna meny”.</li>
</ul>
<h2>Testa själv på fem minuter</h2>
<ol>
<li>Lägg undan musen och ta dig igenom startsidan och kontaktformuläret med bara tangentbordet.</li>
<li>Zooma till 200 procent i webbläsaren. Går allt fortfarande att läsa utan att scrolla i sidled?</li>
<li>Slå på skärmläsaren (VoiceOver på Mac och iPhone, NVDA på Windows) och lyssna på startsidan.</li>
<li>Kör en automatisk kontroll med Lighthouse eller <a href="/#analys">Wimco Score</a>. Automatiska verktyg hittar ungefär de tekniska felen – resten kräver en människa.</li>
</ol>
${cta('Hur tillgänglig är din sajt?', 'Wimco Score kör tillgänglighetstester från Lighthouse och egna kontroller av språk, alt-texter och formulär.')}`,
  },
  {
    slug: '/guider/konvertering/', file: 'guider/konvertering/index.html', badge: 'h', line: 'H',
    title: 'Från besökare till förfrågan: UX som konverterar',
    h1: 'Från besökare till förfrågan: UX som konverterar',
    description: 'Så gör du det tydligt vad du erbjuder, för vem och vad nästa steg är – med en tydlig huvudhandling, förtroendesignaler och färre hinder.',
    lead: 'Den billigaste förbättringen är ofta inte mer trafik, utan att fler av dem som redan kommer hör av sig.',
    asideText: 'Wimco designar om sidor och kundresor så att fler besökare blir förfrågningar – och mäter att det faktiskt fungerar.',
    asideBtn: 'Boka en genomgång av kundresan', asideHref: '/#starta',
    body: `<h2>Femsekunderstestet</h2>
<p>Visa startsidan för någon som aldrig sett den i fem sekunder och fråga sedan: Vad gör företaget? För vem? Vad ska jag göra härnäst? Kan de inte svara på alla tre har sidan ett tydlighetsproblem, oavsett hur snygg den är.</p>
<h2>En huvudhandling</h2>
<p>Bestäm vad den viktigaste handlingen är – boka samtal, begär offert, ring – och gör den till sidans tydligaste knapp. Placera den direkt under huvudrubriken och upprepa den där besökaren naturligt är redo, till exempel efter tjänstebeskrivningar och i sidfoten.</p>
<ul>
<li>Knapptexten ska säga vad som händer: <em>Boka kostnadsfritt samtal</em> säger mer än <em>Skicka</em>.</li>
<li>Konkurrerande knappar med samma vikt gör valet svårare. Välj en huvudväg och gör resten sekundära.</li>
</ul>
<h2>Förtroende</h2>
<p>Nya besökare vet inte om du är att lita på. Hjälp dem med riktiga bevis: kundomdömen med namn och företag, exempel på tidigare arbeten, organisationsnummer och adress, certifieringar och garantier. Hitta aldrig på omdömen – det skadar mer än det hjälper när det upptäcks.</p>
<h2>Ta bort hinder</h2>
<ul>
<li><strong>Korta formulär.</strong> Fråga bara efter det du behöver för att svara. Resten tar ni i samtalet.</li>
<li><strong>Klickbart telefonnummer.</strong> På mobilen ska ett tryck räcka för att ringa.</li>
<li><strong>Snabbt svar.</strong> En automatisk bekräftelse med nästa steg gör att förfrågan känns mottagen även en söndagskväll.</li>
</ul>
<h2>Mät innan du ändrar</h2>
<p>Räkna förfrågningar, samtal och klick på kontaktvägar – med samtycke enligt GDPR. Ändra en sak i taget och jämför. Utan mätning är det lätt att förväxla en känsla med en förbättring.</p>
${cta('Hur tydlig är din sajt?', 'Wimco Score bedömer huvudbudskap, uppmaningar, kontaktvägar och förtroendesignaler – och visar vad du kan förbättra först.')}`,
  },
  {
    slug: '/guider/automatisera-leads/', file: 'guider/automatisera-leads/index.html', badge: 'a', line: 'A',
    title: 'Automatisera leadhanteringen utan krångel',
    h1: 'Automatisera leadhanteringen utan krångel',
    description: 'Ett praktiskt upplägg för att ta emot, sortera, bekräfta och följa upp förfrågningar automatiskt – och var AI faktiskt gör nytta.',
    lead: 'Förfrågningar som hamnar i en inkorg och besvaras när någon hinner är tappade affärer. Så här bygger du ett flöde som sköter sig självt.',
    asideText: 'Wimco kartlägger hur förfrågningar hanteras i dag och bygger flöden som kopplar ihop verktygen du redan har.',
    asideBtn: 'Hitta vad vi kan automatisera', asideHref: '/#starta',
    body: `<h2>Problemet</h2>
<p>I många små företag ser det ut så här: formuläret skickar ett mejl till en gemensam inkorg, någon läser det när det finns tid, kopierar uppgifterna till ett kalkylark eller CRM och svarar – om det inte glöms bort. Varje manuellt steg är en risk och ett tidstjuv.</p>
<h2>Ett enkelt flöde att börja med</h2>
<ol>
<li><strong>Formulär med struktur.</strong> Fråga efter det du behöver för att sortera: vilken tjänst, ungefärlig tidsram, kontaktuppgifter.</li>
<li><strong>Automatisk registrering.</strong> Förfrågan sparas direkt i ert CRM eller kalkylark, märkt med tjänst och källa.</li>
<li><strong>Direkt bekräftelse.</strong> Kunden får ett mejl med vad som händer nu och gärna en länk för att boka tid.</li>
<li><strong>Rätt person får en notis.</strong> Med det viktigaste först, i den kanal ni redan använder.</li>
<li><strong>Påminnelse.</strong> Har ingen följt upp inom en viss tid kommer en påminnelse.</li>
</ol>
<p>Flödet går att bygga med verktyg ni kanske redan har – till exempel ett CRM som HubSpot eller Pipedrive tillsammans med en automationsplattform som Zapier, Make eller n8n – eller specialbyggt när behoven är mer speciella.</p>
<h2>Var AI gör nytta</h2>
<ul>
<li>Sammanfatta långa förfrågningar till tre rader.</li>
<li>Sortera efter tjänst och brådska.</li>
<li>Föreslå ett första svar som en människa granskar och skickar.</li>
<li>Svara på vanliga frågor dygnet runt – och lämna över till en människa när det behövs.</li>
</ul>
<p>Låt AI förbereda, men låt en människa äga kundrelationen.</p>
<h2>Tänk på GDPR</h2>
<p>Spara bara de uppgifter ni behöver, berätta i formuläret vad de används till, bestäm hur länge de sparas och se till att tjänsterna ni kopplar ihop har personuppgiftsbiträdesavtal.</p>
<h2>Kom igång</h2>
<p>Rita upp hur en förfrågan tas om hand i dag, steg för steg. Välj det steg som tar mest tid eller oftast glöms bort och automatisera det först. Ett fungerande flöde slår en perfekt plan.</p>
${cta('Hur tas dina förfrågningar emot?', 'Wimco Score visar om din sajt har formulär, kontaktvägar och mätning – och var en automation kan göra skillnad.')}`,
  },
];

for (const g of GUIDES) article(g);

/* ---------------- Befintlig guide, ny design (innehållet bevarat) ---------------- */
article({
  slug: '/blogg/hur-mycket-kostar-en-hemsida.html', file: 'blogg/hur-mycket-kostar-en-hemsida.html', badge: 'h', line: 'H',
  title: 'Hur mycket kostar en hemsida för småföretag 2026?',
  h1: 'Hur mycket kostar en hemsida för småföretag 2026?',
  description: 'Enkel genomgång av vad en hemsida kostar 2026: prisnivåer, dolda kostnader och 5 frågor att ställa innan du skriver avtal. Guide för småföretagare.',
  lead: 'Korta svaret: allt från 0 kr till över 100 000 kr. Det ärliga svaret: för de flesta småföretag landar en seriös hemsida på <strong>10 000–50 000 kr</strong> engångskostnad, plus <strong>1 000–3 000 kr/år</strong> i drift. Här är vad som styr priset – och var du inte bör spara.',
  updated: '2026-09-29',
  asideText: 'Osäker på vad du behöver? Boka en kostnadsfri genomgång på 20 minuter – du får ett ärligt svar, även om det är ”behåll den du har”.',
  asideBtn: 'Boka kostnadsfritt samtal', asideHref: '/#starta',
  body: `<h2>Snabbsvaret: tre prisnivåer</h2>
<ul>
<li><strong>Enkel landningssida (1 sida): 5 000–15 000 kr.</strong> Räcker för dig som behöver ett tydligt ”visitkort” med bokningsformulär.</li>
<li><strong>Företagshemsida (3–7 sidor): 15 000–50 000 kr.</strong> Start, tjänster, om oss, kontakt – inklusive grund-SEO.</li>
<li><strong>E-handel eller större sajt: 40 000–100 000+ kr.</strong> Produkter, betalningar, integrationer.</li>
</ul>
<h2>Vad är det du egentligen betalar för?</h2>
<p>Inte bara ”en webb”. En seriös leverans innehåller:</p>
<ul>
<li><strong>Budskap och text:</strong> det som får besökaren att faktiskt kontakta dig.</li>
<li><strong>Design och teknik:</strong> snabb, mobilanpassad, säker.</li>
<li><strong>SEO-grund:</strong> titlar, metabeskrivningar, strukturerad data, sitemap, Google Business Profile.</li>
<li><strong>Support:</strong> någon att ringa när något krånglar.</li>
</ul>
<h2>Dolda kostnader ingen nämner</h2>
<ul>
<li><strong>Domän:</strong> 100–300 kr/år</li>
<li><strong>Hosting:</strong> 500–3 000 kr/år</li>
<li><strong>Underhåll och uppdateringar:</strong> löpande eller vid behov</li>
<li><strong>Innehåll och SEO:</strong> det som faktiskt skapar trafiken</li>
</ul>
<h2>Billigt kan bli dyrt</h2>
<p>En sajt för 3 000 kr som ingen hittar till ger <strong>noll kunder</strong>. En sajt för 25 000 kr som rankar på Google och konverterar besökare är betald efter två kunder. Frågan är alltså inte ”vad kostar en hemsida” – utan <strong>”vad ska den tjäna in?”</strong>.</p>
<h2>5 frågor att ställa innan du skriver avtal</h2>
<ol>
<li>Vem äger domänen och kontot hos webbhotellet?</li>
<li>Ingår grund-SEO (titlar, meta, schema, sitemap)?</li>
<li>Vad händer efter lansering – ingår support?</li>
<li>Vem skriver texterna?</li>
<li>Hur mäter vi att sajten fungerar (analytics, formulär, samtal)?</li>
</ol>
<h2>Sammanfattning</h2>
<p>En hemsida är inte en kostnad – det är säljaren som jobbar dygnet runt. Budgetera för helheten: bygge + drift + löpande förbättring.</p>
${cta('Vad behöver din nuvarande sajt?', 'Börja med en gratis analys. Den visar om det räcker att vässa det du har – eller om det är dags för något nytt.')}`,
});

/* ---------------- Guideindex ---------------- */
const allGuides = [
  ...GUIDES.map((g) => ({ href: g.slug, title: g.h1, text: g.description, badge: g.badge, line: g.line })),
  { href: '/blogg/hur-mycket-kostar-en-hemsida.html', title: 'Hur mycket kostar en hemsida för småföretag 2026?', text: 'Prisnivåer, dolda kostnader och fem frågor att ställa innan du skriver avtal.', badge: 'h', line: 'H' },
];
page({
  file: 'guider/index.html', title: 'Guider om hemsidor, prestanda, SEO, UX och automation | Wimco',
  description: 'Praktiska guider för företagare: snabbare sajt, SEO-grund, tillgänglighet, konvertering, automation och vad en hemsida kostar.',
  canonical: `${SITE}/guider/`,
  body: `<div class="wrap">
  <header class="page-head">
    <p class="crumbs"><a href="/">Wimco</a></p>
    <h1 class="display">Guider</h1>
    <p class="lead">Konkreta genomgångar av det som gör en sajt snabb, synlig, tydlig och lättskött. Skrivna för dig som driver företag, inte för utvecklare.</p>
  </header>
  <ul class="guide-list">
${allGuides.map((g) => `    <li><a href="${g.href}"><span class="badge badge-${g.badge}" aria-hidden="true">${g.line}</span><h2>${g.title}</h2><p>${g.text}</p></a></li>`).join('\n')}
  </ul>
</div>`,
});

/* ---------------- Wimco Score: metod ---------------- */
page({
  file: 'wimco-score/index.html', title: 'Wimco Score – så analyserar och poängsätter vi din webbplats | Wimco',
  description: 'Så fungerar Wimco Score: sex kategorier, vilka källor som används, hur poängen viktas och prioriteras, och hur analysen skyddas mot missbruk.',
  canonical: `${SITE}/wimco-score/`,
  body: `<div class="wrap">
  <header class="page-head">
    <p class="crumbs"><a href="/">Wimco</a></p>
    <h1 class="display">Så fungerar Wimco Score</h1>
    <p class="lead">En gratis analys som ger ett betyg mellan 0 och 100 – och visar exakt var varje siffra kommer ifrån.</p>
    <p><a class="btn btn-signal" href="/#analys">Analysera min webbplats</a></p>
  </header>
  <div class="guide-layout">
    <article class="prose">
      <h2>Tre sorters källor</h2>
      <ul>
        <li><strong>Uppmätt</strong> – värden från Google Lighthouse via PageSpeed Insights: laddtider, layoutskift, blockeringstid och automatiska tester av tillgänglighet, SEO och bästa praxis. Testet körs som en mellanklasstelefon på mobilnät. Har sajten tillräckligt med trafik visas även riktiga besökares upplevelse från Chrome UX Report.</li>
        <li><strong>Regelkontroll</strong> – deterministiska kontroller av sidans HTML och serverns svar: HTTPS, titel, metabeskrivning, rubriker, alt-texter, formuläretiketter, viewport, sitemap, strukturerad data och tecken på föråldrad teknik.</li>
        <li><strong>Bedömning</strong> – tolkningar enligt fasta regler av tydlighet och konverteringsförmåga: hur långt huvudbudskapet är, om det finns uppmaningar och var de syns, kontaktvägar och förtroendesignaler. När AI-bedömning är aktiverad får en språkmodell dessutom se sidans första skärm; det märks då som AI-bedömning.</li>
      </ul>
      <h2>Kategorier och vikter</h2>
      <table>
        <thead><tr><th scope="col">Kategori</th><th scope="col">Vikt</th><th scope="col">Så räknas den</th></tr></thead>
        <tbody>
          <tr><td>Prestanda</td><td>20 %</td><td>80 % Lighthouse-prestanda, 20 % egna kontroller</td></tr>
          <tr><td>Mobilupplevelse</td><td>15 %</td><td>Kontroller, varav flera uppmätta i Lighthouse</td></tr>
          <tr><td>Tillgänglighet</td><td>15 %</td><td>60 % Lighthouse-tillgänglighet, 40 % egna kontroller</td></tr>
          <tr><td>SEO och teknisk grund</td><td>20 %</td><td>40 % Lighthouse-SEO, 60 % egna kontroller</td></tr>
          <tr><td>Visuell tydlighet</td><td>15 %</td><td>Bedömning; med AI vägs AI och regler lika</td></tr>
          <tr><td>Konverteringsförmåga</td><td>15 %</td><td>Bedömning; med AI vägs AI och regler lika</td></tr>
        </tbody>
      </table>
      <p>Varje kontroll har en vikt mellan 1 och 5. Godkänd ger full poäng, ”kan förbättras” halv och brist ingen. Totalbetyget är ett viktat snitt av kategorierna. Om en kategori inte kan mätas, till exempel för att Lighthouse inte når sidan, räknas den bort och vikterna fördelas om – och rapporten säger det.</p>
      <h2>Prioritering</h2>
      <p>Alla brister rangordnas efter kontrollens vikt, hur allvarlig bristen är, kategorins vikt, möjlig effekt och uppskattad insats. De tre som ger mest effekt i förhållande till insatsen hamnar under <strong>Åtgärda först</strong>, nästa grupp under <strong>Nästa förbättring</strong> och det som redan fungerar under <strong>Bra redan nu</strong>.</p>
      <h2>Begränsningar</h2>
      <ul>
        <li>Analysen gäller den adress du anger, inte hela sajten.</li>
        <li>Lighthouse-värden varierar något mellan körningar.</li>
        <li>Sajter som blockerar automatiska besök kan inte analyseras.</li>
        <li>Bedömningar av tydlighet och konvertering är förenklingar. En människa ser saker regler missar – därför erbjuder vi en kostnadsfri genomgång.</li>
      </ul>
      <h2>Säkerhet och integritet</h2>
      <p>Analysen hämtar bara publika http- och https-adresser på standardportar. Interna nätverk, lokala adresser, molnleverantörers metadata-tjänster och vidarebefordringar dit stoppas innan någon anslutning görs. Hämtningen har tidsgräns, storleksgräns och ett begränsat antal vidarebefordringar, och antalet analyser per besökare är begränsat. Sidans kod körs aldrig – den läses som text.</p>
      <p>Rapporter sparas i 180 dagar och är privata: de nås bara via sin länk och visas inte i sökmotorer om inte den som skapade rapporten väljer det. <a href="/integritet/">Läs integritetspolicyn</a>.</p>
    </article>
    ${aside('o', 'O', 'Analysen visar vad som håller sajten tillbaka. Wimco kan sedan designa, utveckla och automatisera lösningen.', 'Starta ett projekt', '/#starta')}
  </div>
</div>`,
});

/* ---------------- Integritet ---------------- */
page({
  file: 'integritet/index.html', title: 'Integritetspolicy | Wimco',
  description: 'Hur Wimco hanterar personuppgifter, analyser, e-post och cookies på wimco.se.',
  canonical: `${SITE}/integritet/`,
  body: `<div class="wrap">
  <header class="page-head">
    <p class="crumbs"><a href="/">Wimco</a></p>
    <h1 class="display">Integritet</h1>
    <p class="lead">Kort och rakt: vad vi sparar, varför och hur länge.</p>
  </header>
  <article class="prose prose-page">
    <h2>Vem ansvarar?</h2>
    <p>Wimco är personuppgiftsansvarig för behandlingen på wimco.se. Frågor om dina uppgifter skickar du till <a href="mailto:hej@wimco.se">hej@wimco.se</a>.</p>
    <h2>När du analyserar en webbplats</h2>
    <ul>
      <li>Vi sparar adressen du anger och analysresultatet så att rapportlänken fungerar. Rapporter raderas efter 180 dagar.</li>
      <li>För att förhindra missbruk räknar vi hur många analyser som görs från en viss IP-adress. IP-adressen sparas inte i klartext utan som en envägskodad nyckel, och räknarna försvinner automatiskt efter högst ett dygn.</li>
      <li>Adressen skickas till Google PageSpeed Insights för att mäta sidan. Om AI-bedömning är aktiverad skickas den analyserade sidans text och en skärmdump till vår AI-leverantör. Inga uppgifter om dig som besökare skickas med.</li>
      <li>Rapporter är privata och visas inte i sökmotorer om du inte själv väljer att göra dem offentliga.</li>
    </ul>
    <h2>När du kontaktar oss</h2>
    <p>När du skickar ett formulär sparar vi det du fyller i – till exempel namn, e-post, företag och meddelande – för att kunna svara och hantera din förfrågan. Rättslig grund är vårt berättigade intresse av att besvara förfrågningar, eller förberedelser inför ett avtal. Uppgifterna sparas i högst 24 månader om det inte uppstår ett kundförhållande.</p>
    <p>Ber du om rapporten via e-post eller en påminnelse om ny analys använder vi din e-postadress bara till det. En påminnelse skickas en gång och raderas sedan.</p>
    <h2>Cookies och statistik</h2>
    <p>Sajten fungerar utan cookies. Med ditt samtycke använder vi Google Analytics för att förstå hur sajten används, till exempel hur många som startar och slutför en analys. Google Analytics sätter då cookies. Du kan ändra ditt val när som helst via <em>Cookieinställningar</em> i sidfoten.</p>
    <h2>Tjänster vi använder</h2>
    <ul>
      <li>Cloudflare – drift, säkerhet och lagring av rapporter.</li>
      <li>Google – PageSpeed Insights för mätningar och, med samtycke, Google Analytics.</li>
      <li>E-posttjänst för att skicka bekräftelser, rapporter och påminnelser.</li>
      <li>AI-leverantör för valfri bedömning av analyserade sidor.</li>
    </ul>
    <p>Vissa av tjänsterna kan behandla uppgifter utanför EU/EES. Vi använder då leverantörer med godkända skyddsåtgärder, till exempel EU-kommissionens standardavtalsklausuler.</p>
    <h2>Dina rättigheter</h2>
    <p>Du har rätt att få veta vilka uppgifter vi har om dig, få dem rättade eller raderade, invända mot behandlingen och begära att den begränsas. Du kan också lämna klagomål till Integritetsskyddsmyndigheten (IMY).</p>
    <p>Senast uppdaterad <time datetime="${TODAY}">30 september 2026</time>.</p>
  </article>
</div>`,
});

/* ---------------- Rapportskal (/r/:id serveras av funktionen med rätt metadata) ---------------- */
page({
  file: 'rapport/index.html', title: 'Rapport | Wimco Score', slots: true, robots: 'noindex, nofollow',
  description: 'Analys av en webbplats med Wimco Score: prestanda, mobil, tillgänglighet, SEO, tydlighet och konvertering.',
  canonical: null, scripts: ['/assets/js/report.js'],
  body: `<div class="wrap report-wrap" data-report>
  <div class="report-loading" aria-live="polite">
    <p class="h-md">Hämtar rapporten…</p>
    <noscript><p>Rapporten behöver JavaScript för att visas. Mejla <a href="mailto:hej@wimco.se">hej@wimco.se</a> så skickar vi den.</p></noscript>
  </div>
</div>`,
});

/* ---------------- 404 ---------------- */
page({
  file: '404.html', title: 'Sidan finns inte | Wimco', robots: 'noindex',
  description: 'Sidan du letade efter finns inte.',
  canonical: null,
  body: `<div class="wrap">
  <header class="page-head page-head-end">
    <h1 class="display">Den här stationen finns inte.</h1>
    <p class="crumbs">Felkod 404</p>
    <p class="lead">Länken kan vara gammal eller felstavad. Byt här:</p>
    <p class="sr-actions"><a class="btn btn-signal" href="/#analys">Analysera din webbplats</a> <a class="btn btn-line" href="/">Till startsidan</a> <a class="btn btn-line" href="/guider/">Guider</a></p>
  </header>
</div>`,
});

/* ---------------- Sitemap ---------------- */
const urls = [
  ['/', '1.0'], ['/wimco-score/', '0.8'], ['/guider/', '0.7'],
  ...GUIDES.map((g) => [g.slug, '0.6']), ['/blogg/hur-mycket-kostar-en-hemsida.html', '0.6'],
  ['/playground/', '0.4'], ['/integritet/', '0.2'],
];
fs.writeFileSync(path.join(PUB, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p]) => `  <url><loc>${SITE}${u}</loc><lastmod>${u.includes('kostar') ? '2026-09-29' : TODAY}</lastmod><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
console.log('Sidor genererade.');
