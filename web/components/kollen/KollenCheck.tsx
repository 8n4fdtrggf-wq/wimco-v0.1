'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { cx, format, vars } from '@/lib/css';
import { shake } from '@/lib/motion';
import { track, turnstileToken } from '@/lib/site';
import type { hero as HeroCopy, check as CheckCopy, result as ResultCopy } from '@/content/kollen';
import type { KollenArea, KollenPackage, AreaId } from '../../../lib/kollen/catalog.js';
import { RESULT_EVENT, setSelection, toggleSelection, totalFor, useSelection } from './selection';
import a11y from '../a11y/A11yCheck.module.css';
import styles from './KollenCheck.module.css';

type Status = 'fail' | 'warn' | 'pass' | 'unknown';
interface Finding {
  severity: 'fail' | 'warn' | 'info';
  title: string;
  detail: string;
  evidence?: string;
  page?: string;
}
interface Area {
  id: AreaId;
  status: Status;
  method: 'measured' | 'rules';
  summary: string;
  findings: Finding[];
  a11yId?: string;
  score?: number | null;
}
export interface KollenReport {
  id: string;
  url: string;
  host: string;
  createdAt: string;
  devData: boolean;
  platform: { id: string; name: string } | null;
  a11yId: string;
  areas: Area[];
  summary: { fail: number; warn: number; pass: number; unknown: number };
  verdict: string;
}
type Event =
  | { type: 'accepted'; host: string }
  | { type: 'step'; id: string; status: 'running' | 'done'; label: string }
  | { type: 'pages'; pages: { kind: string; url: string | null }[] }
  | { type: 'page'; kind: string; ok: boolean }
  | { type: 'area'; id: AreaId; status: Status; summary: string }
  | { type: 'result'; report: KollenReport }
  | { type: 'error'; code: string; message: string };

type Row = { status: 'wait' | 'run' | Status; note: string };
type Phase = 'idle' | 'running' | 'done' | 'error';
const BAND: Record<string, string | undefined> = { fail: 'poor', warn: 'avg', pass: 'good' };

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
  areas: KollenArea[];
  packages: Record<string, KollenPackage>;
  disclaimer: string;
}

/**
 * E-handelskollen. Left: the pitch. Right: an instrument card with the address field and the five areas,
 * which turn red, amber or green as POST /api/kollen streams results. The full result opens below, with
 * a fixed-price package on every red area. ?r=<id> reopens a saved result; ?url=… starts a check.
 */
