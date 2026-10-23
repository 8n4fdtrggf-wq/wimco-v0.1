'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { cx, format, vars } from '@/lib/css';
import { shake } from '@/lib/motion';
import { band } from '@/lib/score';
import { track, turnstileToken } from '@/lib/site';
import type { hero as HeroCopy, check as CheckCopy, result as ResultCopy } from '@/content/tillganglighet';
import styles from './A11yCheck.module.css';

/* ---------- The report, as stored by lib/a11y/check.js ---------- */
type Kind = 'start' | 'product' | 'search';
type Severity = 'critical' | 'serious' | 'moderate';
interface PageResult {
  kind: Kind;
  label: string;
  url: string | null;
  source: 'found' | 'given' | 'guess' | 'missing';
  ok: boolean;
  method: 'lighthouse' | 'rules' | null;
  score: number | null;
  reason: string | null;
  manual: number | null;
  issues: { id: string; count: number }[];
}
interface Issue {
  id: string;
  title: string;
  description: string;
  wcag: string[];
  severity: Severity;
  who: string[];
  fix: string | null;
  pages: Kind[];
  count: number;
  examples: { page: Kind; label: string; snippet: string }[];
}
export interface A11yReport {
  id: string;
  url: string;
  createdAt: string;
  host: string;
  devData: boolean;
  platform: { id: string; name: string } | null;
  overlay: { name: string } | null;
  statement: { found: boolean; url: string | null };
  pages: PageResult[];
  issues: Issue[];
  summary: { method: 'lighthouse' | 'rules' | 'mixed' | null; pagesTested: number; score: number | null; critical: number; serious: number; moderate: number; total: number; instances: number };
  verdict: string;
}

type Event =
  | { type: 'accepted'; host: string }
  | { type: 'step'; id: string; status: 'running' | 'done'; label: string }
  | { type: 'pages'; pages: { kind: Kind; url: string | null }[] }
  | { type: 'page'; kind: Kind; ok: boolean; score?: number }
  | { type: 'result'; report: A11yReport }
  | { type: 'error'; code: string; message: string };

type RowState = { status: 'wait' | 'run' | 'done' | 'skip'; score?: number; note: string };
type Phase = 'idle' | 'running' | 'done' | 'error';
const KINDS: Kind[] = ['start', 'product', 'search'];

/** Shared with the order form: the latest result, also announced as a window event. */
export const A11Y_EVENT = 'wimco:a11y-result';

const looksLikeUrl = (raw: string) => {
  const s = raw.trim();
  if (!s) return false;
  try {
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).hostname.includes('.');
  } catch {
    return false;
  }
};

interface Props {
  hero: typeof HeroCopy;
  copy: typeof CheckCopy;
  text: typeof ResultCopy;
}

/**
 * The free check. Left: the pitch. Right: an instrument card like the start page's, with the address
 * field and three rows for the pages PTS reviews, which light up as POST /api/a11y streams results.
 * The full result opens below. ?r=<id> reopens a saved result; ?url=… starts a check straight away.
 */
