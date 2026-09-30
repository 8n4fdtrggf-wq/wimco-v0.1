// En liten, beroendefri HTML-tokeniserare som extraherar just de signaler analysen behöver.
// Ingen HTML från analyserade sidor renderas någonsin – allt blir ren data (strängar/tal).

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', aring: 'å', Aring: 'Å', auml: 'ä',
  Auml: 'Ä', ouml: 'ö', Ouml: 'Ö', eacute: 'é', Eacute: 'É', uuml: 'ü', Uuml: 'Ü', ndash: '–',
  mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', copy: '©', reg: '®',
  trade: '™', laquo: '«', raquo: '»', bull: '•', middot: '·', euro: '€', times: '×', shy: '',
};

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return '';
      try { return String.fromCodePoint(code); } catch { return ''; }
    }
    return Object.prototype.hasOwnProperty.call(NAMED, e) ? NAMED[e] : m;
  });
}

const clean = (s) => decodeEntities(s).replace(/\s+/g, ' ').trim();

function parseAttrs(src) {
  const attrs = {};
  const re = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1].toLowerCase();
    if (name in attrs) continue;
    const v = m[2] ?? m[3] ?? m[4];
    attrs[name] = v === undefined ? '' : decodeEntities(v);
  }
  return attrs;
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'noscript', 'template']);
const SKIP_TEXT = new Set(['script', 'style', 'noscript', 'template', 'svg', 'head']);

