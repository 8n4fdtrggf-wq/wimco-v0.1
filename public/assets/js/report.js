// Rapportsidan: /r/:id. All text från analyserade sajter sätts som text, aldrig som HTML.
import { track, initLeadForm } from './site.js';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}

const SRC_LABEL = { measured: 'Uppmätt', rules: 'Regelkontroll', heuristic: 'Bedömning', ai: 'AI-bedömning', mixed: 'Blandat' };
const STATUS_TEXT = { fail: 'Brist', warn: 'Kan förbättras', pass: 'Bra', info: 'Info' };
const CAT_SHORT = { performance: 'Prestanda', mobile: 'Mobil', accessibility: 'Tillgänglighet', seo: 'SEO och teknik', visual: 'Visuell tydlighet', conversion: 'Konvertering' };
const band = (s) => (s == null ? '' : s >= 85 ? 'b-pass' : s >= 60 ? 'b-warn' : 'b-fail');
const fmtDate = (iso) => new Date(iso).toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' });

function srcChip(src) { return el('span', { class: `src src-${src}`, text: SRC_LABEL[src] || src }); }
function mark(status) {
  return el('span', { class: `mark mark-${status}`, role: 'img', 'aria-label': STATUS_TEXT[status] || status });
}

let openAction = null;

function finding(c) {
  const d = el('details', { class: 'finding', id: `f-${c.id}` });
  const meta = el('span', { class: 'f-meta' }, el('span', { text: CAT_SHORT[c.category] }), c.status !== 'pass' ? el('span', { text: `Insats: ${c.effort}` }) : null, srcChip(c.source));
  d.append(el('summary', {},
    mark(c.status),
    el('span', {}, el('span', { class: 'f-title', text: c.title }), meta),
    c.value ? el('span', { class: 'f-value', text: c.value }) : el('span'),
    c.status === 'pass' ? null : el('span', { class: 'f-chev', 'aria-hidden': 'true' })));
  const body = el('div', { class: 'f-body' });
  if (c.detail) body.append(el('p', { text: c.detail }));
  if (c.status !== 'pass') {
    body.append(el('dl', {},
      el('dt', { text: 'Åtgärd' }), el('dd', { text: c.fix }),
      el('dt', { text: 'Möjlig effekt' }), el('dd', { text: `${c.impact}${c.impactText ? ` – ${c.impactText}` : ''}` }),
      el('dt', { text: 'Uppskattad insats' }), el('dd', { text: c.effort })));
    const actions = el('div', { class: 'f-actions' });
    if (c.guideUrl) actions.append(el('a', { class: 'link-arrow', href: c.guideUrl, text: 'Läs guiden' }));
    if (c.cta) {
      const b = el('button', { class: 'btn btn-line btn-sm', type: 'button', text: c.cta });
      b.addEventListener('click', () => { track('service_interest', { service: c.service, from: 'finding' }); openAction?.('review', { service: c.service, context: `${c.cta}: ${c.title}` }); });
      actions.append(b);
    }
    body.append(actions);
  }
  d.append(body);
  if (c.status === 'pass') {
    d.addEventListener('toggle', () => {});
  }
  return d;
}

function board(titleText, cls, checks, emptyText, limit = Infinity) {
  const wrap = el('section', { class: `board ${cls}`, 'aria-label': titleText });
  wrap.append(el('h3', { class: 'board-title' }, titleText, el('span', { class: 'count' }, el('span', { class: 'visually-hidden', text: ', antal: ' }), `${checks.length}`)));
  if (!checks.length) wrap.append(el('p', { class: 'f-meta', text: emptyText }));
  const items = checks.map((c) => finding(c));
  items.forEach((node, i) => { if (i >= limit) node.hidden = true; wrap.append(node); });
  if (checks.length > limit) {
    const more = el('button', { class: 'linklike show-more', type: 'button', 'aria-expanded': 'false', text: `Visa alla ${checks.length}` });
    more.addEventListener('click', () => {
      items.forEach((n) => { n.hidden = false; });
      more.remove();
      items[limit]?.querySelector('summary')?.focus();
    });
    wrap.append(more);
  }
  return wrap;
}