export function A11yCheck({ hero, copy, text }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState(copy.idleNote);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<Kind, RowState>>(() => initialRows(copy.waiting));
  const [report, setReport] = useState<A11yReport | null>(null);
  const [host, setHost] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const productRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const focusResult = useRef(false);

  useEffect(() => {
    if (!report) return;
    window.dispatchEvent(new CustomEvent(A11Y_EVENT, { detail: report }));
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete('url');
      u.searchParams.set('r', report.id);
      history.replaceState(history.state, '', u);
    } catch {
      /* ignore */
    }
    if (focusResult.current) {
      focusResult.current = false;
      resultRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      resultRef.current?.focus({ preventScroll: true });
    }
  }, [report]);

  const showSaved = (r: A11yReport) => {
    setReport(r);
    setHost(r.host);
    setRows(rowsFrom(r, copy));
    setPhase('done');
    setStatus('');
    if (inputRef.current) inputRef.current.value = r.host;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('r');
    const url = params.get('url');
    if (rid && /^[a-z0-9]{8,20}$/.test(rid)) {
      setStatus(copy.loadingSaved);
      fetch(`/api/a11y/${rid}`, { headers: { accept: 'application/json' } })
        .then(async (res) => ({ ok: res.ok, data: await res.json() }))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.message);
          showSaved(data as A11yReport);
        })
        .catch((e: Error) => {
          setPhase('error');
          setError(e.message || copy.unexpectedEnd);
          setStatus(copy.idleNote);
        });
    } else if (url) {
      if (inputRef.current) inputRef.current.value = url.slice(0, 300);
      void run(url.slice(0, 300), '', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fail = (message: string, code = 'failed') => {
    setPhase('error');
    setError(message);
    setStatus(copy.idleNote);
    setRows(initialRows(copy.waiting));
    track('a11y_error', { code });
  };

  const handle = (ev: Event): boolean => {
    switch (ev.type) {
      case 'accepted':
        setHost(ev.host);
        return false;
      case 'step':
        if (ev.status === 'running') setStatus(`${ev.label}…`);
        if (ev.id === 'fetch' && ev.status === 'running') setRows((r) => ({ ...r, start: { status: 'run', note: copy.measuring } }));
        return false;
      case 'pages':
        setRows((r) => {
          const next = { ...r };
          for (const p of ev.pages) next[p.kind] = p.url ? { status: 'run', note: copy.measuring } : { status: 'skip', note: copy.missing };
          return next;
        });
        setStatus(copy.measuringNote);
        return false;
      case 'page':
        setRows((r) => ({ ...r, [ev.kind]: ev.ok ? { status: 'done', score: ev.score, note: '' } : { status: 'skip', note: copy.failed } }));
        return false;
      case 'result':
        focusResult.current = true;
        setReport(ev.report);
        setRows(rowsFrom(ev.report, copy));
        setPhase('done');
        setStatus('');
        track('a11y_complete', { score: ev.report.summary.score, critical: ev.report.summary.critical });
        return true;
      case 'error':
        fail(ev.message, ev.code);
        return true;
    }
  };

  async function run(url: string, product: string, honeypot: string) {
    setPhase('running');
    setError(null);
    setReport(null);
    setHost('');
    setRows(initialRows(copy.waiting));
    setStatus(copy.preparing);
    track('a11y_start', {});
    let res: Response;
    try {
      res = await fetch('/api/a11y', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/x-ndjson' },
        body: JSON.stringify({ url, product: product || undefined, company_site: honeypot, turnstileToken: await turnstileToken() }),
      });
    } catch {
      fail(copy.networkError);
      return;
    }
    if (!res.ok || !(res.headers.get('content-type') || '').includes('ndjson') || !res.body) {
      const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
      fail(data.message || copy.unexpectedEnd, data.code);
      if (data.code === 'invalid_url' || data.code === 'blocked_target') inputRef.current?.focus();
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finished = false;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            if (handle(JSON.parse(line) as Event)) finished = true;
          } catch {
            /* skip a malformed line */
          }
        }
      }
    } catch {
      if (!finished) fail(copy.networkError);
      return;
    }
    if (!finished) fail(copy.unexpectedEnd);
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (phase === 'running') return;
    const raw = inputRef.current?.value ?? '';
    if (!looksLikeUrl(raw)) {
      setPhase('error');
      setError(copy.invalid);
      inputRef.current?.focus();
      shake(boxRef.current);
      return;
    }
    const honeypot = (e.currentTarget.elements.namedItem('company_site') as HTMLInputElement | null)?.value ?? '';
    void run(raw.trim(), productRef.current?.value.trim() ?? '', honeypot);
  };

  const again = () => {
    setPhase('idle');
    setReport(null);
    setRows(initialRows(copy.waiting));
    setStatus(copy.idleNote);
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.scrollIntoView({ block: 'center' });
      inputRef.current.focus({ preventScroll: true });
    }
  };

  const avg = report?.summary.score ?? null;

  return (
    <>
      <section id="top" className={styles.hero} aria-labelledby="a11y-title">
        <div className={cx('wrap', styles.grid)}>
          <div className={styles.copy}>
            <p className="tag rise" style={vars({ i: 0 })}>
              {hero.tag}
            </p>
            <h1 id="a11y-title" className={cx(styles.title, 'rise')} style={vars({ i: 1 })}>
              {hero.title}
            </h1>
            <p className={cx(styles.lede, 'rise')} style={vars({ i: 2 })}>
              {hero.lede}
            </p>
            <ul className={cx(styles.proof, 'rise')} style={vars({ i: 3 })}>
              {hero.proof.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>

          <div id={copy.id} className={cx(styles.card, 'rise')} style={vars({ i: 2 })}>
            <div className={styles.cardHead}>
              <span className="tag">{copy.tag}</span>
              {host && <span className={styles.host}>{host}</span>}
            </div>
            <h2 className={styles.cardTitle}>{copy.title}</h2>

            <form onSubmit={onSubmit} noValidate className={styles.form}>
              <div ref={boxRef} className={styles.field}>
                <label htmlFor="a11y-url" className="sr-only">
                  {copy.inputLabel}
                </label>
                <input
                  ref={inputRef}
                  id="a11y-url"
                  name="url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  placeholder={copy.placeholder}
                  disabled={phase === 'running'}
                  aria-invalid={phase === 'error' && error === copy.invalid ? true : undefined}
                  aria-describedby="a11y-status"
                />
                <Button type="submit" arrow>
                  {copy.submit}
                </Button>
              </div>
              <details className={styles.more}>
                <summary>{copy.productToggle}</summary>
                <label htmlFor="a11y-product">{copy.productLabel}</label>
                <input
                  ref={productRef}
                  id="a11y-product"
                  name="product"
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={copy.productPlaceholder}
                  disabled={phase === 'running'}
                />
              </details>
              <div className={styles.honeypot} aria-hidden="true">
                <label htmlFor="a11y-hp">Lämna tomt</label>
                <input id="a11y-hp" name="company_site" tabIndex={-1} autoComplete="off" />
              </div>
            </form>

            <ol className={styles.rows} aria-label={copy.title}>
              {KINDS.map((k) => {
                const r = rows[k];
                return (
                  <li key={k} data-status={r.status} data-band={r.score != null ? band(r.score) : undefined}>
                    <span className={styles.dot} aria-hidden="true" />
                    <span className={styles.rowName}>
                      {copy.pages[k]}
                      <small>{copy.pageHints[k]}</small>
                    </span>
                    <b className={styles.rowScore}>{r.status === 'done' ? r.score : r.note}</b>
                  </li>
                );
              })}
            </ol>
            <div id="a11y-status" className={styles.status} aria-live="polite">
              {phase === 'error' && error ? <p className={styles.error}>{error}</p> : <p>{status}</p>}
            </div>
          </div>
        </div>
      </section>

      {report && (
        <section ref={resultRef} className={styles.result} aria-labelledby="a11y-result-title" tabIndex={-1}>
          <div className="wrap">
            <Result report={report} text={text} copy={copy} avg={avg} onAgain={again} onRerun={() => void run(report.url, '', '')} />
          </div>
        </section>
      )}
    </>
  );
}

