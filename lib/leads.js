// Förfrågningar och frivilliga e-postutskick. Allt sparas i KV; notis till Wimco via e-post.
import { escapeHtml } from './http.js';
import { sendMail, layout, p, button } from './mail.js';
import { newId } from './util/ids.js';
import { SERVICES } from './analysis/catalog.js';

export const LEAD_KINDS = {
  project: 'Projektförfrågan',
  review: 'Kostnadsfri genomgång',
  quote: 'Offertförfrågan',
  implement: 'Genomför förbättringarna',
  report_email: 'Rapport via e-post',
  reminder: 'Ny analys senare',
};

const EMAIL_RE = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,24}$/i;
const LEAD_TTL = 60 * 60 * 24 * 730; // 24 månader
const cleanStr = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max);

export function validateLead(body) {
  const errors = {};
  const kind = cleanStr(body.kind, 20);
  if (!LEAD_KINDS[kind]) return { ok: false, errors: { kind: 'Okänd typ av förfrågan.' } };
  const lead = {
    kind,
    name: cleanStr(body.name, 120),
    email: cleanStr(body.email, 254).toLowerCase(),
    company: cleanStr(body.company, 160),
    phone: cleanStr(body.phone, 40),
    website: cleanStr(body.site, 300),
    service: SERVICES[cleanStr(body.service, 30)] ? cleanStr(body.service, 30) : null,
    budget: cleanStr(body.budget, 60),
    message: cleanStr(body.message, 4000),
    reportId: /^[a-z0-9]{8,20}$/.test(String(body.reportId || '')) ? String(body.reportId) : null,
    context: cleanStr(body.context, 160),
    consent: body.consent === true,
    remindMonths: [1, 3, 6].includes(Number(body.remindMonths)) ? Number(body.remindMonths) : null,
    remind: body.remind === true || body.remind === 'on',
  };
  if (!EMAIL_RE.test(lead.email)) errors.email = 'Ange en giltig e-postadress, t.ex. namn@foretag.se.';
  if (kind === 'project' || kind === 'quote') {
    if (!lead.name) errors.name = 'Skriv ditt namn så vi vet vem vi svarar.';
    if (lead.message.length < 10) errors.message = 'Beskriv kort vad du vill ha hjälp med (minst 10 tecken).';
  }
  if ((kind === 'report_email' || kind === 'reminder') && !lead.reportId) errors.reportId = 'Rapporten saknas.';
  if ((kind === 'report_email' || kind === 'reminder') && !lead.consent) errors.consent = 'Bekräfta att vi får mejla dig.';
  if ((kind === 'reminder' || lead.remind) && !lead.remindMonths) lead.remindMonths = 3;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, lead };
}

export async function handleLead(lead, { env, platform, store, siteUrl, report }) {
  const id = newId();
  const createdAt = new Date().toISOString();
  const record = { id, createdAt, ...lead, reportHost: report?.host || null, reportScore: report?.score?.total ?? null };
  if (store) await store.putJson(`lead:${createdAt}:${id}`, record, LEAD_TTL);

  const reportUrl = lead.reportId ? `${siteUrl}/r/${lead.reportId}` : null;
  const results = { stored: !!store, notified: false, userMailed: false };

  // Påminnelse om ny analys
  if ((lead.kind === 'reminder' || (lead.kind === 'report_email' && lead.remind && lead.consent)) && store && report) {
    const due = new Date();
    due.setMonth(due.getMonth() + lead.remindMonths);
    const day = due.toISOString().slice(0, 10);
    const ttl = Math.ceil((due.getTime() - Date.now()) / 1000) + 60 * 60 * 24 * 30;
    await store.putJson(`remind:${day}:${id}`, { id, email: lead.email, url: report.url, host: report.host, reportId: report.id, score: report.score.total }, ttl);
    results.remindOn = day;
  }

  // Rapport till besökaren
  if (lead.kind === 'report_email' && report) {
    const r = await sendMail(env, platform, {
      to: lead.email,
      subject: `Wimco Score för ${report.host}: ${report.score.total}/100`,
      text: `Här är din analys av ${report.host}: ${reportUrl}\n\nWimco Score: ${report.score.total}/100.\n\nVill du ha hjälp att genomföra förbättringarna? Svara på det här mejlet.\n\nWimco · hej@wimco.se`,
      html: layout(`Din analys av ${report.host}`, p(`Wimco Score: <strong>${escapeHtml(report.score.total)}/100</strong> (${escapeHtml(report.score.grade)}).`)
        + p('Rapporten visar vad som fungerar, vad du bör åtgärda först och hur stor insatsen är.')
        + button(reportUrl, 'Öppna rapporten')
        + p('Vill du ha hjälp att genomföra förbättringarna? Svara bara på det här mejlet.')),
      replyTo: env.LEAD_TO_EMAIL || 'hej@wimco.se',
    });
    results.userMailed = r.ok;
  }

  // Notis till Wimco (för alla typer)
  const lines = [
    ['Typ', LEAD_KINDS[lead.kind]],
    ['Namn', lead.name], ['E-post', lead.email], ['Företag', lead.company], ['Telefon', lead.phone],
    ['Webbplats', lead.website || report?.url], ['Tjänst', lead.service ? SERVICES[lead.service].name : ''],
    ['Budget', lead.budget], ['Sammanhang', lead.context],
    ['Rapport', reportUrl ? `${reportUrl} (${report?.host}, ${report?.score?.total}/100)` : ''],
    ['Påminnelse', results.remindOn || ''], ['Meddelande', lead.message],
  ].filter(([, v]) => v);
  const n = await sendMail(env, platform, {
    to: env.LEAD_TO_EMAIL || 'hej@wimco.se',
    subject: `[Wimco] ${LEAD_KINDS[lead.kind]}${lead.name ? ` från ${lead.name}` : ''}${report ? ` – ${report.host}` : ''}`,
    text: lines.map(([k, v]) => `${k}: ${v}`).join('\n'),
    html: layout(LEAD_KINDS[lead.kind], lines.map(([k, v]) => p(`<strong>${escapeHtml(k)}:</strong> ${escapeHtml(v).replace(/\n/g, '<br>')}`)).join('')),
    replyTo: lead.email,
  });
  results.notified = n.ok;
  return { id, ...results };
}

// Körs av en schemalagd trigger (se docs/SETUP.md). Skickar påminnelser vars datum passerats.
export async function processReminders({ env, platform, store, siteUrl }) {
  if (!store) return { sent: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const keys = await store.list('remind:', 500);
  let sent = 0;
  for (const key of keys) {
    const day = key.split(':')[1];
    if (day > today) continue;
    const r = await store.getJson(key);
    if (!r) continue;
    const analyzeUrl = `${siteUrl}/?url=${encodeURIComponent(r.url)}&prev=${r.reportId}#analys`;
    const res = await sendMail(env, platform, {
      to: r.email,
      subject: `Dags att analysera ${r.host} igen`,
      text: `Förra gången fick ${r.host} ${r.score}/100 i Wimco Score. Kör en ny analys och jämför: ${analyzeUrl}`,
      html: layout(`Dags för en ny analys av ${r.host}`, p(`Förra gången fick sajten <strong>${escapeHtml(r.score)}/100</strong>. Kör en ny analys och se vad som har förändrats.`)
        + button(analyzeUrl, 'Analysera igen och jämför')
        + p('Du fick det här mejlet för att du bad om en påminnelse. Det skickas bara en gång.')),
    });
    if (res.ok) { await store.delete(key); sent++; }
  }
  return { sent };
}