function summarySentence(report, byId) {
  const fix = report.score.priorities.fixFirst.length;
  const cats = report.score.categories.filter((c) => c.score != null).sort((a, b) => a.score - b.score);
  const weakest = cats[0];
  const strongest = cats[cats.length - 1];
  const parts = [];
  if (fix) parts.push(`${fix} ${fix === 1 ? 'sak' : 'saker'} ger mest effekt att åtgärda först.`);
  if (weakest && weakest.score < 85) parts.push(`Störst potential finns inom ${weakest.name.toLowerCase()} (${weakest.score}).`);
  if (strongest && strongest.score >= 70) parts.push(`Starkast är ${strongest.name.toLowerCase()} (${strongest.score}).`);
  return parts.join(' ');
}

function howTable(report) {
  const t = el('table', {},
    el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'Kategori' }), el('th', { scope: 'col', text: 'Vikt' }), el('th', { scope: 'col', text: 'Poäng' }), el('th', { scope: 'col', text: 'Källor' }))),
    el('tbody', {}, report.score.categories.map((c) => el('tr', {},
      el('th', { scope: 'row', text: c.name }),
      el('td', { class: 'num', text: `${Math.round(c.weight * 100)} %` }),
      el('td', { class: 'num', text: c.score ?? 'Ej mätt' }),
      el('td', { text: c.parts.map((p) => `${p.label} (${Math.round(p.share * 100)} %)`).join(' + ') || '–' })))));
  return el('details', { class: 'how' },
    el('summary', { text: 'Så räknas poängen' }),
    el('p', { text: 'Totalbetyget är ett viktat snitt av kategorierna. Kategorier som inte kunde mätas räknas inte in, och vikterna fördelas om.' }),
    t);
}

function catBlock(cat, checks) {
  const b = el('section', { class: 'cat-block', id: `cat-${cat.id}`, 'aria-labelledby': `cat-${cat.id}-h` });
  b.append(el('div', { class: 'cat-head' },
    el('div', {},
      el('h3', { id: `cat-${cat.id}-h`, text: cat.name }),
      el('p', { class: 'cat-expl', text: cat.explanation }),
      el('div', { class: 'cat-parts' }, cat.parts.map((p) => el('span', { class: `src src-${p.source}`, text: `${p.sourceLabel} · ${Math.round(p.share * 100)} %` })))),
    el('p', { class: 'cat-score' }, cat.score ?? '–', el('small', { text: ' /100' }))));
  if (cat.limited) b.append(el('p', { class: 'cat-expl', text: 'Lighthouse-mätningen var inte tillgänglig. Poängen bygger på regelkontroller och är mindre säker än vanligt.' }));
  if (cat.score != null) {
    const facts = el('dl', { class: 'cat-facts' },
      el('div', {}, el('dt', { text: 'Fungerar bra' }), el('dd', { text: cat.strength || 'Inget som sticker ut positivt ännu.' })),
      el('div', {}, el('dt', { text: 'Största problemet' }), el('dd', { text: cat.problem || 'Inga problem hittades.' })),
      el('div', { class: 'span' }, el('dt', { text: 'Rekommenderad åtgärd' }), el('dd', { text: cat.recommendation })),
      el('div', {}, el('dt', { text: 'Möjlig effekt' }), el('dd', { text: cat.impact || '–' })),
      el('div', {}, el('dt', { text: 'Uppskattad insats' }), el('dd', { text: cat.effort || '–' })));
    b.append(facts);
  }
  if (cat.ai) {
    b.append(el('div', { class: 'cat-ai' },
      srcChip('ai'),
      el('p', { text: cat.ai.summary }),
      cat.ai.problem ? el('p', {}, el('strong', { text: 'Problem: ' }), cat.ai.problem) : null,
      cat.ai.fix ? el('p', {}, el('strong', { text: 'Förslag: ' }), cat.ai.fix) : null));
  }
  if (cat.cta) {
    const btn = el('button', { class: 'btn btn-ink', type: 'button', text: cat.cta });
    btn.addEventListener('click', () => { track('service_interest', { service: cat.service, from: 'category' }); openAction?.('review', { service: cat.service, context: `${cat.cta} (${cat.name})` }); });
    b.append(el('div', { class: 'cat-cta' }, btn));
  }
  const list = el('ul', {}, checks.map((c) => el('li', {}, mark(c.status), el('span', {}, c.title, c.value ? el('span', { class: 'f-meta mono', text: ` ${c.value}` }) : null), srcChip(c.source))));
  b.append(el('details', { class: 'cat-checks' }, el('summary', { text: `Alla ${checks.length} kontroller` }), list));
  return b;
}

/* ---------- Åtgärdspanelen ---------- */
function field(id, label, input, opt) {
  return el('div', { class: 'field' }, el('label', { for: id }, label, opt ? el('span', { class: 'opt', text: ' (valfritt)' }) : null), input);
}

