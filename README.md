# wimco.se

Wimcos webbplats: en digital studio för hemsidor, webbutveckling och automation – med **Wimco Score**, en gratis analys av besökarens egen webbplats, som huvudsaklig ingång.

## Struktur

| Katalog | Innehåll |
|---|---|
| `public/` | Allt som publiceras: sidor, CSS, JS, typsnitt, bilder, `_headers`, `_redirects`, `sitemap.xml` |
| `public/assets/js/scanner.js` | Heron: linjekartan, analysflödet och förhandsvisningen av Wimco Score |
| `public/assets/js/report.js` | Rapportsidan `/r/:id` |
| `public/assets/js/site.js` | Navigation, samtycke och analytics, formulär, flikar, Turnstile |
| `functions/` | Cloudflare Pages Functions (tunna adaptrar) |
| `lib/net/` | SSRF-skydd: URL-validering, IP-klassning, säker hämtning med redirect-, tids- och storleksgränser |
| `lib/analysis/` | HTML-analys, Lighthouse via PageSpeed Insights, valfri AI-bedömning, kontroller och poäng |
| `lib/router.js` | API: `/api/analyze` (NDJSON-ström), `/api/report/:id`, `/api/lead`, `/r/:id`, `/og/:id.png` |
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

## Hur Wimco Score räknas

Sex kategorier vägs ihop till 0–100: Prestanda 20 %, Mobilupplevelse 15 %, Tillgänglighet 15 %, SEO och teknisk grund 20 %, Visuell tydlighet 15 %, Konverteringsförmåga 15 %. Varje kontroll märks med sin källa – *Uppmätt* (Google Lighthouse), *Regelkontroll* (sidans kod) eller *Bedömning* (fasta regler, eller AI om det är aktiverat). Detaljer: `/wimco-score/` och `lib/analysis/score.js`.

Designsystemet är dokumenterat i [DESIGN.md](DESIGN.md) och produktfakta i [PRODUCT.md](PRODUCT.md).
