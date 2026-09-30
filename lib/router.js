// Gemensam request-hanterare för Cloudflare Pages Functions och den lokala Node-servern.
//
// platform = {
//   resolve(host)            -> Promise<string[]>   DNS A/AAAA
//   rawFetch(url, init)      -> Promise<{status, headers, body}>  SSRF-skyddad, följer inte redirects
//   trustedFetch(url, init)  -> Promise<Response>   för fasta, betrodda API:er (PSI, Resend, Anthropic, Turnstile)
//   loadAsset(path)          -> Promise<ArrayBuffer> statiska filer från public/
//   kv                       -> KV-namespace (get/put/delete/list)
//   waitUntil(promise)
// }
import { analyze, publicReport } from './analysis/analyze.js';
import { AnalysisError } from './net/url-guard.js';
import { createStore, rateLimit } from './util/store.js';
import { sha256Hex } from './util/ids.js';
import { json, errorJson, clientIp, sameOrigin, readJsonBody, escapeHtml } from './http.js';
import { validateLead, handleLead, processReminders } from './leads.js';
import { renderOgPng } from './og/render.js';

const LIMITS = {
  analyzeShort: { limit: 6, windowSec: 600 },
  analyzeDay: { limit: 40, windowSec: 86400 },
  analyzeGlobal: { limit: 3000, windowSec: 86400 },
  lead: { limit: 8, windowSec: 3600 },
  visibility: { limit: 30, windowSec: 3600 },
};

const ERROR_STATUS = {
  invalid_url: 400, blocked_target: 422, unreachable: 502, timeout: 504, site_blocked: 502,
  not_found: 502, site_error: 502, not_html: 422, failed: 502, rate_limited: 429,
};