function formFor(kind, report, ctx) {
  const f = el('form', { class: 'lead-form', 'data-kind': kind, novalidate: true });
  const hp = el('div', { class: 'hp', 'aria-hidden': 'true' }, el('label', {}, 'Lämna tomt', el('input', { name: 'company_site', tabindex: '-1', autocomplete: 'off' })));
  const name = () => field(`a-name-${kind}`, 'Namn', el('input', { id: `a-name-${kind}`, name: 'name', autocomplete: 'name', required: kind === 'quote' || kind === 'implement' || kind === 'review' }));
  const email = () => field(`a-email-${kind}`, 'E-post', el('input', { id: `a-email-${kind}`, name: 'email', type: 'email', autocomplete: 'email', required: true }));
  const msg = (required, value, placeholder) => {
    const t = el('textarea', { id: `a-msg-${kind}`, name: 'message', rows: '4', required, placeholder });
    t.value = value || '';
    return field(`a-msg-${kind}`, required ? 'Vad vill du ha hjälp med?' : 'Något vi bör veta?', t, !required);
  };
  const status = el('p', { class: 'form-status', role: 'status', 'aria-live': 'polite', 'data-form-status': true });
  const submit = (label) => el('button', { class: 'btn btn-ink', type: 'submit' }, el('span', { class: 'btn-label', text: label }));
  const note = el('p', { class: 'form-note' }, 'Vi använder uppgifterna bara för att svara dig. ', el('a', { href: '/integritet/', text: 'Integritet' }));

  if (kind === 'review') {
    f.append(el('div', { class: 'field-row' }, name(), email()),
      field(`a-phone`, 'Telefon', el('input', { id: 'a-phone', name: 'phone', type: 'tel', autocomplete: 'tel' }), true),
      msg(false, ctx?.context ? `${ctx.context}\n` : '', 'T.ex. vilka tider som passar…'), hp, note, submit('Boka genomgång'), status);
  } else if (kind === 'implement') {
    f.append(el('div', { class: 'field-row' }, name(), email()),
      msg(true, `Jag vill att Wimco åtgärdar det som står under ”Åtgärda först” för ${report.host}.`), hp, note, submit('Skicka förfrågan'), status);
  } else if (kind === 'quote') {
    const budget = el('select', { id: 'a-budget', name: 'budget' },
      ['Vet inte än', 'Under 25 000 kr', '25 000–75 000 kr', '75 000–150 000 kr', 'Över 150 000 kr'].map((o, i) => el('option', { value: i ? o : '', text: o })));
    f.append(el('div', { class: 'field-row' }, name(), email()),
      el('div', { class: 'field-row' }, field('a-company', 'Företag', el('input', { id: 'a-company', name: 'company', autocomplete: 'organization' }), true), field('a-budget', 'Ungefärlig budget', budget, true)),
      msg(true, '', 'T.ex. ny design, snabbare sajt eller automatiserade förfrågningar…'), hp, note, submit('Begär offert'), status);
  } else if (kind === 'report_email') {
    f.append(email(),
      el('label', { class: 'check' }, el('input', { type: 'checkbox', name: 'consent', required: true }), el('span', { text: `Mejla mig länken till rapporten för ${report.host}.` })),
      el('label', { class: 'check' }, el('input', { type: 'checkbox', name: 'remind' }), el('span', { text: 'Påminn mig om en ny analys om 3 månader, så jag kan jämföra (ett enda mejl).' })),
      hp, el('p', { class: 'form-note' }, 'Vi skickar bara det du bett om. ', el('a', { href: '/integritet/', text: 'Integritet' })), submit('Skicka rapporten'), status);
  }
  return f;
}

