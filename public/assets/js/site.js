// Delad klientkod: navigation, samtycke/analytics, formulär, flikar och botskydd.

const GA_ID = 'G-B7VWYC02LZ';
const CONSENT_KEY = 'wimco-consent-v1';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function safeStorage(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}

/* ---------- Samtycke och analytics ---------- */
let gaLoaded = false;
function loadAnalytics() {
  if (gaLoaded) return;
  gaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

export function consentState() {
  return safeStorage(() => localStorage.getItem(CONSENT_KEY));
}

export function track(name, params = {}) {
  if (consentState() !== 'granted' || !window.gtag) return;
  window.gtag('event', name, params);
}

function initConsent() {
  const box = document.querySelector('[data-consent]');
  const state = consentState();
  if (state === 'granted') loadAnalytics();
  if (!box) return;
  if (!state) {
    // Visa frågan först när besökaren börjat utforska – den ska inte skymma analysen.
    const reveal = () => {
      box.hidden = false;
      window.removeEventListener('scroll', onScroll);
    };
    const onScroll = () => { if (window.scrollY > window.innerHeight * 0.9) reveal(); };
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-consent-choice]');
    if (!btn) return;
    const choice = btn.dataset.consentChoice;
    safeStorage(() => localStorage.setItem(CONSENT_KEY, choice));
    box.hidden = true;
    if (choice === 'granted') loadAnalytics();
    else if (gaLoaded) {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
      // Ta bort GA-cookies för den här domänen
      for (const c of document.cookie.split(';')) {
        const name = c.split('=')[0].trim();
        if (/^_ga/.test(name)) document.cookie = `${name}=; Max-Age=0; path=/; domain=.${location.hostname.replace(/^www\./, '')}`;
      }
    }
  });
  document.querySelectorAll('[data-consent-open]').forEach((b) => b.addEventListener('click', () => {
    box.hidden = false;
    box.querySelector('[data-consent-choice="granted"]')?.focus();
  }));
}

/* ---------- Konfiguration och Turnstile ---------- */
let configPromise = null;
export function getConfig() {
  if (!configPromise) {
    configPromise = fetch('/api/config', { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return configPromise;
}

let turnstileReady = null;
export async function getTurnstileToken() {
  const cfg = await getConfig();
  if (!cfg.turnstileSiteKey) return null;
  if (!turnstileReady) {
    turnstileReady = new Promise((resolve, reject) => {
      window.onWimcoTurnstile = () => resolve(window.turnstile);
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onWimcoTurnstile';
      s.async = true;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const ts = await turnstileReady;
  return new Promise((resolve) => {
    let holder = document.getElementById('ts-holder');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'ts-holder';
      holder.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:60';
      document.body.appendChild(holder);
    }
    holder.replaceChildren();
    ts.render(holder, {
      sitekey: cfg.turnstileSiteKey,
      size: 'flexible',
      appearance: 'interaction-only',
      callback: (token) => { resolve(token); setTimeout(() => holder.replaceChildren(), 400); },
      'error-callback': () => resolve(null),
      'expired-callback': () => resolve(null),
    });
  });
}

/* ---------- Navigation ---------- */
function initNav() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const list = document.getElementById('nav-list');
  if (!toggle || !list) return;
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    list.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  list.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (toggle.getAttribute('aria-expanded') === 'true' && !e.target.closest('.nav')) setOpen(false);
  });
  const path = location.pathname;
  list.querySelectorAll('a[href^="/"]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href.includes('#') && href !== '/' && path.startsWith(href)) a.setAttribute('aria-current', 'page');
  });
}

/* ---------- Flikar (WAI-ARIA tabs) ---------- */
export function initTabs(tablist, onSelect) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const select = (tab, focus = false) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    }
    if (focus) tab.focus();
    onSelect(tab);
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); select(next, true); }
    });
  });
  return { select: (id) => { const t = tabs.find((x) => x.dataset.service === id || x.dataset.cat === id); if (t) select(t); } };
}