export function parseHtml(html) {
  const out = {
    doctype: false,
    lang: null,
    title: null,
    titleCount: 0,
    metas: [],
    links: [],
    headings: [],
    images: [],
    scripts: [],
    jsonLd: [],
    anchors: [],
    buttons: [],
    forms: 0,
    inputs: [],
    labelsFor: new Set(),
    iframes: 0,
    landmarks: { main: 0, nav: 0, header: 0, footer: 0 },
    elementCount: 0,
    inlineStyleCount: 0,
    legacyTags: 0,
    textChunks: [],
    wordCount: 0,
    fontFaces: 0,
    videoCount: 0,
  };

  const stack = [];
  const open = (tag) => stack.some((e) => e.tag === tag);
  const topCollector = () => {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].collect) return stack[i];
    return null;
  };
  const addText = (txt) => {
    if (!txt) return;
    if (stack.some((e) => SKIP_TEXT.has(e.tag))) return;
    for (const e of stack) if (e.collect) e.text.push(txt);
    const t = clean(txt);
    if (t) {
      out.textChunks.push(t);
      out.wordCount += t.split(' ').filter(Boolean).length;
    }
  };
  const addAltText = (alt) => {
    for (const e of stack) if (e.collect) e.imgAlt.push(alt);
  };

  const tokenRe = /<!--[\s\S]*?(?:-->|$)|<![^>]*>|<\?[^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</g;
  let m;
  while ((m = tokenRe.exec(html))) {
    const tok = m[0];
    if (tok.startsWith('<!--')) continue;
    if (tok.startsWith('<!')) {
      if (/^<!doctype/i.test(tok)) out.doctype = true;
      continue;
    }
    if (tok.startsWith('<?')) continue;
    if (m[2] === undefined) {
      addText(tok === '<' ? '' : tok);
      continue;
    }
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          const popped = stack.splice(i);
          for (const p of popped.reverse()) finish(p);
          break;
        }
      }
      continue;
    }
    const attrStr = m[3] || '';
    const attrs = parseAttrs(attrStr);
    const selfClosing = /\/\s*$/.test(attrStr);
    out.elementCount++;
    if (attrs.style) out.inlineStyleCount++;

    let rawContent = null;
    if (RAW.has(tag) && !selfClosing) {
      const endRe = new RegExp(`</${tag}\\s*>`, 'ig');
      endRe.lastIndex = tokenRe.lastIndex;
      const end = endRe.exec(html);
      const endIdx = end ? end.index : html.length;
      rawContent = html.slice(tokenRe.lastIndex, endIdx);
      tokenRe.lastIndex = end ? endRe.lastIndex : html.length;
    }

    const inHead = open('head') || (!open('body') && out.headings.length === 0 && out.anchors.length === 0);
    switch (tag) {
      case 'html':
        if (attrs.lang !== undefined) out.lang = attrs.lang.trim() || '';
        break;
      case 'title':
        if (!open('svg')) {
          out.titleCount++;
          if (out.title === null) out.title = clean(rawContent || '');
        }
        break;
      case 'meta':
        out.metas.push(attrs);
        break;
      case 'link':
        out.links.push(attrs);
        break;
      case 'script': {
        const type = (attrs.type || '').toLowerCase();
        if (type === 'application/ld+json') {
          out.jsonLd.push((rawContent || '').slice(0, 20000));
        } else if (!type || /javascript|module|ecmascript/.test(type)) {
          out.scripts.push({ src: attrs.src || null, async: 'async' in attrs, defer: 'defer' in attrs, module: type === 'module', inHead });
        }
        break;
      }
      case 'style':
        if (rawContent) out.fontFaces += (rawContent.match(/@font-face/gi) || []).length;
        break;
      case 'img':
        out.images.push({
          src: attrs.src || attrs['data-src'] || '',
          alt: 'alt' in attrs ? attrs.alt : null,
          width: attrs.width || null,
          height: attrs.height || null,
          loading: (attrs.loading || '').toLowerCase(),
          srcset: !!(attrs.srcset || attrs['data-srcset']),
          inPicture: open('picture'),
          role: attrs.role || null,
          ariaHidden: attrs['aria-hidden'] === 'true',
        });
        if ('alt' in attrs) addAltText(attrs.alt);
        break;
      case 'iframe':
        out.iframes++;
        break;
      case 'video':
        out.videoCount++;
        break;
      case 'form':
        out.forms++;
        break;
      case 'label':
        if (attrs.for) out.labelsFor.add(attrs.for);
        break;
      case 'input': case 'select': case 'textarea': {
        const type = (attrs.type || (tag === 'input' ? 'text' : tag)).toLowerCase();
        if (!['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) {
          out.inputs.push({
            type,
            id: attrs.id || null,
            wrapped: open('label'),
            ariaLabel: !!(attrs['aria-label'] || attrs['aria-labelledby'] || attrs.title),
            placeholder: !!attrs.placeholder,
          });
        } else if (type === 'submit' || type === 'button') {
          out.buttons.push({ text: clean(attrs.value || ''), ariaLabel: attrs['aria-label'] || '', textIndex: out.wordCount });
        }
        break;
      }
      case 'main': out.landmarks.main++; break;
      case 'nav': out.landmarks.nav++; break;
      case 'header': out.landmarks.header++; break;
      case 'footer': out.landmarks.footer++; break;
      case 'font': case 'center': case 'marquee': case 'frameset': case 'frame': case 'blink':
        out.legacyTags++;
        break;
      default:
        if (attrs.role === 'main') out.landmarks.main++;
        if (attrs.role === 'navigation') out.landmarks.nav++;
    }

    if (tag === 'textarea' && rawContent) {
      continue;
    }

    if (VOID.has(tag) || selfClosing || RAW.has(tag)) continue;

    const entry = { tag, attrs, collect: false, text: [], imgAlt: [], textIndex: out.wordCount };
    if (/^h[1-6]$/.test(tag) || tag === 'a' || tag === 'button' || attrs.role === 'button') {
      entry.collect = true;
    }
    stack.push(entry);
    if (stack.length > 512) stack.shift();
  }
  while (stack.length) finish(stack.pop());

  function finish(e) {
    if (!e.collect) return;
    const text = clean(e.text.join(' '));
    if (/^h[1-6]$/.test(e.tag)) {
      out.headings.push({ level: Number(e.tag[1]), text: text.slice(0, 200), textIndex: e.textIndex });
    } else if (e.tag === 'a') {
      out.anchors.push({
        href: (e.attrs.href || '').trim(),
        text: text.slice(0, 160),
        ariaLabel: e.attrs['aria-label'] || e.attrs.title || '',
        imgAlt: e.imgAlt.filter(Boolean).join(' ').slice(0, 160),
        rel: e.attrs.rel || '',
        target: e.attrs.target || '',
        className: (e.attrs.class || '').slice(0, 200),
        textIndex: e.textIndex,
      });
    } else {
      out.buttons.push({ text: text.slice(0, 160), ariaLabel: e.attrs['aria-label'] || '', imgAlt: e.imgAlt.join(' '), textIndex: e.textIndex });
    }
  }

  // headings i dokumentordning
  out.headings.sort((a, b) => a.textIndex - b.textIndex);
  out.anchors.sort((a, b) => a.textIndex - b.textIndex);
  out.buttons.sort((a, b) => a.textIndex - b.textIndex);
  return out;
}

export function metaMap(parsed) {
  const map = {};
  for (const m of parsed.metas) {
    const key = (m.name || m.property || m['http-equiv'] || '').toLowerCase();
    if (m.charset !== undefined) map.charset = m.charset;
    if (key && !(key in map)) map[key] = m.content ?? '';
  }
  return map;
}
