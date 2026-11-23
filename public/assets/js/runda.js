// Runda: ett appkoncept av Wimco (fältapp för serviceföretag). Interaktiv prototyp på
// /referenser/runda/. Allt ritas här från JOBS; sidan har bara en tom [data-runda]-behållare.
//
// Flöde: Idag-listan → tryck på ett jobb → arket glider upp → bocka av checklistan →
// "Be kunden signera" → signera med fingret → "Skicka rapport" → klart, jobbet flyttas till Klart.
// Arket följer fingret 1:1 och stängs om det dras ned tillräckligt långt eller kastas nedåt.
//
// CSP: style-src 'self' tillåter inga style-attribut i markup, så rörelse sätts via el.style (CSSOM).

const JOBS = [
  { id: 'linnea', time: '08:00', name: 'Café Linnea', address: 'Storgatan 4', service: 'Lokalvård', status: 'done', sent: '08:52',
    contact: 'Anna Lind', items: ['Golv i serveringen', 'Disk och bänkar', 'Toaletter', 'Sopor ut'] },
  { id: 'ekdahl', time: '09:15', name: 'Ekdahls Tandvård', address: 'Kungsgatan 12', service: 'Lokalvård', status: 'done', sent: '10:04',
    contact: 'Per Ekdahl', items: ['Väntrum', 'Behandlingsrum 1–3', 'Personalrum', 'Entré och glas'] },
  { id: 'berg', time: '10:30', name: 'Bergs Bageri', address: 'Drottninggatan 21', service: 'Storstädning', status: 'now',
    contact: 'Lars Berg', items: ['Golv i butiken', 'Disk och montrar', 'Bakrum och ugnar', 'Toaletter', 'Sopor ut', 'Foto efter städning'], checked: [0, 1] },
  { id: 'norr', time: '13:00', name: 'Kontorshuset Norr', address: 'Sveavägen 40', service: 'Fönsterputs', status: 'next',
    contact: 'Sara Norén', items: ['Fönster plan 1', 'Fönster plan 2', 'Glasdörrar', 'Foto efter'] },
  { id: 'holm', time: '15:30', name: 'Familjen Holm', address: 'Ringvägen 8', service: 'Flyttstäd', status: 'next',
    contact: 'Eva Holm', items: ['Kök och vitvaror', 'Badrum', 'Alla rum', 'Fönster', 'Förråd', 'Foto efter'] },
];

const ICON = {
  chevron: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.4 3 3 6-6.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  today: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  reports: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4.5 4.5v12.5H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3.5V8h4.5M10 13h5M10 16.5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  nav: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m3 9.5 13-5.5-5.5 13-1.6-5.9z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  phone: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3h3l1.5 4-2 1.3a9 9 0 0 0 4.2 4.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A13 13 0 0 1 3 5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  camera: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h1.5L8 3h4l1.5 2H15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10.5" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  doc: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 2.5h6l3.5 3.5v11.5H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 2.5V6h3.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
};

