'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AnalyseContent } from '@/content/types';
import { Button } from '@/components/ui/Button';
import { cx, format } from '@/lib/css';
import { shake } from '@/lib/motion';
import { rememberOwner, track, turnstileToken } from '@/lib/site';
import styles from './AnalysisForm.module.css';

type StepStatus = 'pending' | 'running' | 'done' | 'limited';
interface Step {
  id: string;
  label: string;
  status: StepStatus;
  note: string;
}
interface Result {
  id: string;
  host: string;
  total: number;
  previous: number | null;
}
type Phase = 'idle' | 'running' | 'done' | 'error';

/** Events streamed as NDJSON by POST /api/analyze (lib/analysis/analyze.js). */
type AnalysisEvent =
  | { type: 'accepted'; host: string; steps: { id: string; label: string }[] }
  | { type: 'step'; id: string; label: string; status: 'running' | 'done' | 'limited'; cached?: boolean; summary?: string[] }
  | { type: 'result'; report: { id: string; host: string; score: { total: number }; previous?: { total: number } }; ownerToken?: string; cached?: boolean }
  | { type: 'error'; code: string; message: string };

const looksLikeUrl = (raw: string) => {
  const s = raw.trim();
  if (!s) return false;
  try {
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).hostname.includes('.');
  } catch {
    return false;
  }
};

/**
 * Wimco Score, live. Posts the address to /api/analyze and renders the streamed steps as stations
 * that light up in order, then the score with a link to the full report at /r/:id.
 * Same contract and analytics events as the previous start page (analysis_start / _complete /
 * _error / _cancel), the same Turnstile check, and the same ?url=…&prev=… prefill from reminder mails.
 */
