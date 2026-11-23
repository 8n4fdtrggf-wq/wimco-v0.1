'use client';

import { useEffect, useState } from 'react';
import type { OrbitCard as Card } from '@/content/types';
import { cx } from '@/lib/css';
import styles from './OrbitCards.module.css';

/**
 * The small live UIs that float around a reference. Each one walks through a few phases on a
 * loop while `live` (on screen, motion allowed), freezes where it is when `live` drops, and shows
 * its finished state when `still` (reduced motion). State changes are CSS transitions, so a
 * phase change mid-transition retargets instead of jumping.
 */
interface Props {
  card: Card;
  live: boolean;
  still: boolean;
}

/** Cycles 0…durations.length-1, holding each phase for its duration in ms. */
function usePhase(durations: number[], live: boolean, still: boolean) {
  const last = durations.length - 1;
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!live || still) return;
    const t = window.setTimeout(() => setPhase((p) => (p + 1) % durations.length), durations[phase]);
    return () => window.clearTimeout(t);
  }, [phase, live, still, durations]);
  return still ? last : phase;
}

/** Types `text` out while `on`, a character every `speed` ms; shows it whole when `still`. */
function useTyped(text: string, on: boolean, still: boolean, speed = 55) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (still) return;
    if (!on) {
      setN(0);
      return;
    }
    if (n >= text.length) return;
    const t = window.setTimeout(() => setN((v) => v + 1), speed);
    return () => window.clearTimeout(t);
  }, [n, on, still, text, speed]);
  return still ? text : text.slice(0, n);
}

// Phase timings live outside the components so the effect dependencies stay stable.
const T = {
  checklist: [700, 700, 700, 700, 700, 2600],
  search: [600, 1900, 3600],
  switches: [900, 900, 900, 2600],
  device: [2600, 2600],
  ai: [700, 1600, 3200, 2200],
  form: [800, 900, 900, 600, 2800],
  tabs: [2400, 2400, 2400],
  load: [500, 1700, 2600],
  push: [900, 1400, 1400, 2600],
  signature: [600, 1600, 2600],
};

export function OrbitCard({ card, live, still }: Props) {
  return (
    <div className={styles.card}>
      <p className={styles.title}>{card.title}</p>
      <Body card={card} live={live} still={still} />
    </div>
  );
}

function Body({ card, live, still }: Props) {
  switch (card.kind) {
    case 'checklist':
      return <Checklist card={card} live={live} still={still} />;
    case 'search':
      return <Search card={card} live={live} still={still} />;
    case 'switches':
      return <Switches card={card} live={live} still={still} />;
    case 'device':
      return <Device card={card} live={live} still={still} />;
    case 'ai':
      return <Ai card={card} live={live} still={still} />;
    case 'form':
      return <Form card={card} live={live} still={still} />;
    case 'tabs':
      return <Tabs card={card} live={live} still={still} />;
    case 'load':
      return <Load card={card} live={live} still={still} />;
    case 'push':
      return <Push card={card} live={live} still={still} />;
    case 'signature':
      return <Signature card={card} live={live} still={still} />;
  }
}

type Of<K extends Card['kind']> = { card: Extract<Card, { kind: K }>; live: boolean; still: boolean };

