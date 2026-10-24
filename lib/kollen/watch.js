// E-handelsbevakningen: butiker som kontrolleras automatiskt varje månad.
//
// En butik läggs till när bevakningen är avtalad (inte vid beställning), med
//   curl -X POST https://wimco.se/api/admin/watch -H "Authorization: Bearer $CRON_SECRET" \
//        -H "content-type: application/json" -d '{"url":"dinbutik.se","email":"kund@dinbutik.se"}'
// POST /api/cron/kollen körs dagligen (se .github/workflows/cron.yml) och kontrollerar de butiker
// vars senaste kontroll är äldre än intervallet. Wimco får alltid en sammanfattning; kunden får ett
// mejl när e-post är angiven.
import { normalizeUrl, displayHost } from '../net/url-guard.js';
import { escapeHtml } from '../http.js';
import { sendMail, layout, p, button } from '../mail.js';
import { runKollen, diffReports } from './run.js';
import { AREAS, DISCLAIMER } from './catalog.js';

const EMAIL_RE = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,24}$/i;
const AREA_NAME = Object.fromEntries(AREAS.map((a) => [a.id, a.name]));
const STATUS_NAME = { fail: 'rött', warn: 'gult', pass: 'grönt', unknown: 'okänt' };
const DAY = 24 * 60 * 60 * 1000;
const key = (host) => `watch:${host}`;

export async function addWatch(store, body) {
  const url = normalizeUrl(String(body?.url || ''));
  const host = displayHost(url);
  const email = String(body?.email || '').trim().toLowerCase();
  if (email && !EMAIL_RE.test(email)) return { ok: false, message: 'Ogiltig e-postadress.' };
  const existing = await store.getJson(key(host));
  const record = {
    host,
    url: url.toString(),
    email: email || null,
    company: String(body?.company || '').slice(0, 160) || null,
    intervalDays: [7, 14, 30].includes(Number(body?.intervalDays)) ? Number(body.intervalDays) : 30,
    createdAt: existing?.createdAt || new Date().toISOString(),
    lastRunAt: existing?.lastRunAt || null,
    lastKollenId: existing?.lastKollenId || null,
    lastSummary: existing?.lastSummary || null,
  };
  await store.putJson(key(host), record);
  return { ok: true, watch: record };
}

export async function removeWatch(store, body) {
  const host = displayHost(normalizeUrl(String(body?.url || '')));
  await store.delete(key(host));
  return { ok: true, host };
}

export async function listWatches(store) {
  const keys = await store.list('watch:', 1000);
  const out = [];
  for (const k of keys) {
    const w = await store.getJson(k);
    if (w) out.push(w);
  }
  return out;
}

/** Runs the kollen for up to `limit` due shops. Called daily; each run is one or two shops so it stays within time limits. */
export async function runDueWatches({ env, platform, store, siteUrl, limit = 2, now = Date.now() }) {
  const due = (await listWatches(store))
    .filter((w) => !w.lastRunAt || now - Date.parse(w.lastRunAt) >= w.intervalDays * DAY - DAY / 2)
    .sort((a, b) => String(a.lastRunAt || '').localeCompare(String(b.lastRunAt || '')))
    .slice(0, limit);
  const ran = [];
  for (const w of due) {
    let report = null;
    let error = null;
    try {
      for await (const ev of runKollen(w.url, { env, platform, store })) {
        if (ev.type === 'result') report = ev.report;
        if (ev.type === 'error') error = ev.message;
      }
    } catch (err) {
      error = err?.message || 'Kontrollen misslyckades.';
    }
    if (!report) {
      // Försök igen nästa dag, men logga felet hos Wimco.
      await sendMail(env, platform, {
        to: env.LEAD_TO_EMAIL || 'hej@wimco.se',
        subject: `[Wimco] Bevakning misslyckades: ${w.host}`,
        text: `E-handelskollen kunde inte köras för ${w.host}: ${error || 'okänt fel'}. Den försöks igen i morgon.`,
        html: layout(`Bevakningen misslyckades: ${w.host}`, p(escapeHtml(error || 'Okänt fel.')) + p('Den försöks igen i morgon.')),
      });
      ran.push({ host: w.host, ok: false, error });
      continue;
    }
    const prev = w.lastKollenId ? await store.getJson(`kollen:${w.lastKollenId}`) : null;
    const diff = diffReports(prev, report);
    await notify({ env, platform, siteUrl, watch: w, report, diff, first: !prev });
    await store.putJson(key(w.host), { ...w, lastRunAt: new Date(now).toISOString(), lastKollenId: report.id, lastSummary: report.summary });
    ran.push({ host: w.host, ok: true, id: report.id, summary: report.summary, worse: diff.worse.length });
  }
  return { checked: ran.length, ran };
}

async function notify({ env, platform, siteUrl, watch, report, diff, first }) {
  const link = `${siteUrl}/e-handelskollen/?r=${report.id}`;
  const rows = report.areas.map((a) => `${AREA_NAME[a.id]}: ${STATUS_NAME[a.status]}. ${a.summary}`);
  const changes = [
    ...diff.worse.map((d) => `${AREA_NAME[d.id]} har blivit ${STATUS_NAME[d.to]} (var ${STATUS_NAME[d.from]}).`),
    ...diff.better.map((d) => `${AREA_NAME[d.id]} har blivit ${STATUS_NAME[d.to]} (var ${STATUS_NAME[d.from]}).`),
  ];
  const headline = first
    ? `Första bevakningen av ${watch.host}`
    : diff.worse.length
      ? `${diff.worse.length} ${diff.worse.length === 1 ? 'område har' : 'områden har'} blivit sämre på ${watch.host}`
      : `Månadens kontroll av ${watch.host}`;
  const htmlBody = (extra) =>
    layout(headline,
      (changes.length ? p(`<strong>Förändringar sedan förra kontrollen:</strong><br>${changes.map(escapeHtml).join('<br>')}`) : '')
      + p(rows.map(escapeHtml).join('<br>'))
      + button(link, 'Se hela resultatet')
      + extra
      + p(`<span style="font-size:13px;color:#4A5568">${escapeHtml(DISCLAIMER)}</span>`));

  await sendMail(env, platform, {
    to: env.LEAD_TO_EMAIL || 'hej@wimco.se',
    subject: `[Wimco] Bevakning: ${watch.host} – ${report.summary.fail} röda, ${report.summary.warn} gula${diff.worse.length ? ` (${diff.worse.length} sämre)` : ''}`,
    text: [headline, ...changes, '', ...rows, '', link].join('\n'),
    html: htmlBody(watch.email ? p(`Kunden (${escapeHtml(watch.email)}) har fått samma sammanfattning.`) : ''),
  });
  if (watch.email) {
    await sendMail(env, platform, {
      to: watch.email,
      subject: diff.worse.length ? `${watch.host}: ${diff.worse.length} ${diff.worse.length === 1 ? 'område har' : 'områden har'} blivit sämre` : `Månadens E-handelskoll för ${watch.host}`,
      text: [headline, ...changes, '', ...rows, '', link, '', 'Vi hör av oss om något behöver åtgärdas. Svara på det här mejlet om du har frågor.', '', DISCLAIMER].join('\n'),
      html: htmlBody(p('Vi hör av oss om något behöver åtgärdas. Svara på det här mejlet om du har frågor.')),
      replyTo: env.LEAD_TO_EMAIL || 'hej@wimco.se',
    });
  }
}