function siteUrl(request, env) {
  return (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
}

async function ipKey(request, env, platform) {
  return (await sha256Hex(`${env.IP_HASH_SALT || 'wimco'}:${clientIp(request, platform)}`)).slice(0, 24);
}

async function verifyTurnstile(env, platform, token, ip) {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token || typeof token !== 'string' || token.length > 4096) return false;
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (ip && ip !== 'unknown') body.set('remoteip', ip);
    const res = await platform.trustedFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function handle(request, env, platform) {
  const url = new URL(request.url);
  const path = url.pathname;
  const store = createStore(platform.kv);

  try {
    if (path === '/api/config' && request.method === 'GET') {
      return json({
        turnstileSiteKey: env.TURNSTILE_SITE_KEY || null,
        psi: env.PSI_DISABLED !== '1',
        ai: !!env.ANTHROPIC_API_KEY,
        devData: env.DEV_FIXTURES === '1',
        mail: !!env.RESEND_API_KEY,
      }, 200, { 'cache-control': 'public, max-age=300' });
    }

    if (path === '/api/analyze') {
      if (request.method !== 'POST') return errorJson('method', 'Använd POST.', 405);
      return analyzeHandler(request, env, platform, store);
    }

    let m = /^\/api\/report\/([a-z0-9]{8,20})$/.exec(path);
    if (m && request.method === 'GET') {
      const report = store ? await store.getJson(`report:${m[1]}`) : null;
      if (!report) return errorJson('not_found', 'Rapporten finns inte eller har gått ut.', 404);
      return json(publicReport(report), 200, report.public ? { 'x-robots-tag': 'all' } : {});
    }

    m = /^\/api\/report\/([a-z0-9]{8,20})\/visibility$/.exec(path);
    if (m && request.method === 'POST') {
      if (!sameOrigin(request, env)) return errorJson('forbidden', 'Otillåten källa.', 403);
      const rl = await rateLimit(store, `vis:${await ipKey(request, env, platform)}`, LIMITS.visibility);
      if (!rl.ok) return errorJson('rate_limited', 'För många försök. Vänta en stund.', 429, { 'retry-after': String(rl.retryAfter) });
      const body = await readJsonBody(request);
      const report = store ? await store.getJson(`report:${m[1]}`) : null;
      if (!report) return errorJson('not_found', 'Rapporten finns inte.', 404);
      if (!body || typeof body.ownerToken !== 'string' || (await sha256Hex(body.ownerToken)) !== report.ownerHash) {
        return errorJson('forbidden', 'Endast den som skapade rapporten kan ändra synligheten.', 403);
      }
      report.public = body.public === true;
      await store.putJson(`report:${report.id}`, report, 60 * 60 * 24 * 180);
      return json({ ok: true, public: report.public });
    }

    if (path === '/api/lead' && request.method === 'POST') {
      return leadHandler(request, env, platform, store);
    }

    if (path === '/api/cron/reminders' && request.method === 'POST') {
      if (!env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
        return errorJson('forbidden', 'Otillåten.', 403);
      }
      return json(await processReminders({ env, platform, store, siteUrl: siteUrl(request, env) }));
    }

    m = /^\/r\/([a-z0-9]{8,20})\/?$/.exec(path);
    if (m && request.method === 'GET') {
      return reportPage(m[1], request, env, platform, store);
    }

    m = /^\/og\/([a-z0-9]{8,20})\.png$/.exec(path);
    if (m && request.method === 'GET') {
      return ogImage(m[1], env, platform, store);
    }

    return errorJson('not_found', 'Hittades inte.', 404);
  } catch (err) {
    console.error('handler error', err?.stack || err);
    return errorJson('server_error', 'Något gick fel hos oss. Försök igen om en stund.', 500);
  }
}

async function analyzeHandler(request, env, platform, store) {
  if (!sameOrigin(request, env)) return errorJson('forbidden', 'Analysen kan bara startas från wimco.se.', 403);
  const body = await readJsonBody(request);
  if (!body || typeof body.url !== 'string') return errorJson('invalid_url', 'Ange en webbadress.', 400);
  // Honungsfälla för enkla botar
  if (body.company_site) return errorJson('invalid_url', 'Ange en webbadress.', 400);

  const ip = clientIp(request, platform);
  const key = await ipKey(request, env, platform);
  for (const [name, lim] of [['analyzeShort', LIMITS.analyzeShort], ['analyzeDay', LIMITS.analyzeDay]]) {
    const rl = await rateLimit(store, `${name}:${key}`, lim);
    if (!rl.ok) {
      return json({ ok: false, code: 'rate_limited', retryAfter: rl.retryAfter, message: `Du har kört många analyser på kort tid. Försök igen om ${Math.ceil(rl.retryAfter / 60)} min.` }, 429, { 'retry-after': String(rl.retryAfter) });
    }
  }
  const g = await rateLimit(store, 'analyzeGlobal', { limit: Number(env.GLOBAL_DAILY_LIMIT || LIMITS.analyzeGlobal.limit), windowSec: 86400 });
  if (!g.ok) return json({ ok: false, code: 'rate_limited', retryAfter: g.retryAfter, message: 'Analysverktyget är fullbelagt just nu. Försök igen senare eller mejla hej@wimco.se.' }, 429);

  if (!(await verifyTurnstile(env, platform, body.turnstileToken, ip))) {
    return errorJson('bot_check', 'Säkerhetskontrollen gick inte igenom. Ladda om sidan och försök igen.', 403);
  }

  const prevId = typeof body.prev === 'string' ? body.prev : null;
  const encoder = new TextEncoder();
  const iterator = analyze(body.url, { env, platform, store, prevId, ip });

  // Validera URL:en innan strömmen öppnas, så att felaktiga adresser får ett vanligt JSON-svar.
  let first;
  try {
    first = await iterator.next();
  } catch (err) {
    if (err instanceof AnalysisError) {
      return json({ ok: false, code: err.code, message: err.message }, ERROR_STATUS[err.code] || 400);
    }
    throw err;
  }

  const stream = new ReadableStream({
    start(controller) {
      if (!first.done) controller.enqueue(encoder.encode(JSON.stringify(first.value) + '\n'));
    },
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) { controller.close(); return; }
        controller.enqueue(encoder.encode(JSON.stringify(value) + '\n'));
      } catch (err) {
        const code = err instanceof AnalysisError ? err.code : 'failed';
        const message = err instanceof AnalysisError ? err.message : 'Analysen misslyckades oväntat. Försök igen.';
        if (!(err instanceof AnalysisError)) console.error('analyze error', err?.stack || err);
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', code, message }) + '\n'));
        controller.close();
      }
    },
    cancel() {
      iterator.return?.();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex',
      'x-accel-buffering': 'no',
    },
  });
}

