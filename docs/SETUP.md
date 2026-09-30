# Driftsättning och konfiguration

Sajten är statisk (`public/`) med serverlogik i Cloudflare Pages Functions (`functions/` → `lib/`). Allt nedan behöver göras en gång i Cloudflare-kontot.

## 1. Cloudflare Pages

1. Koppla repot till Cloudflare Pages (eller behåll befintlig koppling).
2. Byggkommando: *inget*. Output-katalog: `public` (läses även från `wrangler.toml`).
3. Pages bygger automatiskt Functions från `functions/`. Inga npm-beroenden behövs.

> Om wimco.se i dag ligger på GitHub Pages eller ett vanligt webbhotell fungerar bara de statiska sidorna där. Analysverktyget, rapportlänkarna, formulären och delningsbilderna kräver Functions – flytta då till Cloudflare Pages.

## 2. KV-lagring (obligatorisk)

```sh
npx wrangler kv namespace create WIMCO_KV
```

Klistra in id:t i `wrangler.toml` (`REPLACE_WITH_KV_NAMESPACE_ID`) eller koppla bindningen `WIMCO_KV` under *Settings → Functions → KV namespace bindings*. Utan KV fungerar analysen men rapporter, delning, leads och rate limiting sparas inte.

## 3. Miljövariabler och hemligheter

| Namn | Typ | Krävs | Används till |
|---|---|---|---|
| `SITE_URL` | variabel | ja | Absoluta länkar i mejl, OG-bilder, origin-kontroll. `https://wimco.se` |
| `PSI_API_KEY` | hemlighet | starkt rekommenderad | Google PageSpeed Insights (Lighthouse). Utan nyckel görs anrop nyckellöst med mycket låg kvot; faller det bort märks prestanda som "bedömd med regler". Skapa på https://developers.google.com/speed/docs/insights/v5/get-started |
| `RESEND_API_KEY` | hemlighet | för e-post | Notiser om leads till Wimco, rapport via e-post, påminnelser. Verifiera domänen wimco.se i Resend. |
| `LEAD_TO_EMAIL` | variabel | nej | Mottagare av leads (standard `hej@wimco.se`). |
| `MAIL_FROM` | variabel | nej | Avsändare (standard `Wimco <hej@wimco.se>`). |
| `IP_HASH_SALT` | hemlighet | ja | Salt för anonymiserade IP-nycklar i rate limiting. Valfri lång slumpsträng. |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | variabel / hemlighet | nej | Cloudflare Turnstile som extra botskydd för analys och formulär. |
| `ANTHROPIC_API_KEY` | hemlighet | nej | Valfri AI-bedömning av visuell tydlighet och konvertering (märks "AI-bedömning"). |
| `ANTHROPIC_MODEL` | variabel | nej | Standard `claude-sonnet-5-5`. |
| `CRON_SECRET` | hemlighet | för påminnelser | Skyddar `POST /api/cron/reminders`. |
| `GLOBAL_DAILY_LIMIT` | variabel | nej | Tak för antal analyser per dygn totalt (standard 3000) – skyddar PSI-kvoten. |

`DEV_FIXTURES`, `DEV_SITE_FIXTURES`, `DEV_FIXTURE_DELAY`, `DEV_USE_PROXY` och `PSI_DISABLED` är endast för lokal utveckling och ska **inte** sättas i produktion.

## 4. Påminnelser om ny analys

Pages Functions har ingen cron. Anropa endpointen dagligen från t.ex. en liten Cloudflare Worker med Cron Trigger eller en GitHub Action:

```sh
curl -X POST https://wimco.se/api/cron/reminders -H "Authorization: Bearer $CRON_SECRET"
```

## 5. Google Analytics

GA4-egenskapen `G-B7VWYC02LZ` laddas först när besökaren godkänt i samtyckesrutan. Händelser som skickas: `analysis_start`, `analysis_complete`, `analysis_error`, `analysis_cancel`, `service_view`, `service_interest`, `report_view`, `report_action`, `share`, `open_report`, `generate_lead`. Markera `generate_lead` och `analysis_complete` som nyckelhändelser i GA.

## 6. Innan lansering – att granska

- **Integritetspolicyn** (`/integritet/`) är ett utkast baserat på hur koden fungerar. Läs igenom, lägg till organisationsnummer och justera lagringstider om de ska vara andra.
- **Organisationsnummer** saknas medvetet (det gamla var en platshållare).
- **Kundcase och omdömen** finns inte på sajten; de gamla citaten var platshållare och är borttagna. Lägg till riktiga när kunder godkänt det.
- **Utvecklingsdata:** kontrollera att inga `DEV_*`-variabler är satta i produktion.

## Lokalt

```sh
cp .dev.vars.example .dev.vars   # fyll i nycklar vid behov
npm run dev                      # http://localhost:8788
npm test                         # 36 tester: SSRF, parser, poäng, API, leads, OG-bild
```

Med `DEV_FIXTURES=1` och `DEV_SITE_FIXTURES=1` kan du analysera testsajterna `svag.fixtures.wimco.dev`, `gamla-wimco.fixtures.wimco.dev`, `blockerad.fixtures.wimco.dev`, `saknas.fixtures.wimco.dev`, `fil.fixtures.wimco.dev`, `intern-redirect.fixtures.wimco.dev` och `seg.fixtures.wimco.dev` utan nätverk. Sådana rapporter märks alltid som utvecklingsdata.

Byggskript (körs bara när källfilerna ändras): `npm run build:pages` (undersidor + sitemap), `npm run build:og` (delningsbilder, kräver python3 + Pillow), `npm run build:fonts` (typsnitt, kräver fonttools + brotli).
