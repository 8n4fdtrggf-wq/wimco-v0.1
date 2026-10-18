'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LineId, LineInfo, ServicesContent } from '@/content/types';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { LineBadge } from '@/components/ui/LineBadge';
import { StepVisual } from '@/components/visuals/StepVisual';
import type { RingsHandle } from '@/components/visuals/RingsMock';
import { LINE_ORDER, lineColor } from '@/lib/lines';
import { NAV_HEIGHT, cx, vars } from '@/lib/css';
import {
  QUERIES,
  clamp,
  easeOutCubic,
  pinProgress,
  setStyle,
  useMediaQuery,
  useReducedMotion,
  useScrollFrame,
} from '@/lib/motion';
import styles from './Services.module.css';

type Pos = 'before' | 'active' | 'after';

/**
 * Four lines, one state at a time.
 * Pinned layout: the section is tall and its inner stage is sticky. Scroll position chooses the
 * step (state changes are time-based transitions, so they never jitter); progress *within* a step
 * fills that step's bar and, on the last line, scrubs the Lighthouse scores.
 * Unpinned layout (phones): the same DOM becomes a native scroll-snap carousel; a card's visual
 * plays when it settles in the centre.
 */
export function Services({ content, lines }: { content: ServicesContent; lines: Record<LineId, LineInfo> }) {
  const pinned = useMediaQuery(QUERIES.pin, true);
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);

  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const barRefs = useRef<(HTMLElement | null)[]>([]);
  const ringsRef = useRef<RingsHandle>(null);
  const rect = useRef<DOMRect | null>(null);

  const go = useCallback((i: number) => {
    if (stepRef.current === i) return;
    stepRef.current = i;
    setStep(i);
  }, []);

  // Pinned: scroll drives the step.
  useScrollFrame(
    () => {
      rect.current = pinRef.current?.getBoundingClientRect() ?? null;
    },
    (ctx) => {
      const r = rect.current;
      if (!r) return;
      const count = content.steps.length;
      const p = pinProgress(r, ctx.vh - NAV_HEIGHT);
      const s = Math.min(count - 1, Math.floor(p * count));
      const local = clamp(p * count - s);
      go(s);
      barRefs.current.forEach((bar, i) =>
        setStyle(bar, 'transform', `scaleX(${(i < s ? 1 : i === s ? local : 0).toFixed(3)})`),
      );
      const ringsStep = content.steps.findIndex((st) => st.visual === 'rings');
      ringsRef.current?.setProgress(s === ringsStep ? easeOutCubic(clamp(local / 0.8)) : s > ringsStep ? 1 : 0);
    },
    pinned,
  );

  // Carousel: the card in the centre is the active step.
  useEffect(() => {
    if (pinned) return;
    const root = trackRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = cardRefs.current.indexOf(e.target as HTMLElement);
          if (i >= 0) go(i);
        }),
      { root, threshold: 0.6 },
    );
    cardRefs.current.forEach((c) => c && io.observe(c));
    return () => io.disconnect();
  }, [pinned, go]);

  const jumpTo = (i: number) => {
    const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
    if (pinned) {
      const el = pinRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - (window.innerHeight - NAV_HEIGHT);
      window.scrollTo({ top: r.top + window.scrollY + span * ((i + 0.12) / content.steps.length), behavior });
      return;
    }
    const card = cardRefs.current[i];
    const track = trackRef.current;
    if (card && track) track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.clientWidth) / 2, behavior });
  };

  const pos = (i: number): Pos => (i < step ? 'before' : i === step ? 'active' : 'after');
  const current = content.steps[step];

  return (
    <section id="tjanster" className={styles.section} aria-label={content.label}>
      <div ref={pinRef} className={styles.pin}>
        <div className={styles.sticky}>
          <div className={`wrap ${styles.grid}`}>
            <div className={styles.head}>
              <Eyebrow lines={LINE_ORDER} className={styles.eyebrow}>
                {content.eyebrow}
              </Eyebrow>
              <h2 className={cx('title', styles.title)}>{content.title}</h2>
            </div>

            <ol className={styles.stepper} aria-label={content.stepperLabel}>
              {content.steps.map((s, i) => (
                <li key={s.line}>
                  <button
                    type="button"
                    className={cx(styles.stepButton, i < step && styles.done)}
                    aria-current={i === step ? 'step' : undefined}
                    style={vars({ c: lineColor(s.line) })}
                    onClick={() => jumpTo(i)}
                  >
                    <span className={styles.stepBadge} aria-hidden="true">
                      {lines[s.line].letter}
                    </span>
                    {lines[s.line].name}
                    <span className={styles.bar} aria-hidden="true">
                      <i
                        ref={(el) => {
                          barRefs.current[i] = el;
                        }}
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <div ref={trackRef} className={styles.steps}>
              <div className={styles.frame} aria-hidden="true" style={vars({ c: lineColor(current.line) })}>
                <div className={styles.frameBar}>
                  <span className={styles.frameDots}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className={styles.frameUrl}>
                    {content.urlPrefix}
                    {lines[current.line].letter.toLowerCase()}
                  </span>
                </div>
              </div>

              {content.steps.map((s, i) => (
                <article
                  key={s.line}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  className={styles.step}
                  data-pos={pos(i)}
                  style={vars({ c: lineColor(s.line) })}
                >
                  <div className={styles.copy}>
                    <p className={styles.tag}>
                      <LineBadge line={s.line} size="lg" className={styles.tagBadge} />
                      {content.lineLabel} {lines[s.line].letter} · {lines[s.line].name}
                    </p>
                    <h3 className={styles.stepTitle}>{s.title}</h3>
                    <p className={styles.body}>{s.body}</p>
                    <ul className={styles.stops}>
                      {s.stops.map((stop) => (
                        <li key={stop}>{stop}</li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.vis} aria-hidden="true">
                    <StepVisual
                      kind={s.visual}
                      active={i === step}
                      content={content}
                      ringsRef={ringsRef}
                      driven={pinned ? 'scroll' : 'spring'}
                    />
                    <span className={styles.caption}>{s.caption}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className={styles.dotNav} role="group" aria-label={content.stepperLabel}>
              {content.steps.map((s, i) => (
                <button
                  key={s.line}
                  type="button"
                  aria-label={lines[s.line].name}
                  aria-current={i === step ? 'true' : undefined}
                  style={vars({ c: lineColor(s.line) })}
                  onClick={() => jumpTo(i)}
                >
                  {lines[s.line].letter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