function Checklist({ card, live, still }: Of<'checklist'>) {
  const phase = usePhase(T.checklist, live, still);
  return (
    <ul className={styles.checks}>
      {card.items.map((item, i) => (
        <li key={item} data-on={i < phase || phase === T.checklist.length - 1 || undefined}>
          <i aria-hidden="true">
            <svg viewBox="0 0 12 12" width="10" height="10">
              <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </i>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Search({ card, live, still }: Of<'search'>) {
  const phase = usePhase(T.search, live, still);
  const typed = useTyped(card.query, phase >= 1, still);
  return (
    <div className={styles.search}>
      <div className={styles.field}>
        <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span>{typed}</span>
        <b className={styles.caret} data-on={(phase === 1 && !still) || undefined} />
      </div>
      <div className={styles.result} data-on={phase === 2 || undefined}>
        <small className="mono">{card.resultUrl}</small>
        <b>{card.resultTitle}</b>
        <span>{card.resultText}</span>
      </div>
    </div>
  );
}

function Switches({ card, live, still }: Of<'switches'>) {
  const phase = usePhase(T.switches, live, still);
  return (
    <ul className={styles.switches}>
      {card.items.map((item, i) => (
        <li key={item} data-on={i < phase || phase === T.switches.length - 1 || undefined}>
          <i aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Device({ card, live, still }: Of<'device'>) {
  // Still shows the phone: the claim on the card is "built for mobile".
  const phase = usePhase(T.device, live, still);
  return (
    <div className={styles.device} data-mobile={phase === 1 || undefined}>
      <div className={styles.seg}>
        {card.options.map((o, i) => (
          <span key={o} data-on={i === phase || undefined}>
            {o}
          </span>
        ))}
      </div>
      <div className={styles.frame} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function Ai({ card, live, still }: Of<'ai'>) {
  const phase = usePhase(T.ai, live, still);
  const answer = useTyped(card.answer, phase >= 2, still, 28);
  return (
    <div className={styles.ai}>
      <p className={styles.q} data-on={phase >= 1 || undefined}>
        {card.question}
      </p>
      <p className={styles.a} data-on={phase >= 2 || undefined}>
        {answer}
        <small className="mono" data-on={phase === 3 || undefined}>
          {card.source}
        </small>
      </p>
    </div>
  );
}

function Form({ card, live, still }: Of<'form'>) {
  // 0 empty · 1–2 fields fill · 3 button pressed · 4 toast
  const phase = usePhase(T.form, live, still);
  const filled = still ? card.fields.length : Math.min(phase + 1, card.fields.length);
  return (
    <div className={styles.form}>
      {card.fields.map((f, i) => (
        <span key={f} className={styles.input} data-on={(phase > 0 && i < filled) || undefined}>
          {f}
        </span>
      ))}
      <span className={styles.submit} data-press={phase === 3 || undefined}>
        {card.submit}
      </span>
      <span className={styles.toast} data-on={phase === 4 || undefined}>
        {card.toast}
      </span>
    </div>
  );
}

function Tabs({ card, live, still }: Of<'tabs'>) {
  const phase = usePhase(T.tabs, live, still);
  const on = still ? 0 : phase;
  return (
    <div className={styles.tabs}>
      <div className={styles.seg}>
        {card.tabs.map((t, i) => (
          <span key={t.label} data-on={i === on || undefined}>
            {t.label}
          </span>
        ))}
      </div>
      <div className={styles.panes}>
        {card.tabs.map((t, i) => (
          <p key={t.label} data-on={i === on || undefined}>
            {t.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function Load({ card, live, still }: Of<'load'>) {
  const phase = usePhase(T.load, live, still);
  return (
    <div className={styles.load}>
      <p>
        <span>{card.label}</span>
        <b className={cx(styles.done, 'mono')} data-on={phase === 2 || undefined}>
          {card.done}
        </b>
      </p>
      <span className={styles.track}>
        <i data-phase={phase} />
      </span>
    </div>
  );
}

function Push({ card, live, still }: Of<'push'>) {
  // Notifications arrive one per phase; the newest sits on top, older ones step back.
  const phase = usePhase(T.push, live, still);
  const shown = still ? card.items.length : Math.min(phase, card.items.length);
  return (
    <ul className={styles.push}>
      {card.items.map((text, i) => (
        <li key={text} data-on={i < shown || undefined} data-depth={Math.max(0, shown - 1 - i)}>
          <i aria-hidden="true">{card.app.slice(0, 1)}</i>
          <span>
            <b>{card.app}</b>
            {text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Signature({ card, live, still }: Of<'signature'>) {
  // 0 empty · 1 the name is written · 2 sent
  const phase = usePhase(T.signature, live, still);
  return (
    <div className={styles.sign}>
      <div className={styles.pad}>
        <svg viewBox="0 0 120 40" aria-hidden="true">
          <path
            data-on={phase >= 1 || undefined}
            pathLength={1}
            d="M6 28c6-14 10-20 12-16s-6 18-2 18 8-16 12-16-2 14 3 14 6-10 9-10 0 9 4 9 6-8 9-8 1 7 5 7 9-6 14-6 8 4 14 2 12-4 20-4"
          />
        </svg>
        <small>{card.name}</small>
      </div>
      <span className={styles.sent} data-on={phase === 2 || undefined}>
        {card.done}
      </span>
    </div>
  );
}