export function KollenCheck({ hero, copy, text, areas, packages, disclaimer }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState(copy.idleNote);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, Row>>(() => initialRows(areas, copy.waiting));
  const [report, setReport] = useState<KollenReport | null>(null);
  const [host, setHost] = useState('');
  const measured = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const focusResult = useRef(false);

  useEffect(() => {
    if (!report) return;
    window.dispatchEvent(new CustomEvent(RESULT_EVENT, { detail: report }));
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
      // Every red area starts out picked in the order, so "rätta det röda" is one click away.
      setSelection(report.areas.filter((a) => a.status === 'fail').map((a) => areas.find((x) => x.id === a.id)?.package).filter((x): x is string => !!x));
      resultRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      resultRef.current?.focus({ preventScroll: true });
    }
  }, [report, areas]);

  const showSaved = (r: KollenReport) => {
    setReport(r);
    setHost(r.host);
    setRows(rowsFrom(r, areas, copy.waiting, text.status));
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
      fetch(`/api/kollen/${rid}`, { headers: { accept: 'application/json' } })
        .then(async (res) => ({ ok: res.ok, data: await res.json() }))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.message);
          showSaved(data as KollenReport);
        })
        .catch((e: Error) => {
          setPhase('error');
          setError(e.message || copy.unexpectedEnd);
          setStatus(copy.idleNote);
        });
    } else if (url) {
      if (inputRef.current) inputRef.current.value = url.slice(0, 300);
      void run(url.slice(0, 300), '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fail = (message: string, code = 'failed') => {
    setPhase('error');
    setError(message);
    setStatus(copy.idleNote);
    setRows(initialRows(areas, copy.waiting));
    track('kollen_error', { code });
  };

  const setRow = (id: string, row: Row) => setRows((r) => ({ ...r, [id]: row }));

  const handle = (ev: Event): boolean => {
    switch (ev.type) {
      case 'accepted':
        setHost(ev.host);
        setRow('tillganglighet', { status: 'run', note: copy.running });
        return false;
      case 'step':
        if (ev.status === 'running') setStatus(`${ev.label}…`);
        if (ev.id === 'texts' && ev.status === 'running') {
          for (const a of areas) if (a.id !== 'tillganglighet') setRow(a.id, { status: 'run', note: copy.running });
        }
        return false;
      case 'pages':
        setStatus(copy.measuringNote);
        return false;
      case 'page':
        measured.current += 1;
        setRow('tillganglighet', { status: 'run', note: `${measured.current} av 3 sidor` });
        return false;
      case 'area':
        setRow(ev.id, { status: ev.status, note: text.status[ev.status] });
        return false;
      case 'result':
        focusResult.current = true;
        setReport(ev.report);
        setRows(rowsFrom(ev.report, areas, copy.waiting, text.status));
        setPhase('done');
        setStatus('');
        track('kollen_complete', { fail: ev.report.summary.fail, warn: ev.report.summary.warn });
        return true;
      case 'error':
        fail(ev.message, ev.code);
        return true;
    }
  };

  async function run(url: string, honeypot: string) {
    setPhase('running');
    setError(null);
    setReport(null);
    setHost('');
    measured.current = 0;
    setRows(initialRows(areas, copy.waiting));
    setStatus(copy.preparing);
    track('kollen_start', {});
    let res: Response;
    try {
      res = await fetch('/api/kollen', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/x-ndjson' },
        body: JSON.stringify({ url, company_site: honeypot, turnstileToken: await turnstileToken() }),
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
    void run(raw.trim(), honeypot);
  };

  const again = () => {
    setPhase('idle');
    setReport(null);
    setRows(initialRows(areas, copy.waiting));
    setStatus(copy.idleNote);
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.scrollIntoView({ block: 'center' });
      inputRef.current.focus({ preventScroll: true });
    }
  };

  return (
    <>
      <section id="top" className={a11y.hero} aria-labelledby="kollen-title">
        <div className={cx('wrap', a11y.grid)}>
          <div className={a11y.copy}>
            <p className="tag rise" style={vars({ i: 0 })}>
              {hero.tag}
            </p>
            <h1 id="kollen-title" className={cx(a11y.title, styles.title, 'rise')} style={vars({ i: 1 })}>
              {hero.title}
            </h1>
            <p className={cx(a11y.lede, 'rise')} style={vars({ i: 2 })}>
              {hero.lede}
            </p>
            <ul className={cx(a11y.proof, 'rise')} style={vars({ i: 3 })}>
              {hero.proof.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className={cx(styles.disclaimer, 'rise')} style={vars({ i: 4 })}>
              {disclaimer}
            </p>
          </div>

          <div id={copy.id} className={cx(a11y.card, 'rise')} style={vars({ i: 2 })}>
            <div className={a11y.cardHead}>
              <span className="tag">{copy.tag}</span>
              {host && <span className={a11y.host}>{host}</span>}
            </div>
            <h2 className={a11y.cardTitle}>{copy.title}</h2>
            <form onSubmit={onSubmit} noValidate className={a11y.form}>
              <div ref={boxRef} className={a11y.field}>
                <label htmlFor="kollen-url" className="sr-only">
                  {copy.inputLabel}
                </label>
                <input
                  ref={inputRef}
                  id="kollen-url"
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
                  aria-describedby="kollen-status"
                />
                <Button type="submit" arrow>
                  {copy.submit}
                </Button>
              </div>
              <div className={a11y.honeypot} aria-hidden="true">
                <label htmlFor="kollen-hp">Lämna tomt</label>
                <input id="kollen-hp" name="company_site" tabIndex={-1} autoComplete="off" />
              </div>
            </form>
            <ol className={a11y.rows} aria-label={copy.title}>
              {areas.map((a) => {
                const r = rows[a.id];
                const done = r.status !== 'wait' && r.status !== 'run';
                return (
                  <li key={a.id} data-status={done ? 'done' : r.status} data-band={done ? BAND[r.status] : undefined}>
                    <span className={a11y.dot} aria-hidden="true" />
                    <span className={a11y.rowName}>
                      {a.name}
                      <small>{a.since}</small>
                    </span>
                    <b className={cx(a11y.rowScore, done && styles.rowStatus)}>{r.note}</b>
                  </li>
                );
              })}
            </ol>
            <div id="kollen-status" className={a11y.status} aria-live="polite">
              {phase === 'error' && error ? <p className={a11y.error}>{error}</p> : <p>{status}</p>}
            </div>
          </div>
        </div>
      </section>

      {report && (
        <section ref={resultRef} className={a11y.result} aria-labelledby="kollen-result-title" tabIndex={-1}>
          <div className="wrap">
            <Result report={report} text={text} areas={areas} packages={packages} disclaimer={disclaimer} onAgain={again} />
          </div>
        </section>
      )}
    </>
  );
}

function initialRows(areas: KollenArea[], waiting: string): Record<string, Row> {
  return Object.fromEntries(areas.map((a) => [a.id, { status: 'wait', note: waiting }]));
}

function rowsFrom(r: KollenReport, areas: KollenArea[], waiting: string, labels: Record<string, string>): Record<string, Row> {
  const out = initialRows(areas, waiting);
  for (const a of r.areas) out[a.id] = { status: a.status, note: labels[a.status] };
  return out;
}

/* ---------- Result ---------- */

function Result({
  report: r,
  text,
  areas,
  packages,
  disclaimer,
  onAgain,
}: {
  report: KollenReport;
  text: Props['text'];
  areas: KollenArea[];
  packages: Record<string, KollenPackage>;
  disclaimer: string;
  onAgain: () => void;
}) {
  const selected = useSelection();
  const date = new Date(r.createdAt).toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' });
  const s = r.summary;

  return (
    <div className={a11y.report}>
      {r.devData && (
        <div className={a11y.dev} role="note">
          <strong>{text.devTitle}</strong> {text.devBody}
        </div>
      )}

      <div className={styles.summary}>
        <ol className={styles.lights} aria-hidden="true">
          {r.areas.map((a) => (
            <li key={a.id} data-status={a.status} />
          ))}
        </ol>
        <div className={styles.verdict}>
          <p className="tag">
            {text.tag} · {r.host} · {date}
            {r.platform ? ` · ${r.platform.name}` : ''}
          </p>
          <h2 id="kollen-result-title">{r.verdict}</h2>
          <p className={styles.counts}>
            <span data-status="fail">{format(text.counts.fail, { n: s.fail })}</span>
            <span data-status="warn">{format(text.counts.warn, { n: s.warn })}</span>
            <span data-status="pass">{format(text.counts.pass, { n: s.pass })}</span>
          </p>
        </div>
      </div>

      <ul className={styles.areas}>
        {r.areas.map((a) => {
          const meta = areas.find((x) => x.id === a.id)!;
          const pkg = packages[meta.package];
          const picked = selected.includes(pkg.id);
          const shown = a.findings.filter((f) => f.severity !== 'info' || a.status === 'pass').slice(0, 6);
          const notes = a.findings.filter((f) => f.severity === 'info' && !shown.includes(f));
          return (
            <li key={a.id} className={styles.area} data-status={a.status}>
              <details open={a.status === 'fail' || undefined}>
                <summary>
                  <i className={styles.light} data-status={a.status} aria-hidden="true" />
                  <span className={styles.areaMain}>
                    <span className={styles.areaName}>
                      {meta.name}
                      <span className={styles.statusChip} data-status={a.status}>
                        {text.status[a.status]}
                      </span>
                    </span>
                    <span className={styles.areaSummary}>{a.summary}</span>
                  </span>
                  <span className={styles.chev} aria-hidden="true" />
                </summary>
                <div className={styles.areaBody}>
                  <dl className={styles.facts}>
                    <div>
                      <dt>{text.law}</dt>
                      <dd>{meta.law}</dd>
                    </div>
                    <div>
                      <dt>{text.since}</dt>
                      <dd>{meta.since}</dd>
                    </div>
                    <div>
                      <dt>{text.authority}</dt>
                      <dd>{meta.authority}</dd>
                    </div>
                    <div>
                      <dt>Metod</dt>
                      <dd>{text.method[a.method]}</dd>
                    </div>
                  </dl>
                  <ul className={styles.findings}>
                    {shown.map((f, i) => (
                      <li key={i} data-severity={f.severity}>
                        <i aria-hidden="true" />
                        <div>
                          <p className={styles.fTitle}>
                            {f.title}
                            {f.page && text.page[f.page] ? <span className="mono"> · {text.page[f.page]}</span> : null}
                          </p>
                          {f.detail && <p className={styles.fDetail}>{f.detail}</p>}
                          {f.evidence && <code>{f.evidence}</code>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {notes.length > 0 && (
                    <ul className={styles.notes}>
                      {notes.map((f, i) => (
                        <li key={i}>
                          <strong>{f.title}.</strong> {f.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className={styles.areaActions}>
                    {a.status !== 'pass' && (
                      <button
                        type="button"
                        className={styles.add}
                        aria-pressed={picked}
                        onClick={() => {
                          toggleSelection(pkg.id);
                          track('kollen_package', { package: pkg.id, on: !picked });
                        }}
                      >
                        <span aria-hidden="true">{picked ? '✓' : '+'}</span>
                        {picked ? text.added : text.add}: {pkg.name} · {pkg.price}
                      </button>
                    )}
                    {a.id === 'tillganglighet' && a.a11yId && (
                      <a className="link" href={`/tillganglighet/?r=${a.a11yId}`}>
                        {text.a11yFull}
                      </a>
                    )}
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      <div className={styles.cta}>
        <div>
          <h3>{s.fail ? text.ctaTitle : text.ctaTitleClean}</h3>
          <p>{text.ctaBody}</p>
          {selected.length > 0 && (
            <p className={cx(styles.selected, 'mono')}>{format(text.selected, { n: selected.length, total: totalFor(selected, packages) })}</p>
          )}
        </div>
        <div className={styles.ctaActions}>
          <Button href="#bestall" arrow onClick={() => track('kollen_cta', { selected: selected.length })}>
            {text.ctaOrder}
          </Button>
          {!selected.includes('bevakning') && (
            <Button href="#bestall" variant="ghost" onClick={() => toggleSelection('bevakning', true)}>
              {text.ctaWatch}
            </Button>
          )}
        </div>
      </div>

      <p className={styles.small}>
        {disclaimer} {text.saved}{' '}
        <a className="link" href={`/e-handelskollen/?r=${r.id}`}>
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