const STATUS = { done: 'Klart', now: 'Pågår', next: 'Kommande' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function mount(root) {
  const shot = root.hasAttribute('data-shot');
  let jobs = structuredClone(JOBS);
  let tab = 'today';
  let open = null; // job id in the sheet
  let step = 'job'; // job | sign | done

  root.classList.add('rd-app');
  if (shot) root.classList.add('rd-shot');
  root.innerHTML = `
    <div class="rd-status" aria-hidden="true"><span class="rd-clock">9:41</span><span class="rd-island"></span><span class="rd-sys"><i></i><i></i><i></i><b></b></span></div>
    <div class="rd-views">
      <section class="rd-view" data-view="today" aria-label="Idag"></section>
      <section class="rd-view" data-view="map" aria-label="Karta" hidden></section>
      <section class="rd-view" data-view="reports" aria-label="Rapporter" hidden></section>
    </div>
    <nav class="rd-tabs" aria-label="Appens flikar">
      <button type="button" data-tab="today" aria-pressed="true">${ICON.today}<span>Idag</span></button>
      <button type="button" data-tab="map" aria-pressed="false">${ICON.map}<span>Karta</span></button>
      <button type="button" data-tab="reports" aria-pressed="false">${ICON.reports}<span>Rapporter</span></button>
    </nav>
    <div class="rd-scrim" data-close></div>
    <div class="rd-sheet" role="dialog" aria-modal="true" aria-label="Jobb" tabindex="-1">
      <div class="rd-grab" aria-hidden="true"><i></i></div>
      <div class="rd-sheet-body"></div>
    </div>
    <p class="rd-toast" role="status" aria-live="polite"></p>`;

  const $ = (sel) => root.querySelector(sel);
  const views = { today: $('[data-view="today"]'), map: $('[data-view="map"]'), reports: $('[data-view="reports"]') };
  const sheet = $('.rd-sheet');
  const body = $('.rd-sheet-body');
  const toastEl = $('.rd-toast');

  const emit = () => root.dispatchEvent(new CustomEvent('runda:step', { bubbles: true, detail: { open, step, done: jobs.filter((j) => j.status === 'done').length } }));

  /* ---------- Idag ---------- */
  function renderToday() {
    const done = jobs.filter((j) => j.status === 'done').length;
    const next = jobs.find((j) => j.status === 'now') ?? jobs.find((j) => j.status === 'next');
    const C = 2 * Math.PI * 26;
    const group = (status, title) => {
      const list = jobs.filter((j) => j.status === status);
      if (!list.length) return '';
      return `<h2 class="rd-group">${title}<span>${list.length}</span></h2>
        <ul class="rd-list">${list.map(row).join('')}</ul>`;
    };
    views.today.innerHTML = `
      <header class="rd-head">
        <div><p class="rd-date">Måndag 23 november</p><h1 class="rd-title">Idag</h1></div>
        <span class="rd-avatar" aria-label="Inloggad som Elin">EL</span>
      </header>
      <div class="rd-summary">
        <svg class="rd-ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="26" class="rd-ring-track"/>
          <circle cx="32" cy="32" r="26" class="rd-ring-fill" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - done / jobs.length)}"/>
        </svg>
        <div class="rd-sum-text">
          <p class="rd-sum-big"><b>${done}</b> av ${jobs.length} jobb klara</p>
          <p class="rd-sum-sub">${next ? `Nästa: ${esc(next.name)} ${next.time}` : 'Allt klart för i dag'}</p>
        </div>
        <div class="rd-sum-stats"><span><b>18 km</b>rutt</span><span><b>${jobs.length - done}</b>stopp kvar</span></div>
      </div>
      ${group('now', 'Pågår')}
      ${group('next', 'Kommande')}
      ${group('done', 'Klart')}`;
  }

  function row(j) {
    const n = j.items.length;
    const c = j.status === 'done' ? n : (j.checked ?? []).length;
    return `<li><button type="button" class="rd-job" data-job="${j.id}" data-status="${j.status}">
      <span class="rd-time">${j.time}</span>
      <span class="rd-job-main">
        <b>${esc(j.name)}</b>
        <small>${esc(j.address)} · ${esc(j.service)}</small>
        ${j.status === 'now' ? `<span class="rd-mini"><i class="rd-mini-fill" data-p="${c / n}"></i></span>` : ''}
      </span>
      <span class="rd-badge" data-status="${j.status}">${j.status === 'done' ? ICON.check : ''}${STATUS[j.status]}</span>
    </button></li>`;
  }

  /* ---------- Karta ---------- */
  function renderMap() {
    const left = jobs.filter((j) => j.status !== 'done');
    const pins = [[70, 250], [118, 190], [196, 214], [250, 128], [306, 82]];
    views.map.innerHTML = `
      <header class="rd-head"><div><p class="rd-date">${left.length} stopp kvar</p><h1 class="rd-title">Karta</h1></div></header>
      <div class="rd-map">
        <svg viewBox="0 0 360 330" aria-label="Dagens rutt med ${jobs.length} stopp" role="img">
          <rect width="360" height="330" class="rd-m-bg"/>
          <path class="rd-m-water" d="M0 300c60-30 120-10 180-40s110-20 180-60v130H0z"/>
          <path class="rd-m-park" d="M226 196h70v56h-70z"/>
          <g class="rd-m-roads"><path d="M0 60h360M0 150h360M0 240h360M60 0v330M150 0v330M240 0v330M320 0v330M0 330 360 20"/></g>
          <path class="rd-m-route" pathLength="1" d="M70 250 C90 230 100 200 118 190 S170 214 196 214 S232 140 250 128 S290 90 306 82"/>
          ${pins.map(([x, y], i) => `<g class="rd-m-pin" data-status="${jobs[i].status}" transform="translate(${x} ${y})"><circle r="11"/><text dy="4">${i + 1}</text></g>`).join('')}
        </svg>
      </div>
      ${left[0] ? `<button type="button" class="rd-next" data-job="${left[0].id}"><span>Nästa stopp</span><b>${esc(left[0].name)}</b><small>${esc(left[0].address)} · 6 min bort</small>${ICON.chevron}</button>` : ''}`;
  }

  /* ---------- Rapporter ---------- */
  function renderReports() {
    const sent = jobs.filter((j) => j.status === 'done');
    views.reports.innerHTML = `
      <header class="rd-head"><div><p class="rd-date">Skickas automatiskt</p><h1 class="rd-title">Rapporter</h1></div></header>
      <ul class="rd-reports">${sent.map((j) => `<li>${ICON.doc}<span><b>${esc(j.name)}</b><small>Skickad ${j.sent} till ${esc(j.contact)} · med foton</small></span><em>Fakturaunderlag</em></li>`).join('')}</ul>`;
  }

  function renderAll() {
    renderToday();
    renderMap();
    renderReports();
    root.querySelectorAll('.rd-mini-fill').forEach((el) => (el.style.transform = `scaleX(${el.dataset.p})`));
  }

  /* ---------- Arket ---------- */
  function renderSheet() {
    const j = jobs.find((x) => x.id === open);
    if (!j) return;
    sheet.dataset.step = step;
    if (step === 'job') {
      const checked = new Set(j.status === 'done' ? j.items.map((_, i) => i) : j.checked ?? []);
      const all = checked.size === j.items.length;
      body.innerHTML = `
        <span class="rd-badge" data-status="${j.status}">${j.status === 'done' ? ICON.check : ''}${STATUS[j.status]}</span>
        <h2 class="rd-s-title">${esc(j.name)}</h2>
        <p class="rd-s-meta">${j.time} · ${esc(j.address)} · ${esc(j.service)}</p>
        <div class="rd-actions">
          <button type="button" class="rd-act" data-toast="Öppnar vägbeskrivning">${ICON.nav}<span>Navigera</span></button>
          <button type="button" class="rd-act" data-toast="Ringer ${esc(j.contact)}">${ICON.phone}<span>Ring</span></button>
          <button type="button" class="rd-act" data-toast="Kameran öppnas">${ICON.camera}<span>Foto</span></button>
        </div>
        <div class="rd-check-head"><h3>Checklista</h3><span>${checked.size} av ${j.items.length}</span></div>
        <ul class="rd-checks">${j.items
          .map((it, i) => `<li><button type="button" class="rd-check" data-i="${i}" aria-pressed="${checked.has(i)}" ${j.status === 'done' ? 'disabled' : ''}><i>${ICON.check}</i>${esc(it)}</button></li>`)
          .join('')}</ul>
        ${j.status === 'done'
          ? `<p class="rd-sent">${ICON.doc} Rapport skickad ${j.sent} till ${esc(j.contact)}</p>`
          : `<button type="button" class="rd-primary" data-go="sign" ${all ? '' : 'disabled'}>${all ? 'Be kunden signera' : `Bocka av ${j.items.length - checked.size} till`}</button>`}`;
    } else if (step === 'sign') {
      body.innerHTML = `
        <button type="button" class="rd-back" data-go="job">${ICON.chevron}Tillbaka</button>
        <h2 class="rd-s-title">Kundens signatur</h2>
        <p class="rd-s-meta">${esc(j.contact)}, ${esc(j.name)}</p>
        <div class="rd-pad"><canvas aria-label="Signera här med fingret eller musen"></canvas><span>Signera här</span><i></i></div>
        <div class="rd-row">
          <button type="button" class="rd-ghost" data-clear>Rensa</button>
          <button type="button" class="rd-primary" data-go="done" disabled>Skicka rapport</button>
        </div>`;
      signature(body.querySelector('canvas'), body.querySelector('[data-go="done"]'));
    } else {
      const nextJob = jobs.find((x) => x.status === 'next');
      body.innerHTML = `
        <div class="rd-done">
          <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28"/><path d="m20 33 8 8 16-18" pathLength="1"/></svg>
          <h2 class="rd-s-title">Rapport skickad</h2>
          <ul>
            <li>${ICON.check}Rapport med foton till ${esc(j.contact)}</li>
            <li>${ICON.check}Underlag till fakturan skapat</li>
            ${nextJob ? `<li>${ICON.check}Nästa: ${esc(nextJob.name)} ${nextJob.time}</li>` : ''}
          </ul>
          <button type="button" class="rd-primary" data-finish>Klar</button>
        </div>`;
    }
    emit();
  }

  function openSheet(id) {
    open = id;
    step = 'job';
    renderSheet();
    root.classList.add('rd-open');
    sheet.style.transform = '';
    sheet.focus({ preventScroll: true });
  }
  function closeSheet() {
    root.classList.remove('rd-open');
    sheet.style.transform = '';
    open = null;
    emit();
  }

  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('rd-on');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => toastEl.classList.remove('rd-on'), 1800);
  }

  /* ---------- Signatur: rita med pekaren ---------- */
  function signature(canvas, send) {
    const ctx = canvas.getContext('2d');
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#121417';
    };
    fit();
    let last = null;
    let length = 0;
    const at = (e) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      last = at(e);
      canvas.parentElement.classList.add('rd-signed');
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!last) return;
      const p = at(e);
      ctx.beginPath();
      ctx.moveTo(...last);
      ctx.lineTo(...p);
      ctx.stroke();
      length += Math.hypot(p[0] - last[0], p[1] - last[1]);
      last = p;
      if (length > 60) send.disabled = false;
    });
    const end = () => (last = null);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    body.querySelector('[data-clear]').addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      length = 0;
      send.disabled = true;
      canvas.parentElement.classList.remove('rd-signed');
    });
  }

  /* ---------- Dra arket nedåt för att stänga ---------- */
  // 1:1 med fingret från där man tog tag; vid släpp avgör kastets riktning och en projicerad
  // slutposition (Apples avklingning, d = 0.998) om arket stängs eller fjädrar tillbaka.
  const grab = $('.rd-grab');
  let drag = null;
  const startDrag = (e) => {
    if (!root.classList.contains('rd-open')) return;
    drag = { y0: e.clientY, h: sheet.offsetHeight, hist: [[e.timeStamp, 0]] };
    sheet.classList.add('rd-dragging');
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e) => {
    if (!drag) return;
    let dy = e.clientY - drag.y0;
    if (dy < 0) dy = -((-dy * 0.55 * 60) / (60 + 0.55 * -dy)); // gummiband uppåt
    sheet.style.transform = `translateY(${dy}px)`;
    drag.hist.push([e.timeStamp, dy]);
    if (drag.hist.length > 5) drag.hist.shift();
  };
  const endDrag = () => {
    if (!drag) return;
    const [t0, y0] = drag.hist[0];
    const [t1, y1] = drag.hist[drag.hist.length - 1];
    const v = t1 > t0 ? ((y1 - y0) / (t1 - t0)) * 1000 : 0; // px/s
    const projected = y1 + ((v / 1000) * 0.998) / (1 - 0.998);
    sheet.classList.remove('rd-dragging');
    if (projected > drag.h * 0.45 && v >= 0) closeSheet();
    else sheet.style.transform = '';
    drag = null;
  };
  for (const el of [grab, sheet.querySelector('.rd-sheet-body')]) {
    el.addEventListener('pointerdown', (e) => {
      // Från innehållet: bara när det är skrollat till toppen och inte på en knapp eller signaturytan.
      if (el !== grab && (body.scrollTop > 0 || e.target.closest('button, canvas'))) return;
      startDrag(e);
    });
    el.addEventListener('pointermove', moveDrag);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  /* ---------- Klick ---------- */
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-close]');
    if (!t || !root.contains(t)) return;
    if (t.dataset.tab) {
      tab = t.dataset.tab;
      root.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
      for (const [k, v] of Object.entries(views)) v.hidden = k !== tab;
      views[tab].scrollTop = 0;
      root.dataset.tab = tab;
    } else if (t.dataset.job) openSheet(t.dataset.job);
    else if (t.hasAttribute('data-close')) closeSheet();
    else if (t.dataset.toast) toast(t.dataset.toast);
    else if (t.dataset.go) {
      step = t.dataset.go;
      renderSheet();
    } else if (t.dataset.i !== undefined) {
      const j = jobs.find((x) => x.id === open);
      const set = new Set(j.checked ?? []);
      const i = Number(t.dataset.i);
      set.has(i) ? set.delete(i) : set.add(i);
      j.checked = [...set].sort();
      if (j.status === 'next') {
        jobs.forEach((x) => x.status === 'now' && x.id !== j.id && (x.status = 'next'));
        j.status = 'now';
      }
      renderSheet();
      renderAll();
    } else if (t.hasAttribute('data-finish')) {
      const j = jobs.find((x) => x.id === open);
      j.status = 'done';
      j.sent = '11:48';
      const n = jobs.find((x) => x.status === 'next');
      if (n && !jobs.some((x) => x.status === 'now')) n.status = 'now';
      closeSheet();
      renderAll();
      toast(`${j.name} är klart`);
    }
  });
  root.addEventListener('keydown', (e) => e.key === 'Escape' && open && closeSheet());

  root.addEventListener('runda:reset', () => {
    jobs = structuredClone(JOBS);
    closeSheet();
    root.querySelector('[data-tab="today"]').click();
    renderAll();
  });

  if (reduce()) root.classList.add('rd-reduce');
  renderAll();
  emit();
}

document.querySelectorAll('[data-runda]').forEach(mount);

// Stegen bredvid telefonen på casesidan följer var man är i flödet.
document.querySelectorAll('[data-runda-steps]').forEach((list) => {
  const app = document.getElementById(list.dataset.rundaSteps);
  if (!app) return;
  app.addEventListener('runda:step', (e) => {
    const { open, step, done } = e.detail;
    const at = done > 2 ? 3 : !open ? 0 : step === 'job' ? 1 : step === 'sign' ? 2 : 3;
    list.querySelectorAll('li').forEach((li, i) => li.toggleAttribute('data-on', i === at));
  });
  document.querySelector(`[data-runda-reset="${app.id}"]`)?.addEventListener('click', () => app.dispatchEvent(new CustomEvent('runda:reset')));
});
