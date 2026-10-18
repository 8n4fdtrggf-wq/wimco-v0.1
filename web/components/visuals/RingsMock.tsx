'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { RingItem, Tone } from '@/content/types';
import { vars } from '@/lib/css';
import { setStyle, useSpring } from '@/lib/motion';
import styles from './Visuals.module.css';

const CIRCUMFERENCE = 2 * Math.PI * 40;

/** Lighthouse's own colour bands. */
const toneFor = (v: number): Tone => (v >= 90 ? 'good' : v >= 50 ? 'avg' : 'poor');

export interface RingsHandle {
  /** 0 = before optimisation, 1 = after. */
  setProgress: (t: number) => void;
}

interface Props {
  items: RingItem[];
  bands: { label: string; tone: Tone }[];
  active: boolean;
  /** scroll: the parent scrubs progress. spring: progress animates when `active` changes. */
  driven: 'scroll' | 'spring';
}

/**
 * Four Lighthouse rings. Numbers, arcs and tones are written imperatively so scrubbing never
 * re-renders React; the initial render shows the "before" values.
 */
export const RingsMock = forwardRef<RingsHandle, Props>(function RingsMock({ items, bands, active, driven }, ref) {
  const els = useRef(
    items.map(() => ({
      root: null as HTMLDivElement | null,
      arc: null as SVGCircleElement | null,
      num: null as HTMLSpanElement | null,
      last: -1,
      tone: '' as Tone | '',
    })),
  );

  const setProgress = useCallback(
    (t: number) => {
      items.forEach((item, i) => {
        const e = els.current[i];
        if (!e) return;
        const v = Math.round(item.from + (item.to - item.from) * t);
        if (v === e.last) return;
        e.last = v;
        if (e.num) e.num.textContent = String(v);
        setStyle(e.arc, 'stroke-dashoffset', (CIRCUMFERENCE * (1 - v / 100)).toFixed(1));
        const tone = toneFor(v);
        if (tone !== e.tone) {
          e.tone = tone;
          e.root?.setAttribute('data-tone', tone);
        }
      });
    },
    [items],
  );

  useImperativeHandle(ref, () => ({ setProgress }), [setProgress]);

  const spring = useSpring(0, { response: 1.1, eps: 0.0005 }, setProgress);
  useEffect(() => {
    if (driven === 'spring') spring.to(active ? 1 : 0);
  }, [active, driven, spring]);

  return (
    <div className={styles.rings} data-active={active ? '' : undefined}>
      <div className={styles.ringGrid}>
        {items.map((item, i) => (
          <div
            key={item.label}
            className={styles.ring}
            data-tone={toneFor(item.from)}
            ref={(el) => {
              els.current[i].root = el;
            }}
          >
            <div className={styles.ringDial}>
              <svg viewBox="0 0 100 100">
                <circle className={styles.ringTrack} cx="50" cy="50" r="40" />
                <circle
                  className={styles.ringArc}
                  cx="50"
                  cy="50"
                  r="40"
                  strokeDasharray={CIRCUMFERENCE.toFixed(2)}
                  style={{ strokeDashoffset: (CIRCUMFERENCE * (1 - item.from / 100)).toFixed(1) }}
                  ref={(el) => {
                    els.current[i].arc = el;
                  }}
                />
              </svg>
              <span
                className={styles.ringNum}
                ref={(el) => {
                  els.current[i].num = el;
                }}
              >
                {item.from}
              </span>
            </div>
            <span className={styles.ringLabel}>{item.label}</span>
          </div>
        ))}
      </div>
      <span className={styles.legend}>
        {bands.map((b) => (
          <span key={b.label} style={vars({ k: `var(--${b.tone})` })}>
            {b.label}
          </span>
        ))}
      </span>
    </div>
  );
});
