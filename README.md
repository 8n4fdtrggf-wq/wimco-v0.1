# Wimco Landningssida

En modern, snabb och konverteringsoptimerad landningssida för Wimco, byggd med ren HTML, CSS och JavaScript. Designen är inspirerad av moderna Awwwards-trender (Bento-grid, subtila animationer, generöst whitespace) men håller fokus på tydlighet och förtroende för småföretagare.

## 📁 Filstruktur

- `index.html`: Huvudstrukturen med all copy och semantisk HTML.
- `css/styles.css`: All styling, inklusive CSS-variabler för enkel färgändring.
- `js/main.js`: Hanterar scroll-animationer, sticky header och FAQ-accordion.
- `assets/favicon.svg`: En minimalistisk SVG-favicon.
- `robots.txt` & `sitemap.xml`: SEO-grundläggande filer.

## 🚀 Komma igång

1. Öppna `index.html` i din webbläsare för att förhandsgranska lokalt.
2. För produktion, ladda upp alla filer till ditt webbhotell (t.ex. via FTP eller en tjänst som Vercel/Netlify).
3. Uppdatera kontaktuppgifterna i footern och CTA-sektionen (mejl och telefonnummer).
4. Byt ut platshållarcitat i "Social Proof"-sektionen mot riktiga kundomdömen när de finns tillgängliga.

## 🎨 Anpassa designen

Alla färger och typsnitt styrs av CSS-variabler i toppen av `css/styles.css`:
- `--accent`: Ändra `#E86A33` för att byta primär accentfärg (knappar, ikoner).
- `--text-primary`: Ändra `#0F172A` för att justera den mörka textfärgen.

## ⚡ Prestanda & SEO

- Typsnitt laddas via `preconnect` för snabbare rendering.
- JavaScript laddas med `defer` för att inte blockera renderingen.
- Semantiska HTML5-taggar (`<main>`, `<section>`, `<article>`) används för bästa tillgänglighet och SEO.
- Meta-beskrivningar och Open Graph-taggar är förifyllda.

---
*Skapad: September 2026*