# wimco.se

Wimcos webbplats: en digital studio för hemsidor, webbutveckling och automation – med **Wimco Score**, en gratis analys av besökarens egen webbplats, som huvudsaklig ingång.

## Struktur

| Katalog | Innehåll |
|---|---|
| `public/` | Allt som publiceras: sidor, CSS, JS, typsnitt, bilder, `_headers`, `_redirects`, `sitemap.xml` |
| `web/` | Källkoden till startsidan (Next.js, statisk export). Byggs in i `public/index.html` + `public/_next/` med `npm run build:home` |
| `public/assets/js/scanner.js` | Den tidigare startsidans analysflöde (används inte längre av startsidan, ligger kvar orörd) |
| `public/assets/js/report.js` | Rapportsidan `/r/:id` |
| `public/assets/js/site.js` | Navigation, samtycke och analytics, formulär, flikar, Turnstile |
| `functions/` | Cloudflare Pages Functions (tunna adaptrar) |
| `lib/net/` | SSRF-skydd: URL-validering, IP-klassning, säker hämtning med redirect-, tids- och storleksgränser |
| `lib/analysis/` | HTML-analys, Lighthouse via PageSpeed Insights, valfri AI-bedömning, kontroller och poäng |
| `lib/router.js` | API: `/api/analyze` (NDJSON-ström), `/api/report/:id`, `/api/a11y` (NDJSON-ström), `/api/a11y/:id`, `/api/lead`, `/r/:id`, `/og/:id.png` |
| `lib/a11y/` | Tillgänglighetstestet för e-handel (`check.js`), WCAG-koppling (`catalog.js`) och paketen med priser (`packages.js`) |
| `server/dev.mjs` | Lokal server som kör samma router |
| `tools/` | Byggskript för undersidor, delningsbilder, typsnitt och skärmdumpar |
| `test/` | Node-tester (`npm test`) |

## Kom igång

```sh
cp .dev.vars.example .dev.vars
npm run dev     # http://localhost:8788
npm test
```

Inga npm-beroenden behövs. Driftsättning, nycklar och vad som återstår: se [docs/SETUP.md](docs/SETUP.md).

## Startsidan (`web/`)

Startsidan är ett Next.js-projekt med statisk export. Inget byggsteg behövs i Cloudflare: den byggda sidan är incheckad i `public/`, precis som resten av sajten.

```sh
npm run build:home   # installerar web/, bygger och publicerar till public/
npm run dev          # testa allt tillsammans med API:t på http://localhost:8788
```

`web/scripts/publish.mjs` gör tre saker:

1. Kopierar `index.html`, `index.txt` och `_next/` till `public/`.
2. Räknar fram sha256-hashar för sidans inline-skript och stilattribut.
3. Skriver ett genererat block sist i `public/_headers` för `/`. Blocket utgår från den globala CSP:n och lägger bara till de hasharna, inte `unsafe-inline`.

Kör alltid `build:home` efter ändringar i `web/`, annars stämmer inte hasharna.

Startsidan använder samma API och delade klientkod som resten av sajten:

- `/api/analyze` (NDJSON-ström) och `/r/:id` för Wimco Score.
- `/api/lead` med `kind: "project"` för projektförfrågningar.
- `/assets/js/site.js` för samtycke, Google Analytics, Turnstile och `/api/config`.
- Samma analytics-händelser: `analysis_start`, `analysis_complete`, `analysis_error`, `analysis_cancel` och `generate_lead`.

Texter ändras i `web/content/site.ts`. Mer om komponenter och rörelse i `web/README.md`.

## Tillgänglighet för e-handel (`/tillganglighet/`)

Sidan byggs i `web/app/tillganglighet/` och publiceras med `npm run build:home`. Den har tre delar:

- **Gratistestet** (`POST /api/a11y`): läser startsidan, letar upp en produktsida och sökformuläret och kör Lighthouse-kategorin *accessibility* (axe-core) via PageSpeed Insights på alla tre, alltså de sidtyper PTS börjar med i sin tillsyn. Varje test kostar tre PSI-anrop, så `PSI_API_KEY` behövs i praktiken: utan nyckel svarar Google ofta 429 (kvoten slut). Vid 429, serverfel och nätverksfel försöker testet igen med paus, och anropen sprids ut. Svarar Lighthouse ändå inte kontrolleras sidornas HTML direkt (`lib/a11y/rules.js`): etiketter, alt-texter, knapp- och länknamn, zoom, språk, titel, iframes, tabindex och rubrikordning. Resultatet märks då "Kontrollerad i koden" och cachas inte. `/api/config` visar `psiKey: true` när nyckeln är satt. Resultatet sparas i 180 dagar och öppnas igen med `/tillganglighet/?r=<id>`. `/tillganglighet/?url=<adress>` startar ett test direkt (används från Wimco Score-rapporten).
- **Paketen**: namn, priser och innehåll står i `lib/a11y/packages.js`. Samma fil används av sidan och av API:t, så ändra bara där och kör `npm run build:home`.
- **Beställning** (`/api/lead` med `kind: "a11y_order"`): Wimco (hej@wimco.se) får ett mejl med paket, kunduppgifter och länk till testresultatet. Kunden får en bekräftelse om att inget är bindande förrän Wimcos skriftliga bekräftelse godkänts. Kräver `RESEND_API_KEY`.

## Hur Wimco Score räknas

Sex kategorier vägs ihop till 0–100: Prestanda 20 %, Mobilupplevelse 15 %, Tillgänglighet 15 %, SEO och teknisk grund 20 %, Visuell tydlighet 15 %, Konverteringsförmåga 15 %. Varje kontroll märks med sin källa – *Uppmätt* (Google Lighthouse), *Regelkontroll* (sidans kod) eller *Bedömning* (fasta regler, eller AI om det är aktiverat). Detaljer: `/wimco-score/` och `lib/analysis/score.js`.

Designsystemet är dokumenterat i [DESIGN.md](DESIGN.md) och produktfakta i [PRODUCT.md](PRODUCT.md).
