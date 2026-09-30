// E-post via Resend (RESEND_API_KEY). Utan nyckel sparas leads ändå, men inget mejl skickas.
import { escapeHtml } from './http.js';

export async function sendMail(env, platform, { to, subject, text, html, replyTo }) {
  if (!env.RESEND_API_KEY) return { ok: false, reason: 'not_configured' };
  const from = env.MAIL_FROM || 'Wimco <hej@wimco.se>';
  try {
    const res = await platform.trustedFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, text, html, reply_to: replyTo || undefined }),
    });
    return { ok: res.ok, reason: res.ok ? null : `http_${res.status}` };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

export function layout(title, bodyHtml) {
  return `<!doctype html><html lang="sv"><body style="margin:0;padding:32px 20px;background:#F4F6F5;font-family:Arial,sans-serif;color:#0B1B33">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px">
<tr><td><p style="font-size:20px;font-weight:bold;margin:0 0 20px">Wimco<span style="color:#FF5A1F">.</span></p>
<h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>${bodyHtml}
<p style="font-size:13px;color:#4A5568;margin-top:28px">Wimco · hej@wimco.se · +46 72 218 05 09</p></td></tr></table></body></html>`;
}

export const p = (s) => `<p style="font-size:15px;line-height:1.55;margin:0 0 14px">${s}</p>`;
export const button = (href, label) => `<p style="margin:22px 0"><a href="${escapeHtml(href)}" style="background:#FF5A1F;color:#0B1B33;text-decoration:none;font-weight:bold;padding:13px 20px;border-radius:999px;display:inline-block">${escapeHtml(label)}</a></p>`;