function initialRows(waiting: string): Record<Kind, RowState> {
  return { start: { status: 'wait', note: waiting }, product: { status: 'wait', note: waiting }, search: { status: 'wait', note: waiting } };
}

function rowsFrom(r: A11yReport, copy: Props['copy']): Record<Kind, RowState> {
  const out = initialRows(copy.waiting);
  for (const p of r.pages) out[p.kind] = p.ok ? { status: 'done', score: p.score ?? 0, note: '' } : { status: 'skip', note: p.url ? copy.failed : copy.missing };
  return out;
}

/* ---------- Result ---------- */

function Result({
  report: r,
  text,
  copy,
  avg,
  onAgain,
  onRerun,
}: {
  report: A11yReport;
  text: Props['text'];
  copy: Props['copy'];
  avg: number | null;
  onAgain: () => void;
  onRerun: () => void;
}) {
  const [all, setAll] = useState(false);
  const s = r.summary;
  const shown = all ? r.issues : r.issues.slice(0, 8);
  const manual = Math.max(0, ...r.pages.filter((p) => p.ok).map((p) => p.manual ?? 0));
  const date = new Date(r.createdAt).toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' });
  const pick = (id: string) => () => {
    window.dispatchEvent(new CustomEvent('wimco:a11y-package', { detail: id }));
    track('a11y_cta', { package: id });
  };

  return (
    <div className={styles.report}>
      {r.devData && (
        <div className={styles.dev} role="note">
          <strong>{text.devTitle}</strong> {text.devBody}
        </div>
      )}

      {s.method && s.method !== 'lighthouse' && (
        <div className={styles.rulesNote} role="note">
          <p>
            <strong>{text.rulesTitle}</strong> {text.rulesBody}
          </p>
          <Button variant="ghost" size="sm" onClick={onRerun}>
            {text.rulesAgain}
          </Button>
        </div>
      )}

      <div className={styles.summary}>
        <div className={styles.big} data-band={avg != null ? band(avg) : undefined}>
          <b>{avg ?? '–'}</b>
          <span>{format(text.scoreOf, { n: s.pagesTested, pages: s.pagesTested === 1 ? 'sida' : 'sidor' })}</span>
        </div>
        <div className={styles.verdict}>
          <p className="tag">
            {text.tag} · {r.host} · {date}
            {r.platform ? ` · ${r.platform.name}` : ''}
          </p>
          <h2 id="a11y-result-title">{r.verdict}</h2>
          <p className={styles.counts}>
            <span data-sev="critical">{format(text.counts.critical, { n: s.critical })}</span>
            <span data-sev="serious">{format(text.counts.serious, { n: s.serious })}</span>
            <span data-sev="moderate">{format(text.counts.moderate, { n: s.moderate })}</span>
            <span className="mono">{format(text.counts.instances, { n: s.instances })}</span>
          </p>
        </div>
      </div>

      <ul className={styles.pages}>
        {r.pages.map((p) => (
          <li key={p.kind} data-ok={p.ok || undefined}>
            <div className={styles.pageHead}>
              <h3>{copy.pages[p.kind]}</h3>
              <b data-band={p.ok && p.score != null ? band(p.score) : undefined}>{p.ok ? p.score : '–'}</b>
            </div>
            <p>{p.ok ? (p.issues.length ? format(text.issueTypes, { n: p.issues.length }) : text.noneOnPage) : p.reason}</p>
            <p className={styles.pageSrc}>
              {text.source[p.source]}
              {p.ok && p.method ? ` · ${text.method[p.method]}` : ''}
            </p>
            {p.url && (
              <a className={styles.pageUrl} href={p.url} target="_blank" rel="nofollow noopener noreferrer">
                {p.url.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            )}
          </li>
        ))}
      </ul>

      <ul className={styles.flags}>
        {r.statement.found ? (
          <li data-tone="good">
            <i aria-hidden="true" />
            <span>{text.statementFound}</span>
          </li>
        ) : (
          <li data-tone="poor">
            <i aria-hidden="true" />
            <span>
              <strong>{text.statementMissingTitle}</strong> {text.statementMissing}
            </span>
          </li>
        )}
        {r.overlay && (
          <li data-tone="avg">
            <i aria-hidden="true" />
            <span>
              <strong>{format(text.overlayTitle, { name: r.overlay.name })}</strong> {text.overlay}
            </span>
          </li>
        )}
        <li data-tone="info">
          <i aria-hidden="true" />
          <span>
            <strong>{text.manualTitle}</strong> {manual ? `${manual} kontroller. ` : ''}
            {text.manual}
          </span>
        </li>
      </ul>

      <div className={styles.issues}>
        <h3 className={styles.issuesTitle}>
          {text.issuesTitle} <span className="mono">{r.issues.length}</span>
        </h3>
        {r.issues.length === 0 && <p className={styles.none}>{text.noIssues}</p>}
        {shown.map((i) => (
          <details key={i.id} className={styles.issue}>
            <summary>
              <i className={styles.sevDot} data-sev={i.severity} aria-hidden="true" />
              <span className={styles.issueMain}>
                <span className={styles.issueTitle}>{i.title}</span>
                <span className={styles.issueMeta}>
                  <span className={styles.sevChip} data-sev={i.severity}>
                    {text.severity[i.severity]}
                  </span>
                  {i.wcag.length > 0 && <span className="mono">WCAG {i.wcag.join(', ')}</span>}
                  <span>{i.pages.map((k) => copy.pages[k]).join(', ')}</span>
                </span>
              </span>
              <span className={cx(styles.issueCount, 'mono')}>{format(text.count, { n: i.count })}</span>
              <span className={styles.chev} aria-hidden="true" />
            </summary>
            <div className={styles.issueBody}>
              {i.fix && (
                <p>
                  <strong>{text.fix}:</strong> {i.fix}
                </p>
              )}
              {i.description && <p className={styles.muted}>{i.description}</p>}
              <dl>
                {i.who.length > 0 && (
                  <>
                    <dt>{text.who}</dt>
                    <dd>{i.who.join(', ')}</dd>
                  </>
                )}
                <dt>{text.pagesLabel}</dt>
                <dd>{i.pages.map((k) => copy.pages[k]).join(', ')}</dd>
              </dl>
              {i.examples.length > 0 && (
                <div className={styles.examples}>
                  <p className="tag">{text.examples}</p>
                  <ul>
                    {i.examples.map((ex, n) => (
                      <li key={n}>
                        <span>
                          {copy.pages[ex.page]}
                          {ex.label ? ` · ${ex.label}` : ''}
                        </span>
                        {ex.snippet && <code>{ex.snippet}</code>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        ))}
        {!all && r.issues.length > shown.length && (
          <button type="button" className={styles.showAll} onClick={() => setAll(true)}>
            {format(text.showAll, { n: r.issues.length })}
          </button>
        )}
      </div>

      <div className={styles.cta}>
        <div>
          <h3>{s.total ? text.ctaTitleIssues : text.ctaTitleClean}</h3>
          <p>{text.ctaBody}</p>
        </div>
        <div className={styles.ctaActions}>
          <Button href="#bestall" arrow onClick={pick(s.total ? 'atgard' : 'granskning')}>
            {s.total ? text.ctaFix : text.ctaReview}
          </Button>
          <Button href="#paket" variant="ghost">
            {text.ctaCompare}
          </Button>
        </div>
      </div>

      <p className={styles.saved}>
        {text.saved}{' '}
        <a className="link" href={`/tillganglighet/?r=${r.id}`}>
          {text.savedLink}
        </a>
        {' · '}
        <button type="button" className={styles.linkButton} onClick={onAgain}>
          {text.again}
        </button>
      </p>
    </div>
  );
}