let switchboard = null;
function initSwitchboard() {
  const root = document.querySelector('[data-switchboard]');
  if (!root) return;
  const tablist = root.querySelector('[role="tablist"]');
  switchboard = initTabs(tablist, (tab) => {
    root.querySelectorAll('[role="tabpanel"]').forEach((p) => {
      const on = p.id === tab.getAttribute('aria-controls');
      p.hidden = !on;
      if (on && !reducedMotion()) { p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering'); }
    });
    track('service_view', { service: tab.dataset.service });
    try {
      const u = new URL(location.href);
      if (u.searchParams.get('tjanst') !== tab.dataset.service) {
        u.searchParams.set('tjanst', tab.dataset.service);
        history.replaceState(history.state, '', u);
      }
    } catch { /* ignoreras */ }
  });
  const fromQuery = new URLSearchParams(location.search).get('tjanst');
  if (fromQuery) switchboard.select(fromQuery);
}

/* ---------- Genvägar ---------- */
function smoothTo(el) {
  el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

function initShortcuts() {
  document.addEventListener('click', (e) => {
    const svcLink = e.target.closest('[data-service-link]');
    if (svcLink && switchboard) {
      switchboard.select(svcLink.dataset.serviceLink);
      track('service_interest', { service: svcLink.dataset.serviceLink, from: 'linemap' });
    }
    const pre = e.target.closest('[data-prefill-service]');
    if (pre) {
      const radio = document.querySelector(`[data-lead-form] input[name="service"][value="${pre.dataset.prefillService}"]`);
      if (radio) radio.checked = true;
      track('service_interest', { service: pre.dataset.prefillService });
    }
    const focusScan = e.target.closest('[data-focus-scan]');
    if (focusScan) {
      const input = document.querySelector('[data-scan-input]');
      if (input) {
        e.preventDefault();
        smoothTo(document.getElementById('analys'));
        setTimeout(() => input.focus({ preventScroll: true }), reducedMotion() ? 0 : 450);
      }
    }
    const tr = e.target.closest('[data-track]');
    if (tr) track(tr.dataset.track, { label: tr.textContent.trim().slice(0, 60) });
  });
}

/* ---------- Leadformulär ---------- */
const MESSAGES = {
  email: 'Ange en giltig e-postadress, t.ex. namn@foretag.se.',
  name: 'Skriv ditt namn så vi vet vem vi svarar.',
  message: 'Beskriv kort vad du vill ha hjälp med.',
  consent: 'Bekräfta att vi får mejla dig.',
};

function setFieldError(form, name, msg) {
  const input = form.querySelector(`[name="${name}"]`);
  if (!input) return;
  const field = input.closest('.field') || input.closest('.check') || input.parentElement;
  let err = field.querySelector('.field-error');
  if (!msg) {
    input.removeAttribute('aria-invalid');
    if (err) err.remove();
    return;
  }
  input.setAttribute('aria-invalid', 'true');
  if (!err) {
    err = document.createElement('p');
    err.className = 'field-error';
    err.id = `${input.id || name}-err`;
    field.appendChild(err);
    input.setAttribute('aria-describedby', err.id);
  }
  err.textContent = msg;
}

export function initLeadForm(form, { extra = () => ({}), onSuccess } = {}) {
  const startedAt = Date.now();
  let dirty = false;
  const guard = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
  form.addEventListener('input', (e) => { if (e.target.name === 'message' && e.target.value.trim().length > 20) dirty = true; });
  window.addEventListener('beforeunload', guard);
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('button[type="submit"]');
  form.addEventListener('input', (e) => { if (e.target.name) setFieldError(form, e.target.name, null); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = { kind: form.dataset.kind, startedAt, ...extra() };
    for (const [k, v] of fd.entries()) body[k] = typeof v === 'string' ? v.trim() : v;
    if (form.querySelector('[name="consent"]')) body.consent = !!form.querySelector('[name="consent"]').checked;

    const errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email || '')) errors.email = MESSAGES.email;
    if (form.querySelector('[name="name"][required]') && !body.name) errors.name = MESSAGES.name;
    if (form.querySelector('[name="message"][required]') && (body.message || '').length < 10) errors.message = MESSAGES.message;
    if (form.querySelector('[name="consent"][required]') && !body.consent) errors.consent = MESSAGES.consent;
    for (const n of ['email', 'name', 'message', 'consent']) setFieldError(form, n, errors[n] || null);
    if (Object.keys(errors).length) {
      status.textContent = 'Kontrollera de markerade fälten.';
      status.className = 'form-status is-error';
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    button.disabled = true;
    button.classList.add('is-busy');
    const label = button.querySelector('.btn-label');
    const original = label?.textContent;
    if (label) label.textContent = 'Skickar…';
    status.textContent = '';
    status.className = 'form-status';
    try {
      body.turnstileToken = await getTurnstileToken().catch(() => null);
      const res = await fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        dirty = false;
        window.removeEventListener('beforeunload', guard);
        track('generate_lead', { kind: body.kind, service: body.service || undefined });
        onSuccess ? onSuccess(data, body) : showDone(form, body);
        return;
      }
      if (data.errors) for (const [k, v] of Object.entries(data.errors)) setFieldError(form, k, v);
      status.replaceChildren();
      status.append(data.message || 'Det gick inte att skicka just nu.', ' ');
      const a = document.createElement('a');
      a.href = mailtoFor(body);
      a.textContent = 'Mejla oss i stället';
      status.append(a);
      status.className = 'form-status is-error';
    } catch {
      status.replaceChildren();
      status.append('Anslutningen bröts. ');
      const a = document.createElement('a');
      a.href = mailtoFor(body);
      a.textContent = 'Mejla hej@wimco.se';
      status.append(a);
      status.className = 'form-status is-error';
    } finally {
      button.disabled = false;
      button.classList.remove('is-busy');
      if (label && original) label.textContent = original;
    }
  });
}