function initActions(report, host) {
  const panel = el('section', { class: 'actions-panel', id: 'hjalp', 'aria-labelledby': 'hjalp-h' });
  panel.append(el('h2', { class: 'h-lg', id: 'hjalp-h', text: 'Vill du ha hjälp med det här?' }),
    el('p', { text: 'Rapporten är din att använda som du vill. Om du vill ha hjälp att genomföra förbättringarna, eller bygga något nytt, finns vi här.' }));
  const tabs = el('div', { class: 'action-tabs', role: 'group', 'aria-label': 'Välj vad du vill göra' });
  const body = el('div', { class: 'action-body', tabindex: '-1' });
  const ACTIONS = [
    ['review', 'Boka kostnadsfri genomgång'],
    ['implement', 'Be Wimco genomföra förbättringarna'],
    ['quote', 'Begär offert'],
    ['report_email', 'Få rapporten via e-post'],
    ['share', 'Dela rapporten'],
    ['rerun', 'Kör analysen igen'],
  ];
  const buttons = {};
  for (const [k, label] of ACTIONS) {
    const b = el('button', { type: 'button', 'aria-pressed': 'false', 'aria-controls': 'hjalp-body', text: label });
    b.addEventListener('click', () => select(k));
    buttons[k] = b;
    tabs.append(b);
  }
  body.id = 'hjalp-body';
  panel.append(tabs, body);

  function select(kind, ctx = {}, focus = false) {
    for (const [k, b] of Object.entries(buttons)) b.setAttribute('aria-pressed', String(k === kind));
    body.replaceChildren();
    const intro = {
      review: ['Kostnadsfri genomgång', '20 minuter där vi går igenom rapporten tillsammans och prioriterar. Inga förpliktelser.'],
      implement: ['Låt Wimco fixa det', 'Vi går igenom punkterna, uppskattar insatsen och återkommer med ett förslag.'],
      quote: ['Begär offert', 'Beskriv vad du vill uppnå så återkommer vi med ett konkret förslag och pris.'],
      report_email: ['Rapporten i inkorgen', 'Du får en länk till rapporten. Inga nyhetsbrev.'],
      share: ['Dela rapporten', 'Länken fungerar för alla som har den. Rapporten visas inte i sökmotorer om du inte väljer det.'],
      rerun: ['Kör analysen igen', 'Har du gjort ändringar? Kör en ny analys och jämför med den här.'],
    }[kind];
    body.append(el('h3', { text: intro[0] }), el('p', { text: intro[1] }));
    if (['review', 'implement', 'quote', 'report_email'].includes(kind)) {
      const f = formFor(kind, report, ctx);
      body.append(f);
      initLeadForm(f, {
        extra: () => ({ reportId: report.id, service: ctx.service || undefined, context: ctx.context || undefined, site: report.url }),
        onSuccess: (data, sent) => {
          const done = el('div', { class: 'form-done', tabindex: '-1' });
          if (kind === 'report_email') {
            done.append(el('h4', { text: data.mailed ? 'Rapporten är skickad.' : 'Vi har tagit emot din begäran.' }),
              el('p', { text: data.mailed ? `Kolla inkorgen för ${sent.email}.` : 'E-post är inte aktiverat just nu – spara länken under ”Dela rapporten” så länge.' }),
              data.remindOn ? el('p', { text: `Vi påminner dig ${new Date(data.remindOn).toLocaleDateString('sv-SE', { dateStyle: 'long' })}.` }) : null);
          } else {
            done.append(el('h4', { text: 'Tack – det är skickat.' }), el('p', { text: `Willem återkommer till ${sent.email} så snart som möjligt.` }));
          }
          f.replaceWith(done);
          done.focus();
        },
      });
    } else if (kind === 'share') {
      const url = `${location.origin}/r/${report.id}`;
      const input = el('input', { value: url, readonly: true, 'aria-label': 'Länk till rapporten' });
      const copy = el('button', { class: 'btn btn-ink', type: 'button', text: 'Kopiera länk' });
      const msg = el('p', { class: 'form-status', role: 'status', 'aria-live': 'polite' });
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(url); msg.textContent = 'Länken är kopierad.'; msg.className = 'form-status is-ok'; }
        catch { input.select(); msg.textContent = 'Markerad – tryck Ctrl+C eller ⌘C för att kopiera.'; msg.className = 'form-status'; }
        track('share', { method: 'copy' });
      });
      const row = el('div', { class: 'share-row' }, input, copy);
      if (navigator.share) {
        const s = el('button', { class: 'btn btn-line', type: 'button', text: 'Dela…' });
        s.addEventListener('click', () => navigator.share({ title: `Wimco Score för ${report.host}`, url }).then(() => track('share', { method: 'native' })).catch(() => {}));
        row.append(s);
      }
      body.append(row, msg);
      const owner = (() => { try { return localStorage.getItem(`wimco-owner-${report.id}`); } catch { return null; } })();
      if (owner && !report.devData) {
        const cb = el('input', { type: 'checkbox', id: 'vis' });
        cb.checked = !!report.public;
        const vmsg = el('p', { class: 'form-status', role: 'status', 'aria-live': 'polite' });
        cb.addEventListener('change', async () => {
          const res = await fetch(`/api/report/${report.id}/visibility`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ownerToken: owner, public: cb.checked }) }).catch(() => null);
          const ok = res && res.ok;
          if (!ok) cb.checked = !cb.checked;
          vmsg.textContent = ok ? (cb.checked ? 'Rapporten är nu offentlig och får visas i sökmotorer.' : 'Rapporten är privat igen.') : 'Det gick inte att ändra just nu.';
          vmsg.className = `form-status ${ok ? 'is-ok' : 'is-error'}`;
          if (ok) report.public = cb.checked;
        });
        body.append(el('div', { class: 'visibility' },
          el('label', { class: 'check', for: 'vis' }, cb, el('span', { text: 'Gör rapporten offentlig och sökbar. Den visas då i sökmotorer. Du kan ändra dig när som helst.' })), vmsg));
      }
    } else if (kind === 'rerun') {
      body.append(el('div', { class: 'share-row' },
        el('a', { class: 'btn btn-signal', href: `/?url=${encodeURIComponent(report.url)}&prev=${report.id}#analys`, text: `Analysera ${report.host} igen` }),
        el('a', { class: 'btn btn-line', href: '/#analys', text: 'Analysera en annan sajt' })));
    }
    track('report_action', { action: kind });
    if (focus) {
      panel.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      setTimeout(() => body.querySelector('input:not([type=hidden]):not([tabindex="-1"]), textarea, button')?.focus({ preventScroll: true }), reduced() ? 0 : 450);
    }
  }
  openAction = (kind, ctx) => select(kind, ctx, true);
  select('review');
  host.append(panel);
}

