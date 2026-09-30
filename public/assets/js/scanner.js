// Heron: linjekartan som exempel, sedan som verklig progressindikator för analysen.
import { track, getTurnstileToken, initTabs } from './site.js';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (sel, root = document) => root.querySelector(sel);

const SOURCE = { measured: 'Uppmätt', rules: 'Regelkontroll', heuristic: 'Bedömning', ai: 'AI-bedömning' };

const DEMO_NOTES = {
  structure: '1 H1 · 640 ord',
  seo: 'Metabeskrivning saknas',
  performance: 'LCP 3,1 s på mobil',
  mobile: 'Viewport ok · zoom låst',
  compile: '3 saker att åtgärda först',
};

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

function initScanner() {
  const root = $('[data-scanner]');
  if (!root) return;
  const form = $('[data-scan-form]', root);
  const input = $('[data-scan-input]', root);
  const submit = $('[data-scan-submit]', root);
  const errorEl = $('[data-scan-error]', root);
  const map = $('[data-linemap]', root);
  const tag = $('[data-linemap-tag]', root);
  const title = $('[data-linemap-title]', root);
  const stationsEl = $('[data-stations]', root);
  const stations = [...root.querySelectorAll('.station')];
  const train = $('[data-train]', root);
  const live = $('[data-scan-live]', root);
  const notice = $('[data-scan-notice]', root);
  const result = $('[data-scan-result]', root);
  const track_ = map.querySelector('.linemap-track');
  const defaultNotes = Object.fromEntries(stations.map((s) => [s.dataset.step, $('[data-note]', s).textContent]));

  let running = false;
  let controller = null;
  const cancelBtn = el('button', { class: 'scan-cancel', type: 'button', text: 'Avbryt' });
  cancelBtn.hidden = true;
  $('.linemap-caption', map).append(cancelBtn);
  cancelBtn.addEventListener('click', () => controller?.abort());
  let demoTimer = null;
  let demoOn = false;
  let demoPaused = false;
  let demoLoops = 0;
  const demoToggle = el('button', { class: 'demo-toggle', type: 'button', 'aria-pressed': 'false', text: 'Pausa exemplet' });
  if (!reduced()) $('.linemap-caption', map).append(demoToggle);
  demoToggle.addEventListener('click', () => {
    demoPaused = !demoPaused;
    demoToggle.setAttribute('aria-pressed', String(demoPaused));
    demoToggle.textContent = demoPaused ? 'Spela exemplet' : 'Pausa exemplet';
    if (demoPaused) { stopDemo(); showDemoFinal(); } else { demoLoops = 0; runDemo(); }
  });
  function showDemoFinal() {
    for (const s of stations) setStation(s.dataset.step, 'done', DEMO_NOTES[s.dataset.step]);
    map.classList.remove('has-train');
  }
  let current = -1;
  let prevId = null;

  const branches = $('[data-branches]', root);
  const SERVICE_BRANCH = { hemsidor: 'h', webbutveckling: 'w', automation: 'a', optimering: 'o' };
  function clearBranches() {
    if (!branches) return;
    branches.classList.remove('has-focus');
    branches.querySelectorAll('.is-hot').forEach((n) => n.classList.remove('is-hot'));
    branches.querySelectorAll('.branch-hint').forEach((n) => n.remove());
  }
  function focusBranches(services) {
    if (!branches) return;
    clearBranches();
    const hot = [...new Set(services)].filter((sv) => SERVICE_BRANCH[sv]);
    if (!hot.length) return;
    branches.classList.add('has-focus');
    for (const sv of hot) {
      branches.querySelector(`.bl-${SERVICE_BRANCH[sv]}`)?.classList.add('is-hot');
      const link = branches.querySelector(`[data-branch="${sv}"]`);
      if (link) { link.classList.add('is-hot'); link.append(el('span', { class: 'branch-hint', text: 'Byt här' })); }
    }
  }

  /* ---- Tåget och fyllnaden ---- */
  function positionTrain(index) {
    const s = stations[index];
    if (!s) return;
    const dot = $('.st-dot', s);
    const tr = track_.getBoundingClientRect();
    const d = dot.getBoundingClientRect();
    train.style.setProperty('--train-x', `${d.left - tr.left - 50}px`);
    const ol = stationsEl.getBoundingClientRect();
    const first = $('.st-dot', stations[0]).getBoundingClientRect();
    const vertical = getComputedStyle(stationsEl).gridTemplateColumns.split(' ').length === 1;
    const p = vertical
      ? (d.top + d.height / 2 - (first.top + first.height / 2)) / (ol.bottom + 65 - (first.top + first.height / 2))
      : (d.left + d.width / 2 - (first.left + first.width / 2)) / (ol.right - (first.left + first.width / 2));
    stationsEl.style.setProperty('--progress', String(Math.max(0, Math.min(1, p))));
  }
  window.addEventListener('resize', () => { if (current >= 0) positionTrain(current); });

  function setStation(step, state, note) {
    const i = stations.findIndex((s) => s.dataset.step === step);
    if (i < 0) return;
    const s = stations[i];
    s.classList.remove('is-active', 'is-done', 'is-limited', 'is-error');
    if (state) s.classList.add(`is-${state}`);
    if (note != null) {
      const n = $('[data-note]', s);
      n.textContent = note;
      n.classList.remove('is-desc');
    }
    if (state === 'active') { current = i; positionTrain(i); }
    if ((state === 'done' || state === 'limited') && i === stations.length - 1) {
      stationsEl.style.setProperty('--progress', '1');
    }
  }

  function resetStations(notes = defaultNotes) {
    for (const s of stations) {
      s.classList.remove('is-active', 'is-done', 'is-limited', 'is-error', 'v-pass', 'v-warn', 'v-fail');
      const n = $('[data-note]', s);
      n.textContent = notes[s.dataset.step] || '';
      n.classList.toggle('is-desc', notes === defaultNotes);
    }
    clearBranches();
    stationsEl.style.setProperty('--progress', '0');
    current = -1;
  }

  /* ---- Exempelkörning ---- */
  function stopDemo() {
    demoOn = false;
    clearTimeout(demoTimer);
    map.classList.remove('has-train');
  }

  function runDemo() {
    if (running || demoPaused) return;
    if (reduced()) {
      map.dataset.mode = 'demo';
      for (const s of stations) setStation(s.dataset.step, 'done', DEMO_NOTES[s.dataset.step]);
      return;
    }
    demoOn = true;
    map.dataset.mode = 'demo';
    resetStations();
    let i = 0;
    const step = () => {
      if (!demoOn) return;
      if (i > 0) setStation(stations[i - 1].dataset.step, 'done', DEMO_NOTES[stations[i - 1].dataset.step]);
      if (i >= stations.length) {
        map.classList.remove('has-train');
        demoLoops++;
        if (demoLoops >= 3) {
          // Stannar av sig själv; kan startas igen med knappen.
          demoOn = false;
          demoPaused = true;
          demoToggle.setAttribute('aria-pressed', 'true');
          demoToggle.textContent = 'Spela exemplet';
          return;
        }
        demoTimer = setTimeout(() => { if (demoOn) { resetStations(); i = 0; demoTimer = setTimeout(step, 700); } }, 3200);
        return;
      }
      map.classList.add('has-train');
      setStation(stations[i].dataset.step, 'active');
      i++;
      demoTimer = setTimeout(step, 1250);
    };
    demoTimer = setTimeout(step, 900);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (running) return;
        if (e.isIntersecting && !demoOn && !demoPaused && map.dataset.mode === 'demo') runDemo();
        else if (!e.isIntersecting && demoOn) stopDemo();
      }
    }, { threshold: 0.2 }).observe(map);
  } else runDemo();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && demoOn) stopDemo();
  });

  /* ---- Formulär ---- */
  function fieldError(msg) {
    errorEl.textContent = msg || '';
    errorEl.hidden = !msg;
    form.classList.toggle('has-error', !!msg);
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    input.setAttribute('aria-describedby', msg ? 'scan-error scan-hint' : 'scan-hint');
  }
  input.addEventListener('input', () => fieldError(null));

  function busy(on) {
    running = on;
    cancelBtn.hidden = !on;
    input.readOnly = on;
    submit.disabled = on;
    submit.classList.toggle('is-busy', on);
    const label = $('.btn-label', submit);
    submit.querySelector('.spinner')?.remove();
    if (on) { submit.prepend(el('span', { class: 'spinner', 'aria-hidden': 'true' })); label.textContent = 'Analyserar…'; }
    else label.textContent = 'Analysera min webbplats';
  }

  function announce(text) { live.textContent = text; }

  function showNotice(kind, heading, message, actions = []) {
    notice.replaceChildren();
    notice.className = `scan-notice ${kind === 'error' ? 'is-error' : 'is-warn'}`;
    notice.append(el('h2', { text: heading }), el('p', { text: message }));
    if (actions.length) notice.append(el('div', { class: 'notice-actions' }, actions));
    notice.hidden = false;
  }

  const actionRetry = () => {
    const b = el('button', { class: 'btn btn-ink btn-sm', type: 'button', text: 'Försök igen' });
    b.addEventListener('click', () => start());
    return b;
  };
  const actionOther = () => {
    const b = el('button', { class: 'btn btn-line btn-sm', type: 'button', text: 'Prova en annan adress' });
    b.addEventListener('click', () => { input.select(); input.focus(); });
    return b;
  };
  const actionHuman = (text = 'Be om en manuell genomgång') => el('a', { class: 'btn btn-line btn-sm', href: '#starta', text });

  function handleError(code, message, retryAfter) {
    map.dataset.mode = 'error';
    tag.textContent = 'Stoppad';
    title.textContent = title.textContent.replace(/^Analyserar /, 'Kunde inte analysera ').replace(/^Förbereder analys…$/, 'Analysen startade inte');
    if (current >= 0) setStation(stations[current].dataset.step, 'error', 'Stoppad här');
    map.classList.remove('has-train');
    track('analysis_error', { code });
    switch (code) {
      case 'invalid_url':
        resetToIdle();
        fieldError(message);
        input.focus();
        return;
      case 'blocked_target':
        showNotice('error', 'Den adressen kan vi inte analysera', message, [actionOther()]);
        break;
      case 'site_blocked':
        showNotice('warn', 'Webbplatsen blockerar analys', `${message} Många sajter skyddas mot robotar, till exempel av Cloudflare. Det är bra för säkerheten men gör att vi inte kommer åt sidan automatiskt.`, [actionOther(), actionHuman()]);
        break;
      case 'rate_limited': {
        const min = Math.max(1, Math.ceil((retryAfter || 600) / 60));
        showNotice('warn', 'Paus i analyserna', message || `Du har kört många analyser på kort tid. Försök igen om ${min} min.`, [actionHuman('Boka en genomgång i stället')]);
        break;
      }
      case 'bot_check':
      case 'forbidden':
        showNotice('error', 'Säkerhetskontrollen stoppade analysen', message, [actionRetry()]);
        break;
      default:
        showNotice('error', 'Analysen misslyckades', message || 'Något gick fel. Försök igen om en stund.', [actionRetry(), actionHuman()]);
    }
    announce(`Analysen stoppades. ${message || ''}`);
  }

  function cancelled() {
    resetToIdle();
    announce('Analysen avbröts.');
    input.focus();
    track('analysis_cancel', {});
  }

  function resetToIdle() {
    map.dataset.mode = 'demo';
    tag.textContent = 'Exempel';
    title.textContent = 'Så går en analys till';
    resetStations();
  }

  async function start(prefillUrl) {
    if (running) return;
    const raw = (prefillUrl ?? input.value).trim();
    if (prefillUrl != null) input.value = raw;
    if (!raw) { fieldError('Skriv adressen till din webbplats, till exempel dittforetag.se.'); input.focus(); return; }
    if (/\s/.test(raw) || !/[.]/.test(raw.replace(/^https?:\/\//i, ''))) {
      fieldError('Det där ser inte ut som en webbadress. Prova till exempel dittforetag.se.');
      input.focus();
      return;
    }
    fieldError(null);
    stopDemo();
    notice.hidden = true;
    result.hidden = true;
    busy(true);
    map.dataset.mode = 'live';
    tag.textContent = 'Förbereder';
    title.textContent = 'Förbereder analys…';
    resetStations(Object.fromEntries(stations.map((s) => [s.dataset.step, ''])));
    map.classList.toggle('has-train', !reduced());
    announce('Analysen förbereds.');
    track('analysis_start', {});

    let token = null;
    try { token = await getTurnstileToken(); } catch { token = null; }

    let res;
    controller = new AbortController();
    try {
      res = await fetch('/api/analyze', {
        signal: controller.signal,
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/x-ndjson' },
        body: JSON.stringify({ url: raw, prev: prevId, turnstileToken: token, company_site: form.company_site?.value || '' }),
      });
    } catch {
      busy(false);
      if (controller.signal.aborted) { cancelled(); return; }
      handleError('failed', 'Vi fick ingen kontakt med analysservern. Kontrollera din uppkoppling och försök igen.');
      return;
    }

    if (!res.ok || !(res.headers.get('content-type') || '').includes('ndjson')) {
      const data = await res.json().catch(() => ({}));
      busy(false);
      handleError(data.code || 'failed', data.message, data.retryAfter);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let finished = false;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev;
          try { ev = JSON.parse(line); } catch { continue; }
          if (handleEvent(ev)) finished = true;
        }
      }
    } catch {
      if (controller.signal.aborted) { busy(false); cancelled(); return; }
      if (!finished) handleError('failed', 'Anslutningen bröts under analysen. Försök igen.');
    }
    if (!finished && map.dataset.mode === 'live') handleError('failed', 'Analysen avslutades oväntat. Försök igen.');
    busy(false);
  }

  function handleEvent(ev) {
    switch (ev.type) {
      case 'accepted':
        tag.textContent = 'Analyserar';
        title.textContent = `Analyserar ${ev.host}`;
        announce(`Analyserar ${ev.host}.`);
        return false;
      case 'step': {
        const note = (ev.summary || []).slice(0, 2).join(' · ');
        if (ev.status === 'running') {
          setStation(ev.id, 'active', 'Pågår…');
          announce(ev.label + '.');
        } else if (ev.status === 'done') {
          setStation(ev.id, 'done', ev.cached ? 'Klar (sparad analys)' : note);
        } else if (ev.status === 'limited') {
          setStation(ev.id, 'limited', note);
        }
        return false;
      }
      case 'error':
        handleError(ev.code, ev.message);
        return true;
      case 'result':
        showResult(ev.report, ev.ownerToken, ev.cached);
        return true;
      default:
        return false;
    }
  }

  function showResult(report, ownerToken, cached) {
    map.dataset.mode = 'done';
    map.classList.remove('has-train');
    tag.textContent = 'Klar';
    title.textContent = `Analys av ${report.host}`;
    if (ownerToken) { try { localStorage.setItem(`wimco-owner-${report.id}`, ownerToken); } catch { /* privat läge */ } }
    track('analysis_complete', { score_band: Math.floor((report.score.total ?? 0) / 10) * 10, cached: !!cached });

    const byId = Object.fromEntries(report.checks.map((c) => [c.id, c]));
    const top = report.score.priorities.fixFirst.map((id) => byId[id]).filter(Boolean);
    const catScore = Object.fromEntries(report.score.categories.map((c) => [c.id, c.score]));
    const STEP_CATS = { structure: ['visual'], seo: ['seo', 'accessibility'], performance: ['performance'], mobile: ['mobile'], compile: ['conversion'] };
    for (const st of stations) {
      const vals = STEP_CATS[st.dataset.step].map((k) => catScore[k]).filter((v) => v != null);
      if (!vals.length) continue;
      const v = Math.min(...vals);
      st.classList.add(v >= 85 ? 'v-pass' : v >= 60 ? 'v-warn' : 'v-fail');
    }
    focusBranches([...report.score.priorities.fixFirst, ...report.score.priorities.next.slice(0, 2)].map((id) => byId[id]?.service));
    result.replaceChildren();
    const score = el('div', { class: 'sr-score' },
      el('span', { class: 'sr-num', text: report.score.total ?? '–' }),
      el('span', { class: 'sr-of', text: 'av 100 · Wimco Score' }),
      el('span', { class: 'tag sr-grade', text: report.score.grade || '' }));
    const body = el('div', { class: 'sr-body' });
    body.append(el('h2', { id: 'scan-result-title', text: report.host }));
    if (report.devData) body.append(el('p', { class: 'sr-dev', text: 'Utvecklingsdata – inte en verklig mätning.' }));
    if (report.previous) {
      const diff = report.score.total - report.previous.total;
      body.append(el('p', { text: `Förra analysen: ${report.previous.total}. Nu: ${report.score.total} (${diff >= 0 ? '+' : ''}${diff}).` }));
    }
    if (top.length) {
      body.append(el('p', { text: 'Åtgärda först:' }));
      const LINE = { hemsidor: ['h', 'H'], webbutveckling: ['w', 'W'], automation: ['a', 'A'], optimering: ['o', 'O'] };
      body.append(el('ol', { class: 'sr-top' }, top.map((c) => {
        const [cls, letter] = LINE[c.service] || LINE.optimering;
        return el('li', {},
          el('span', { class: `mark mark-${c.status}`, role: 'img', 'aria-label': c.status === 'fail' ? 'Brist' : 'Kan förbättras' }),
          el('span', {}, el('strong', { text: c.title }), ' – ', c.fix, ' ',
            el('a', { class: 'sr-line', href: '#tjanster', 'data-service-link': c.service, 'data-prefill-service': c.service },
              el('span', { class: `badge badge-${cls}`, 'aria-hidden': 'true', text: letter }), c.cta || c.serviceName || 'Få hjälp')));
      })));
    } else {
      body.append(el('p', { text: 'Inga akuta problem hittades. Rapporten visar vad du kan finslipa.' }));
    }
    const again = el('button', { class: 'btn btn-line', type: 'button', text: 'Analysera en annan sida' });
    again.addEventListener('click', () => {
      result.hidden = true;
      resetToIdle();
      input.value = '';
      input.focus();
    });
    body.append(el('div', { class: 'sr-actions' },
      el('a', { class: 'btn btn-signal', href: `/r/${report.id}`, 'data-track': 'open_report', text: 'Visa hela rapporten' }),
      again));
    result.append(score, body);
    result.hidden = false;
    announce(`Analysen är klar. ${report.host} fick ${report.score.total} av 100.`);
    document.dispatchEvent(new CustomEvent('wimco:analysis-done'));
    result.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); start(); });

  // Förifyllt från påminnelsemejl eller rapport: ?url=...&prev=...
  const params = new URLSearchParams(location.search);
  if (params.get('url')) {
    input.value = params.get('url');
    if (/^[a-z0-9]{8,20}$/.test(params.get('prev') || '')) {
      prevId = params.get('prev');
      const hint = $('#scan-hint');
      if (hint) hint.prepend(el('strong', { text: 'Resultatet jämförs med din förra analys. ' }));
    }
  }

  // Mini-formuläret längst ned startar samma analys
  const mini = $('[data-mini-scan]');
  if (mini) {
    mini.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = mini.url.value;
      document.getElementById('analys').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
      setTimeout(() => start(v), reduced() ? 0 : 500);
    });
  }
}

