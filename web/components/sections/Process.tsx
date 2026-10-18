'use client';

import { useRef } from 'react';
import type { ProcessContent } from '@/content/types';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { cx } from '@/lib/css';
import { enterProgress, setFlag, setStyle, useScrollFrame } from '@/lib/motion';
import styles from './Process.module.css';

/** Four stations on one line; the line fills with scroll and each station lights as it's reached. */
export function Process({ content }: { content: ProcessContent }) {
  const listRef = useRef<HTMLOListElement>(null);
  const fillRef = useRef<HTMLElement>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const rect = useRef<DOMRect | null>(null);
  const last = content.steps.length - 1;

  useScrollFrame(
    () => {
      rect.current = listRef.current?.getBoundingClientRect() ?? null;
    },
    (ctx) => {
      if (!rect.current) return;
      const p = enterProgress(rect.current, ctx.vh, 0.85, 0.45);
      setStyle(fillRef.current, 'transform', `scaleX(${p.toFixed(3)})`);
      stepRefs.current.forEach((li, i) => setFlag(li, 'data-on', p > 0 && p >= i / last - 0.001));
    },
  );

  return (
    <section id="arbetssatt" className={cx('wrap', styles.process)}>
      <SectionHeading eyebrow={content.eyebrow} title={content.title} segment="h" />
      <div className={styles.line}>
        <span className={styles.track} aria-hidden="true">
          <i ref={fillRef} />
        </span>
        <ol ref={listRef} className={styles.steps}>
          {content.steps.map((s, i) => (
            <li
              key={s.title}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
            >
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.label}>{s.label}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