/* ---------- Render ---------- */
function render(report, root) {
  const byId = Object.fromEntries(report.checks.map((c) => [c.id, c]));
  root.replaceChildren();
  document.title = `${report.host}: ${report.score.total}/100 i Wimco Score | Wimco`;

  const head = el('header', { class: 'report-head' },
    el('h1', { class: 'report-host' }, report.host.split('.').flatMap((part, i, arr) => (i < arr.length - 1 ? [`${part}.`, el('wbr')] : [part]))),
    el('p', { class: 'report-meta' },
      el('span', { text: `Wimco Score · analyserad ${fmtDate(report.createdAt)}` }),
      el('a', { href: report.finalUrl, rel: 'nofollow noopener noreferrer', target: '_blank', text: report.finalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') }),
      report.redirects?.length ? el('span', { text: `${report.redirects.length} vidarebefordran` }) : null),
    el('p', { class: 'legend' }, 'Källor: ', srcChip('measured'), 'Google Lighthouse', srcChip('rules'), 'kontroll av sidans kod', srcChip('heuristic'), 'tolkning enligt fasta regler', report.ai?.ok ? [srcChip('ai'), 'språkmodell'] : null));
  if (report.devData) {
    head.append(el('div', { class: 'dev-banner', role: 'note' },
      el('strong', { text: 'Utvecklingsdata – inte en verklig mätning' }),
      el('span', { text: 'Den här rapporten skapades i en testmiljö med simulerade Lighthouse-värden. Använd den inte som underlag för beslut.' })));
  }
  root.append(head);

  const sb = el('section', { class: 'scoreboard', 'aria-label': 'Totalbetyg' });
  sb.append(el('div', {}, el('p', { class: 'sb-num', text: report.score.total ?? '–' }), el('p', { class: 'sb-of', text: 'av 100' })));
  const sbBody = el('div', { class: 'sb-body' }, el('p', { class: 'grade', text: report.score.grade || '' }), el('p', { text: summarySentence(report, byId) }));
  if (report.previous) {
    const diff = report.score.total - report.previous.total;
    sbBody.append(el('p', { class: 'sb-compare', text: `Jämfört med ${fmtDate(report.previous.createdAt)}: ${report.previous.total} → ${report.score.total} (${diff >= 0 ? '+' : ''}${diff}).` }));
  }
  if (!report.psi?.ok) sbBody.append(el('p', { text: `${report.psi?.reasonText || 'Lighthouse-mätning ej tillgänglig'}.` }));
  sbBody.append(howTable(report));
  sb.append(sbBody);
  if (report.screenshot && /^data:image\/(jpeg|png|webp);base64,/.test(report.screenshot)) {
    sb.append(el('div', { class: 'sb-shot' }, el('figure', {},
      el('img', { src: report.screenshot, alt: `Skärmdump av ${report.host} i Lighthouse mobiltest`, width: '412', height: '823', loading: 'lazy' }),
      el('figcaption', { text: 'Första skärmen på mobil, enligt Lighthouse' }))));
  }
  root.append(sb);

  root.append(el('nav', { 'aria-label': 'Kategorier' }, el('ol', { class: 'catline' }, report.score.categories.map((c) =>
    el('li', {}, el('a', { href: `#cat-${c.id}` },
      el('span', { class: `cl-dot ${band(c.score)}`, 'aria-hidden': 'true' }),
      el('span', { class: 'cl-name', text: CAT_SHORT[c.id] || c.name }),
      el('span', { class: 'cl-score' }, c.score ?? '–', el('small', { text: '/100' }))))))));

  const P = report.score.priorities;
  const pick = (ids) => ids.map((id) => byId[id]).filter(Boolean);
  const prio = el('section', { class: 'r-section', 'aria-labelledby': 'prio-h' },
    el('h2', { class: 'h-lg', id: 'prio-h', text: 'Det här ger mest effekt' }),
    board('Åtgärda först', 'board-first', pick(P.fixFirst), 'Inget akut – bra jobbat.'),
    el('div', { class: 'prio-grid' },
      board('Nästa förbättring', 'board-next', pick(P.next), 'Inga fler förbättringar hittades.'),
      board('Bra redan nu', 'board-good', pick(P.good), 'Inga styrkor att lyfta ännu.', 4)));
  root.append(prio);

  const cats = el('section', { class: 'r-section', 'aria-labelledby': 'cats-h' }, el('h2', { class: 'h-lg', id: 'cats-h', text: 'Kategori för kategori' }));
  for (const cat of report.score.categories) cats.append(catBlock(cat, report.checks.filter((c) => c.category === cat.id && c.status !== 'info')));
  root.append(cats);

  initActions(report, root);

  const method = el('section', { class: 'method', 'aria-labelledby': 'method-h' },
    el('h2', { id: 'method-h', text: 'Så gjordes analysen' }),
    el('p', { text: `Sidan hämtades från Wimcos server och lästes som data – ingen kod från sajten kördes. ${report.psi?.ok ? `Prestanda, tillgänglighet och SEO mättes med Google Lighthouse ${report.psi.lighthouseVersion || ''} i ett mobiltest via PageSpeed Insights${report.psi.fetchTime ? ` (${fmtDate(report.psi.fetchTime)})` : ''}.` : (report.psi?.reasonText || 'Lighthouse-mätning var inte tillgänglig') + '.'}` }),
    el('p', { text: report.ai?.ok ? 'Visuell tydlighet och konvertering bedömdes både enligt fasta regler och av en språkmodell som fick se sidans första skärm.' : 'Visuell tydlighet och konvertering bedömdes enligt fasta regler. Det är tolkningar, inte mätningar – en människa kan se saker reglerna missar.' }),
    el('p', { text: 'Analysen gäller den adress som angavs, inte hela sajten. Lighthouse-värden kan variera något mellan körningar.' }),
    el('p', {}, el('a', { class: 'link-arrow', href: '/wimco-score/', text: 'Läs mer om metoden' })));
  root.append(method);
}

function renderMissing(root, message) {
  root.replaceChildren(el('div', { class: 'report-loading' },
    el('h1', { class: 'h-lg', text: 'Rapporten hittades inte' }),
    el('p', { text: message }),
    el('p', {}, el('a', { class: 'btn btn-signal', href: '/#analys', text: 'Analysera en webbplats' }))));
}

async function main() {
  const root = document.querySelector('[data-report]');
  if (!root) return;
  const m = /^\/r\/([a-z0-9]{8,20})\/?$/.exec(location.pathname);
  const id = m ? m[1] : new URLSearchParams(location.search).get('id');
  if (!id || !/^[a-z0-9]{8,20}$/.test(id)) { renderMissing(root, 'Länken verkar vara ofullständig.'); return; }
  try {
    const res = await fetch(`/api/report/${id}`, { headers: { accept: 'application/json' } });
    if (!res.ok) { renderMissing(root, res.status === 404 ? 'Rapporten finns inte eller har gått ut. Rapporter sparas i 180 dagar.' : 'Något gick fel när rapporten skulle hämtas. Försök igen om en stund.'); return; }
    const report = await res.json();
    render(report, root);
    track('report_view', { score_band: Math.floor((report.score.total ?? 0) / 10) * 10 });
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch {
    renderMissing(root, 'Vi fick ingen kontakt med servern. Kontrollera din uppkoppling och ladda om sidan.');
  }
}

main();