/* ---------- Förhandsvisning av Wimco Score ---------- */
const CATS = {
  performance: {
    title: 'Prestanda', mix: 'Vägs ihop av 80 % Lighthouse-prestanda och 20 % egna kontroller.',
    text: 'Hur snabbt sidan laddar och blir användbar på en mobiltelefon. Långsamma sidor tappar besökare innan de ens sett erbjudandet.',
    checks: [['measured', 'Största innehållet (LCP)'], ['measured', 'Layoutskift (CLS)'], ['measured', 'Blockeringstid (TBT)'], ['measured', 'Riktiga besökares upplevelse, när Google har data'], ['rules', 'Serverns svarstid och HTML-vikt'], ['rules', 'Skript som blockerar visningen']],
  },
  mobile: {
    title: 'Mobilupplevelse', mix: 'Vägs ihop av kontroller, varav flera uppmätta i Lighthouse mobiltest.',
    text: 'Hur väl sidan fungerar på en liten skärm med tummen som muspekare.',
    checks: [['rules', 'Viewport och skalning'], ['measured', 'Första innehåll på mobilnät (FCP)'], ['measured', 'Innehållsbredd och klickytor'], ['rules', 'Bilder i rätt storlek för skärmen'], ['rules', 'Telefonnummer som går att ringa med ett tryck']],
  },
  accessibility: {
    title: 'Tillgänglighet', mix: 'Vägs ihop av 60 % Lighthouse-tillgänglighet och 40 % egna kontroller.',
    text: 'Om alla kan läsa och använda sidan – även med skärmläsare, tangentbord eller nedsatt syn.',
    checks: [['measured', 'Kontrast, namn och ARIA (axe-core)'], ['rules', 'Sidans språk'], ['rules', 'Alt-texter på bilder'], ['rules', 'Etiketter på formulärfält'], ['rules', 'Rubrikordning och regioner'], ['rules', 'Zoom tillåten på mobil']],
  },
  seo: {
    title: 'SEO och teknisk grund', mix: 'Vägs ihop av 40 % Lighthouse-SEO och 60 % egna kontroller.',
    text: 'Grunden för att Google ska hitta, förstå och visa sidan – och tecken på teknik som behöver moderniseras.',
    checks: [['rules', 'HTTPS och indexerbarhet'], ['rules', 'Titel, metabeskrivning och H1'], ['rules', 'Canonical, sitemap och strukturerad data'], ['rules', 'Delningsbild för sociala medier'], ['rules', 'Föråldrad plattform eller bibliotek'], ['measured', 'Lighthouse bästa praxis']],
  },
  visual: {
    title: 'Visuell tydlighet', mix: 'Bedömning enligt fasta regler. Med AI aktiverat vägs en AI-bedömning av skärmdumpen in till hälften.',
    text: 'Hur tydligt sidan kommunicerar sitt huvudbudskap och sin struktur. Här tolkar vi snarare än mäter – och säger det.',
    checks: [['heuristic', 'Huvudbudskapets längd och tydlighet'], ['heuristic', 'Mellanrubriker och skumbarhet'], ['heuristic', 'Textmängd'], ['heuristic', 'Antal typsnitt'], ['ai', 'Bedömning av första skärmen']],
  },
  conversion: {
    title: 'Konverteringsförmåga', mix: 'Bedömning enligt fasta regler. Med AI aktiverat vägs en AI-bedömning in till hälften.',
    text: 'Hur lätt det är för en intresserad besökare att ta nästa steg – och hur förfrågningarna tas om hand.',
    checks: [['heuristic', 'Tydliga uppmaningar och var de syns'], ['rules', 'Telefon, e-post och formulär'], ['heuristic', 'Förtroendesignaler'], ['heuristic', 'Formulärens längd'], ['heuristic', 'Manuell leadhantering'], ['rules', 'Besöksmätning']],
  },
};

function initScorePreview() {
  const root = $('[data-score-preview]');
  if (!root) return;
  const panel = $('[data-sp-panel]', root);
  const render = (id) => {
    const c = CATS[id];
    panel.replaceChildren(
      el('div', {}, el('h3', { class: 'sp-title', text: c.title }), el('p', { text: c.text }), el('p', { class: 'sp-mix', text: c.mix })),
      el('ul', { class: 'sp-checks', 'aria-label': `Det här kontrolleras inom ${c.title.toLowerCase()}` },
        c.checks.map(([src, label]) => el('li', {}, el('span', { class: `src src-${src}`, text: SOURCE[src] }), el('span', { text: label })))),
    );
    if (!reduced()) { panel.classList.remove('is-swapping'); void panel.offsetWidth; panel.classList.add('is-swapping'); }
  };
  initTabs($('[role="tablist"]', root), (tab) => {
    panel.setAttribute('aria-labelledby', tab.id);
    render(tab.dataset.cat);
  });
  render('performance');
}

initScanner();
initScorePreview();
