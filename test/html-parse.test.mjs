import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHtml, metaMap } from '../lib/analysis/html-parse.js';

test('extraherar signaler utan att köra något', () => {
  const html = `<!doctype html><html lang="sv"><head><title>Hej &amp; välkommen</title>
  <meta name="description" content="Beskrivning"><meta name="viewport" content="width=device-width">
  <script>document.write('<h1>falsk</h1>')</script><script src="/a.js" defer></script><script src="/b.js"></script>
  <script type="application/ld+json">{"@type":"Organization"}</script></head>
  <body><main><h1>Rubrik <span>här</span></h1><h3>Hopp</h3><img src="a.webp" alt=""><img src="b.jpg">
  <a href="tel:+4670">Ring</a><a href="/kontakt"><img src="i.svg" alt="Kontakt"></a><a href="#"></a>
  <form><label for="e">E-post</label><input id="e" type="email"><input type="text" placeholder="Namn"><button>Skicka</button></form>
  <!-- <h1>kommentar</h1> --></main></body></html>`;
  const p = parseHtml(html);
  assert.equal(p.lang, 'sv');
  assert.equal(p.title, 'Hej & välkommen');
  assert.equal(metaMap(p).description, 'Beskrivning');
  assert.deepEqual(p.headings.map((h) => [h.level, h.text]), [[1, 'Rubrik här'], [3, 'Hopp']]);
  assert.equal(p.images.length, 3);
  assert.equal(p.images[1].alt, null);
  assert.equal(p.jsonLd.length, 1);
  assert.equal(p.scripts.filter((s) => s.src && s.inHead && !s.defer).length, 1);
  assert.equal(p.inputs.length, 2);
  assert.ok(p.labelsFor.has('e'));
  assert.equal(p.anchors.find((a) => a.href === '/kontakt').imgAlt, 'Kontakt');
  assert.equal(p.anchors.filter((a) => a.href === '#' && !a.text).length, 1);
  assert.equal(p.landmarks.main, 1);
});

test('tål trasig HTML', () => {
  const p = parseHtml('<html><h1>Utan slut <a href="x">länk <b>fet</h1><p>text <img src=a.png alt=bild');
  assert.equal(p.headings.length, 1);
  assert.ok(p.wordCount >= 3);
});
