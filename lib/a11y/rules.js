// Reservmätning när Google Lighthouse (PageSpeed Insights) inte svarar, till exempel när kvoten är slut.
// Kontrollerar sidans HTML direkt mot de axe-regler som går att avgöra utan webbläsare.
// Kontrast, layout och innehåll som byggs med JavaScript kan inte bedömas härifrån, och det sägs i resultatet.
//
// Returnerar samma form som normalizeA11y() i check.js: { ok, score, passed, manual, failing[] }.
import { decodeEntities } from '../analysis/html-parse.js';
import { AUDITS } from './catalog.js';

const WEIGHT = { critical: 10, serious: 7, moderate: 3 };
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title', 'noscript', 'template']);
const COLLECT = new Set(['a', 'button', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export const RULE_TITLES = {
  'html-has-lang': '<html>-elementet saknar ett [lang]-attribut',
  'document-title': 'Sidan saknar en <title>',
  'meta-viewport': 'Zoom är avstängt på mobil ([user-scalable="no"] eller [maximum-scale] under 5)',
  'image-alt': 'Bilder saknar [alt]-attribut',
  'input-image-alt': 'Bildknappar (<input type="image">) saknar [alt]-text',
  'button-name': 'Knappar saknar ett tillgängligt namn',
  'link-name': 'Länkar saknar ett urskiljbart namn',
  label: 'Formulärfält saknar etiketter',
  'select-name': 'Rullistor saknar etiketter',
  'frame-title': 'Iframes saknar [title]',
  tabindex: 'Element har [tabindex] större än 0',
  'heading-order': 'Rubrikerna hoppar över nivåer',
  'aria-hidden-body': '<body> har [aria-hidden="true"]',
  'landmark-one-main': 'Sidan saknar ett main-landmärke',
};

const DESCRIPTIONS = {
  'image-alt': 'Bilder utan alt-attribut läses upp som filnamn eller hoppas över, så skärmläsaranvändare missar produktbilder och innehåll.',
  'button-name': 'En knapp utan text eller aria-label läses upp som bara "knapp". Vanligast är ikonknappar för meny, sök och varukorg.',
  'link-name': 'En länk som bara består av en ikon eller bild utan alt-text går inte att förstå med skärmläsare.',
  label: 'Fält utan etikett går inte att förstå med skärmläsare. Platshållartext räcker inte, den försvinner när man börjar skriva.',
  'meta-viewport': 'Synsvaga behöver kunna zooma in på mobilen.',
  'html-has-lang': 'Utan språkangivelse läser skärmläsaren texten med fel uttal.',
};

const attrRe = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
function attrsOf(src) {
  const out = {};
  let m;
  attrRe.lastIndex = 0;
  while ((m = attrRe.exec(src))) {
    const name = m[1].toLowerCase();
    if (!(name in out)) out[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}
const snippet = (tag) => (tag.length > 220 ? `${tag.slice(0, 217)}…` : tag).replace(/\s+/g, ' ');
const has = (a, k) => typeof a[k] === 'string' && a[k].trim() !== '';
const hidden = (a) => a['aria-hidden'] === 'true' || a.hidden !== undefined || /^(presentation|none)$/i.test(a.role || '');

/** Checks one page's HTML. Never throws on odd markup; a truncated page just has fewer findings. */
export function checkHtml(html) {
  const src = String(html || '').slice(0, 3 * 1024 * 1024);
  const found = new Map(); // id -> { count, examples }
  const checked = new Set(); // rules that had something to check
  const fail = (id, tag, label = '') => {
    let f = found.get(id);
    if (!f) found.set(id, (f = { count: 0, examples: [] }));
    f.count++;
    if (f.examples.length < 3) f.examples.push({ label: label.slice(0, 120), snippet: tag ? snippet(tag) : '', selector: '' });
  };

  const labelsFor = new Set();
  const ids = new Set();
  const fields = []; // { tag, attrs, raw, inLabel }
  const headings = [];
  let htmlTag = null;
  let title = null;
  let mainCount = 0;

  const stack = [];
  const tokenRe = /<!--[\s\S]*?(?:-->|$)|<![^>]*>|<\?[^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</g;
  let m;
  while ((m = tokenRe.exec(src))) {
    const tok = m[0];
    if (m[2] === undefined) {
      if (!tok.startsWith('<')) {
        const text = decodeEntities(tok).replace(/\s+/g, ' ').trim();
        if (text) for (const e of stack) if (e.collect) e.text += ` ${text}`;
      }
      continue;
    }
    const tag = m[2].toLowerCase();
    if (m[1] === '/') {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          for (const e of stack.splice(i).reverse()) close(e);
          break;
        }
      }
      continue;
    }
    const a = attrsOf(m[3] || '');
    const raw = tok;
    if (a.id) ids.add(a.id);
    if (has(a, 'tabindex') && Number(a.tabindex) > 0) fail('tabindex', raw);
    if (has(a, 'tabindex')) checked.add('tabindex');
    if (a.role === 'main') mainCount++;

    let rawContent = '';
    if (RAW.has(tag) && !/\/\s*$/.test(m[3] || '')) {
      const endRe = new RegExp(`</${tag}\\s*>`, 'ig');
      endRe.lastIndex = tokenRe.lastIndex;
      const end = endRe.exec(src);
      rawContent = src.slice(tokenRe.lastIndex, end ? end.index : src.length);
      tokenRe.lastIndex = end ? endRe.lastIndex : src.length;
    }
    const inSvg = stack.some((e) => e.tag === 'svg');

    switch (tag) {
      case 'html': htmlTag = { a, raw }; break;
      case 'title': if (!inSvg && title === null) title = decodeEntities(rawContent).trim(); break;
      case 'body':
        checked.add('aria-hidden-body');
        if (a['aria-hidden'] === 'true') fail('aria-hidden-body', raw);
        break;
      case 'main': mainCount++; break;
      case 'meta':
        if ((a.name || '').toLowerCase() === 'viewport') {
          checked.add('meta-viewport');
          const c = (a.content || '').toLowerCase().replace(/\s+/g, '');
          const max = /maximum-scale=([\d.]+)/.exec(c);
          if (/user-scalable=(no|0)(,|$)/.test(c) || (max && Number(max[1]) < 5)) fail('meta-viewport', raw);
        }
        break;
      case 'img':
        if (inSvg) break;
        for (const e of stack) if (e.collect && has(a, 'alt')) e.text += ` ${a.alt}`;
        if (hidden(a)) break;
        checked.add('image-alt');
        if (!('alt' in a) && !has(a, 'aria-label') && !has(a, 'aria-labelledby') && !has(a, 'title')) fail('image-alt', raw, a.src ? a.src.split('/').pop().split('?')[0] : '');
        break;
      case 'iframe':
        if (hidden(a)) break;
        checked.add('frame-title');
        if (!has(a, 'title') && !has(a, 'aria-label')) fail('frame-title', raw);
        break;
      case 'label':
        if (has(a, 'for')) labelsFor.add(a.for);
        break;
      case 'input': {
        const type = (a.type || 'text').toLowerCase();
        if (type === 'hidden' || hidden(a)) break;
        if (type === 'image') {
          checked.add('input-image-alt');
          if (!has(a, 'alt') && !has(a, 'aria-label') && !has(a, 'title')) fail('input-image-alt', raw);
          break;
        }
        if (['submit', 'button', 'reset'].includes(type)) {
          checked.add('button-name');
          if (!has(a, 'value') && !has(a, 'aria-label') && !has(a, 'aria-labelledby') && !has(a, 'title') && type === 'button') fail('button-name', raw);
          break;
        }
        fields.push({ rule: 'label', a, raw, inLabel: stack.some((e) => e.tag === 'label') });
        break;
      }
      case 'textarea':
        if (!hidden(a)) fields.push({ rule: 'label', a, raw, inLabel: stack.some((e) => e.tag === 'label') });
        break;
      case 'select':
        if (!hidden(a)) fields.push({ rule: 'select-name', a, raw, inLabel: stack.some((e) => e.tag === 'label') });
        break;
      default:
        break;
    }

    if (VOID.has(tag) || RAW.has(tag) || /\/\s*$/.test(m[3] || '')) continue;
    stack.push({ tag, a, raw, text: '', collect: COLLECT.has(tag) || a.role === 'button' || a.role === 'link' });
    if (stack.length > 600) stack.shift();
  }
  while (stack.length) close(stack.pop());

  function close(e) {
    if (!e.collect) return;
    const name = `${e.text} ${e.a['aria-label'] || ''} ${e.a.title || ''}`.trim() || e.a['aria-labelledby'];
    if (/^h[1-6]$/.test(e.tag)) {
      headings.push(Number(e.tag[1]));
      return;
    }
    if (hidden(e.a)) return;
    if (e.tag === 'button' || e.a.role === 'button') {
      checked.add('button-name');
      if (!name) fail('button-name', e.raw);
    } else if (e.tag === 'a' && e.a.href !== undefined) {
      checked.add('link-name');
      if (!name) fail('link-name', e.raw, e.a.href ? e.a.href.slice(0, 80) : '');
    }
  }

  // Sidnivå
  checked.add('html-has-lang');
  if (!htmlTag || !has(htmlTag.a, 'lang')) fail('html-has-lang', htmlTag?.raw || '<html>');
  checked.add('document-title');
  if (!title) fail('document-title', title === null ? '' : '<title></title>');
  checked.add('landmark-one-main');
  if (!mainCount) fail('landmark-one-main', '');

  for (const f of fields) {
    checked.add(f.rule);
    const labelled = f.inLabel || (has(f.a, 'id') && labelsFor.has(f.a.id)) || has(f.a, 'aria-label') || has(f.a, 'aria-labelledby') || has(f.a, 'title');
    if (!labelled) fail(f.rule, f.raw, f.a.name || f.a.placeholder || '');
  }

  if (headings.length > 1) {
    checked.add('heading-order');
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i - 1] + 1) {
        fail('heading-order', '', `H${headings[i - 1]} följs av H${headings[i]}`);
        break;
      }
    }
  }

  // Poäng som Lighthouse: viktat andel godkända regler bland dem som gick att pröva.
  let total = 0;
  let ok = 0;
  const failing = [];
  for (const id of checked) {
    const severity = AUDITS[id]?.severity || 'moderate';
    const w = WEIGHT[severity];
    total += w;
    const f = found.get(id);
    if (!f) { ok += w; continue; }
    failing.push({
      id,
      weight: w,
      title: RULE_TITLES[id] || id,
      description: DESCRIPTIONS[id] || '',
      count: f.count,
      examples: f.examples.filter((e) => e.snippet || e.label),
    });
  }
  return {
    ok: true,
    method: 'rules',
    devData: false,
    score: total ? Math.round((ok / total) * 100) : 100,
    passed: checked.size - failing.length,
    manual: 0,
    failing,
  };
}
