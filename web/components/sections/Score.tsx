'use client';

import { useRef, useState } from 'react';
import type { ScoreContent, ScoreWeight } from '@/content/types';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { lineColor, lineTint } from '@/lib/lines';
import { cx, vars } from '@/lib/css';
import { clamp, enterProgress, setStyle, useScrollFrame } from '@/lib/motion';
import styles from './Score.module.css';

const colorOf = (w: ScoreWeight) => (w.muted ? lineTint(w.line) : lineColor(w.line));

/**
 * Six weighted stations. The weighting bar draws in segment by segment as it arrives;
 * hovering, focusing or tapping a card isolates its share of the bar (and the reverse reading:
 * the bar explains the cards).
 */
export function Score({ content }: { content: ScoreContent }) {
  const [focus, setFocus] = useState<number | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const segRefs = useRef<(HTMLElement | null)[]>([]);
  const rect = useRef<DOMRect | null>(null);

  useScrollFrame(
    () => {
      rect.current = stackRef.current?.getBoundingClientRect() ?? null;
    },
    (ctx) => {
      if (!rect.current) return;
      const p = enterProgress(rect.current, ctx.vh, 0.9, 0.45);
      segRefs.current.forEach((seg, i) => setStyle(seg, 'transform', `scaleX(${clamp((p - i / 9) * 2.4).toFixed(3)})`));
    },
  );

  const label = content.weights.map((w) => `${w.name} ${w.pct} %`).join(', ');

  return (
    <section id="score" className={cx('wrap', styles.score)} data-focus={focus ?? undefined}>
      <SectionHeading eyebrow={content.eyebrow} title={content.title} lede={content.lede} segment="w" />

      <div ref={stackRef} className={styles.stack} role="img" aria-label={`${content.stackLabel}: ${label}`}>
        {content.weights.map((w, i) => (
          <i
            key={w.name}
            ref={(el) => {
              segRefs.current[i] = el;
            }}
            data-on={focus === i ? '' : undefined}
            style={vars({ c: colorOf(w) }, { flex: w.pct })}
          />
        ))}
      </div>

      <Reveal as="ul" variant="stagger" className={styles.weights}>
        {content.weights.map((w, i) => (
          <li
            key={w.name}
            tabIndex={0}
            data-on={focus === i ? '' : undefined}
            style={vars({ i, c: colorOf(w) })}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setFocus(i)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setFocus(null)}
            onFocus={() => setFocus(i)}
            onBlur={() => setFocus(null)}
            onPointerUp={(e) => e.pointerType !== 'mouse' && setFocus((f) => (f === i ? null : i))}
          >
            <span className={styles.pct}>{w.pct} %</span>
            <strong>{w.name}</strong>
            <p>{w.body}</p>
            <span className={styles.source}>{w.source}</span>
          </li>
        ))}
      </Reveal>

      <div className={styles.actions}>
        <Button href={content.primary.href} arrow>
          {content.primary.label}
        </Button>
        <Button href={content.secondary.href} external={content.secondary.external} variant="ghost">
          {content.secondary.label}
        </Button>
      </div>
    </section>
  );
}