function mailtoFor(body) {
  const subject = encodeURIComponent(body.kind === 'project' ? 'Projektförfrågan' : 'Förfrågan via wimco.se');
  const text = encodeURIComponent([body.name, body.company, body.message, body.reportId ? `Rapport: ${location.origin}/r/${body.reportId}` : ''].filter(Boolean).join('\n\n'));
  return `mailto:hej@wimco.se?subject=${subject}&body=${text}`;
}

function showDone(form, body) {
  const done = document.createElement('div');
  done.className = 'form-done';
  done.setAttribute('tabindex', '-1');
  const h = document.createElement('h4');
  h.textContent = 'Tack – förfrågan är skickad.';
  const p = document.createElement('p');
  p.textContent = `Willem återkommer till ${body.email} så snart som möjligt. Vill du prata direkt? Ring 072-218 05 09.`;
  done.append(h, p);
  form.replaceWith(done);
  done.focus();
}

/* ---------- Automationsflödet ---------- */
function initFlow() {
  const flow = document.querySelector('[data-flow]');
  if (!flow || reducedMotion() || !('IntersectionObserver' in window)) return;
  const line = flow.querySelector('.flow-line');
  const setW = () => line.style.setProperty('--flow-w', `${line.clientWidth}px`);
  setW();
  new ResizeObserver(setW).observe(line);
  new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { flow.classList.remove('is-running'); void flow.offsetWidth; flow.classList.add('is-running'); }
    }
  }, { threshold: 0.35 }).observe(flow);
}

function initProjectForm() {
  document.querySelectorAll('[data-lead-form]').forEach((f) => initLeadForm(f));
}

initNav();
initConsent();
initSwitchboard();
initShortcuts();
initFlow();
initProjectForm();