export function AnalysisForm({ content }: { content: AnalyseContent }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const id = `${content.id}-url`;

  // Prefilled from a reminder e-mail or a report: /?url=…&prev=…#analys
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('url');
    if (url && inputRef.current) inputRef.current.value = url;
    const prev = params.get('prev');
    if (url && prev && /^[a-z0-9]{8,20}$/.test(prev)) setPrevId(prev);
    return () => controller.current?.abort();
  }, []);

  useEffect(() => {
    if (phase === 'done') resultRef.current?.focus();
  }, [phase]);

  const fail = (code: string, message?: string) => {
    setPhase('error');
    setError(message || content.unexpectedEnd);
    track('analysis_error', { code });
  };

  const handle = (ev: AnalysisEvent): boolean => {
    switch (ev.type) {
      case 'accepted':
        setTitle(format(content.running, { host: ev.host }));
        setSteps(ev.steps.map((s) => ({ id: s.id, label: s.label, status: 'pending', note: '' })));
        return false;
      case 'step':
        setSteps((list) => {
          const note =
            ev.status === 'running' ? content.stepRunning : ev.cached ? content.stepCached : (ev.summary ?? []).slice(0, 2).join(' · ');
          const known = list.some((s) => s.id === ev.id);
          const next = { id: ev.id, label: ev.label, status: ev.status, note } as Step;
          return known ? list.map((s) => (s.id === ev.id ? next : s)) : [...list, next];
        });
        return false;
      case 'result':
        if (ev.ownerToken) rememberOwner(ev.report.id, ev.ownerToken);
        setResult({
          id: ev.report.id,
          host: ev.report.host,
          total: ev.report.score.total,
          previous: ev.report.previous?.total ?? null,
        });
        setPhase('done');
        track('analysis_complete', { score_band: Math.floor((ev.report.score.total ?? 0) / 10) * 10, cached: !!ev.cached });
        return true;
      case 'error':
        fail(ev.code, ev.message);
        return true;
    }
  };

  const start = async (raw: string, honeypot: string) => {
    setPhase('running');
    setError(null);
    setResult(null);
    setSteps([]);
    setTitle(content.preparing);
    track('analysis_start', {});

    const token = await turnstileToken();
    const ctrl = new AbortController();
    controller.current = ctrl;

    let res: Response;
    try {
      res = await fetch('/api/analyze', {
        signal: ctrl.signal,
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/x-ndjson' },
        body: JSON.stringify({ url: raw, prev: prevId, turnstileToken: token, company_site: honeypot }),
      });
    } catch {
      if (ctrl.signal.aborted) return;
      fail('failed', content.networkError);
      return;
    }

    if (!res.ok || !(res.headers.get('content-type') || '').includes('ndjson') || !res.body) {
      const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
      fail(data.code || 'failed', data.message);
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
            if (handle(JSON.parse(line) as AnalysisEvent)) finished = true;
          } catch {
            /* skip a malformed line */
          }
        }
      }
    } catch {
      if (ctrl.signal.aborted) return;
      if (!finished) fail('failed', content.streamError);
      return;
    }
    if (!finished) fail('failed', content.unexpectedEnd);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (phase === 'running') return;
    const raw = inputRef.current?.value ?? '';
    if (!looksLikeUrl(raw)) {
      setPhase('error');
      setError(content.error);
      inputRef.current?.focus();
      shake(boxRef.current);
      return;
    }
    const honeypot = (e.currentTarget.elements.namedItem('company_site') as HTMLInputElement | null)?.value ?? '';
    void start(raw.trim(), honeypot);
  };

  const cancel = () => {
    controller.current?.abort();
    setPhase('error');
    setError(content.cancelled);
    track('analysis_cancel', {});
  };

  const reset = () => {
    setPhase('idle');
    setResult(null);
    setSteps([]);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };

  const diff = result && result.previous !== null ? result.total - result.previous : null;

  return (
    <div className={styles.analysis} data-phase={phase}>
      <form onSubmit={onSubmit} noValidate>
        <div ref={boxRef} className={styles.field}>
          <label htmlFor={id} className="sr-only">
            {content.inputLabel}
          </label>
          <input
            ref={inputRef}
            id={id}
            name="url"
            type="url"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder={content.placeholder}
            disabled={phase === 'running'}
            aria-invalid={phase === 'error' && error === content.error ? true : undefined}
            aria-describedby={`${id}-status`}
          />
          {phase === 'running' ? (
            <Button variant="ghost" onClick={cancel}>
              {content.cancel}
            </Button>
          ) : (
            <Button type="submit" arrow>
              {content.submit}
            </Button>
          )}
        </div>
        {/* Honeypot for simple bots, same field name the API checks. */}
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor={`${id}-company`}>Företagets webbplats</label>
          <input id={`${id}-company`} name="company_site" tabIndex={-1} autoComplete="off" />
        </div>
        {prevId && phase === 'idle' && <p className={styles.hint}>{content.compareHint}</p>}
      </form>

      <div id={`${id}-status`} className={styles.status} aria-live="polite">
        {phase === 'error' && error && <p className={styles.error}>{error}</p>}

        {phase === 'running' && (
          <div className={styles.progress}>
            <p className={styles.progressTitle}>{title}</p>
            {steps.length > 0 && (
              <ol className={styles.steps}>
                {steps.map((s) => (
                  <li key={s.id} data-status={s.status}>
                    <span className={styles.stepDot} aria-hidden="true" />
                    <span className={styles.stepLabel}>{s.label}</span>
                    {s.note && <span className={styles.stepNote}>{s.note}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {phase === 'done' && result && (
          <div ref={resultRef} className={styles.result} tabIndex={-1}>
            <div className={styles.score}>
              <span className={styles.scoreLabel}>{content.resultLabel}</span>
              <b>{result.total}</b>
              <span className={styles.scoreOf}>/ 100 · {result.host}</span>
            </div>
            {diff !== null && (
              <p className={styles.previous}>
                {format(content.previous, { prev: result.previous ?? 0, now: result.total, diff: `${diff >= 0 ? '+' : ''}${diff}` })}
              </p>
            )}
            <div className={cx(styles.actions)}>
              <Button href={`/r/${result.id}`} arrow>
                {content.openReport}
              </Button>
              <Button variant="ghost" onClick={reset}>
                {content.again}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
