'use client';

import { useMemo, useRef } from 'react';
import type { LineId, ManifestoContent } from '@/content/types';
import { lineColor } from '@/lib/lines';
import { NAV_HEIGHT, vars } from '@/lib/css';
import { clamp, pinProgress, setFlag, setStyle, useScrollFrame } from '@/lib/motion';
import styles from './Manifesto.module.css';

type Token = { space: string } | { word: string; line?: LineId; index: number };

/**
 * A pinned sentence whose emphasis follows the reader: each word darkens as you scroll past it,
 * and the four service words take on their line colour when reached. Opacity and colour only.
 */
export function Manifesto({ content }: { content: ManifestoContent }) {
  const tokens = useMemo(() => {
    const out: Token[] = [];
    let index = 0;
    content.segments.forEach((seg) => {
      if (seg.line) {
        out.push({ word: seg.text, line: seg.line, index: index++ });
        return;
      }
      seg.text
        .split(/(\s+)/)
        .filter(Boolean)
        .forEach((part) => out.push(/^\s+$/.test(part) ? { space: part } : { word: part, index: index++ }));
    });
    return { list: out, count: index };
  }, [content.segments]);

  const sectionRef = useRef<HTMLElement>(null);
  const words = useRef<(HTMLSpanElement | null)[]>([]);
  const rect = useRef<DOMRect | null>(null);

  useScrollFrame(
    () => {
      rect.current = sectionRef.current?.getBoundingClientRect() ?? null;
    },
    (ctx) => {
      const r = rect.current;
      if (!r) return;
      const p = pinProgress(r, ctx.vh - NAV_HEIGHT);
      const reached = (p / 0.82) * (tokens.count + 1);
      words.current.forEach((el, i) => {
        if (!el) return;
        const a = Math.round(clamp(reached - i) * 50) / 50;
        setStyle(el, 'opacity', (0.16 + 0.84 * a).toFixed(2));
        if (el.dataset.key !== undefined) setFlag(el, 'data-lit', a >= 1);
      });
    },
  );

  return (
    <section ref={sectionRef} id="manifest" className={styles.manifest} aria-label={content.label}>
      <div className={styles.sticky}>
        <div className="wrap">
          <p className={styles.text}>
            {tokens.list.map((t, i) =>
              'space' in t ? (
                t.space
              ) : (
                <span
                  key={i}
                  ref={(el) => {
                    words.current[t.index] = el;
                  }}
                  className={t.line ? styles.key : undefined}
                  data-key={t.line ? '' : undefined}
                  style={t.line ? vars({ c: lineColor(t.line) }) : undefined}
                >
                  {t.word}
                </span>
              ),
            )}
          </p>
          <p className={styles.byline}>
            <span className={styles.avatar} aria-hidden="true">
              {content.byline.initial}
            </span>
            {content.byline.text}
          </p>
        </div>
      </div>
    </section>
  );
}