async function leadHandler(request, env, platform, store) {
  if (!sameOrigin(request, env)) return errorJson('forbidden', 'Otillåten källa.', 403);
  const body = await readJsonBody(request);
  if (!body) return errorJson('invalid', 'Ogiltig förfrågan.', 400);
  // Botskydd: honungsfält + orimligt snabb ifyllnad besvaras som lyckat utan att sparas.
  const elapsed = Date.now() - Number(body.startedAt || 0);
  if (body.company_site || (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 2500)) {
    return json({ ok: true });
  }
  const rl = await rateLimit(store, `lead:${await ipKey(request, env, platform)}`, LIMITS.lead);
  if (!rl.ok) return errorJson('rate_limited', 'Du har skickat flera förfrågningar på kort tid. Mejla hej@wimco.se om det är bråttom.', 429, { 'retry-after': String(rl.retryAfter) });
  if (!(await verifyTurnstile(env, platform, body.turnstileToken, clientIp(request, platform)))) {
    return errorJson('bot_check', 'Säkerhetskontrollen gick inte igenom. Ladda om sidan och försök igen.', 403);
  }
  const v = validateLead(body);
  if (!v.ok) return json({ ok: false, code: 'validation', errors: v.errors, message: 'Kontrollera de markerade fälten.' }, 422);
  const report = v.lead.reportId && store ? await store.getJson(`report:${v.lead.reportId}`) : null;
  if ((v.lead.kind === 'report_email' || v.lead.kind === 'reminder') && !report) {
    return errorJson('not_found', 'Rapporten finns inte längre. Kör en ny analys.', 404);
  }
  const result = await handleLead(v.lead, { env, platform, store, siteUrl: siteUrl(request, env), report });
  if (!result.stored && !result.notified) {
    return errorJson('not_configured', 'Formuläret är inte kopplat ännu. Mejla hej@wimco.se så länge.', 503);
  }
  return json({ ok: true, id: result.id, mailed: result.userMailed, remindOn: result.remindOn || null, mailConfigured: !!env.RESEND_API_KEY });
}

async function reportPage(id, request, env, platform, store) {
  const report = store ? await store.getJson(`report:${id}`) : null;
  let html = new TextDecoder().decode(await platform.loadAsset('/rapport/'));
  const base = siteUrl(request, env);
  if (report) {
    const title = `${report.host}: ${report.score.total}/100 i Wimco Score`;
    const desc = `Analys av ${report.host}: prestanda, mobil, tillgänglighet, SEO, tydlighet och konvertering – med konkreta förbättringar.`;
    html = setSlot(html, 'title', `<title>${escapeHtml(title)} | Wimco</title>`);
    html = setSlot(html, 'description', `<meta name="description" content="${escapeHtml(desc)}" data-slot="description">`);
    html = setSlot(html, 'og-title', `<meta property="og:title" content="${escapeHtml(title)}" data-slot="og-title">`);
    html = setSlot(html, 'og-description', `<meta property="og:description" content="${escapeHtml(desc)}" data-slot="og-description">`);
    html = setSlot(html, 'og-image', `<meta property="og:image" content="${base}/og/${id}.png" data-slot="og-image">`);
    html = setSlot(html, 'og-url', `<meta property="og:url" content="${base}/r/${id}" data-slot="og-url">`);
    html = setSlot(html, 'twitter-image', `<meta name="twitter:image" content="${base}/og/${id}.png" data-slot="twitter-image">`);
    html = setSlot(html, 'canonical', `<link rel="canonical" href="${base}/r/${id}" data-slot="canonical">`);
    html = setSlot(html, 'robots', `<meta name="robots" content="${report.public && !report.devData ? 'index, follow' : 'noindex, nofollow'}" data-slot="robots">`);
  }
  return new Response(html, {
    status: report ? 200 : 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': report?.public && !report?.devData ? 'all' : 'noindex, nofollow',
    },
  });
}

function setSlot(html, slot, replacement) {
  if (slot === 'title') return html.replace(/<title[^>]*data-slot="title"[^>]*>[\s\S]*?<\/title>|<title>[\s\S]*?<\/title>/, replacement);
  const re = new RegExp(`<(meta|link)[^>]*data-slot="${slot}"[^>]*>`);
  return html.replace(re, replacement);
}

async function ogImage(id, env, platform, store) {
  const report = store ? await store.getJson(`report:${id}`) : null;
  if (!report) {
    const def = await platform.loadAsset('/assets/og-default.png');
    return new Response(def, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' } });
  }
  const cached = await store.get(`og:${id}`);
  let png;
  if (cached) {
    png = Uint8Array.from(atob(cached), (c) => c.charCodeAt(0));
  } else {
    png = await renderOgPng(report, platform.loadAsset);
    let bin = '';
    for (let i = 0; i < png.length; i += 0x8000) bin += String.fromCharCode(...png.subarray(i, i + 0x8000));
    await store.put(`og:${id}`, btoa(bin), 60 * 60 * 24 * 180);
  }
  return new Response(png, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
}
