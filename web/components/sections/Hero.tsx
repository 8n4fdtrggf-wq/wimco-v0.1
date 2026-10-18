'use client';

import { Fragment, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { HeroContent, LineId } from '@/content/types';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { LineMap } from '@/components/interactive/LineMap';
import { lineColor } from '@/lib/lines';
import { NAV_HEIGHT, cx, vars } from '@/lib/css';
import {
  QUERIES,
  clamp,
  clearStyle,
  easeOutCubic,
  pinProgress,
  setStyle,
  useMediaQuery,
  useReducedMotion,
  useScrollFrame,
} from '@/lib/motion';
import styles from './Hero.module.css';

/**
 * Hero. Two jobs:
 * 1. Line ↔ word linking: pointing at a line on the map emphasises its word in the headline, and back.
 * 2. On pinned layouts the hero stays put while the copy lifts away and the map moves toward its
 *    destination station, handing over to the manifesto. Small, slow, scroll-scrubbed.
 */
export function Hero({ content }: { content: HeroContent }) {
  const [focus, setFocus] = useState<LineId | null>(null);
  const fine = useMediaQuery(QUERIES.finePointer, true);
  const pinned = useMediaQuery(QUERIES.pin, true);
  const reduce = useReducedMotion();
  const scrub = pinned && !reduce;

  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLAnchorElement>(null);
  const rect = useRef<DOMRect | null>(null);

  useScrollFrame(
    () => {
      rect.current = sectionRef.current?.getBoundingClientRect() ?? null;
    },
    (ctx) => {
      const r = rect.current;
      if (!r) return;
      const p = pinProgress(r, ctx.vh - NAV_HEIGHT);
      const fade = clamp((p - 0.35) / 0.65);
      setStyle(copyRef.current, 'transform', `translate3d(0, ${(-p * 56).toFixed(1)}px, 0)`);
      setStyle(copyRef.current, 'opacity', (1 - fade * 0.88).toFixed(3));
      setStyle(
        mapRef.current,
        'transform',
        `translate3d(0, ${(-p * 30).toFixed(1)}px, 0) scale(${(1 + easeOutCubic(p) * 0.14).toFixed(4)})`,
      );
      setStyle(cueRef.current, 'opacity', (1 - clamp(p * 4)).toFixed(3));
    },
    scrub,
  );

  useEffect(() => {
    if (scrub) return;
    [copyRef, mapRef, cueRef].forEach((r) => clearStyle(r.current, 'transform', 'opacity'));
  }, [scrub]);

  const hover = (line: LineId | null) => (e: PointerEvent) => {
    if (e.pointerType === 'mouse') setFocus(line);
  };
  const toggle = (line: LineId) => setFocus((f) => (f === line ? null : line));

  return (
    <section
      ref={sectionRef}
      id="top"
      className={styles.hero}
      aria-label={content.label}
      data-focus={focus ?? undefined}
      onClick={(e) => {
        // On touch, tapping anywhere outside a line clears the emphasis.
        if (!fine && !(e.target as Element).closest('[data-line]')) setFocus(null);
      }}
    >
      <div className={styles.sticky}>
        <div className={`wrap ${styles.grid}`}>
          <div ref={copyRef} className={styles.copy}>
            <Eyebrow className="rise" style={vars({ i: 0 })}>
              {content.eyebrow}
            </Eyebrow>
            <h1 className={cx('display rise', styles.title)} style={vars({ i: 1 })}>
              {content.headline.map((seg, i) =>
                seg.line ? (
                  <span
                    key={i}
                    className={styles.word}
                    data-line={seg.line}
                    data-on={focus === seg.line ? '' : undefined}
                    style={vars({ c: lineColor(seg.line) })}
                    onPointerEnter={hover(seg.line)}
                    onPointerLeave={hover(null)}
                    onClick={() => !fine && toggle(seg.line!)}
                  >
                    {seg.text}
                  </span>
                ) : (
                  <Fragment key={i}>{seg.text}</Fragment>
                ),
              )}
            </h1>
            <p className="lede rise" style={vars({ i: 2 })}>
              {content.lede}
            </p>
            <div className={cx(styles.ctas, 'rise')} style={vars({ i: 3 })}>
              <Button href={content.primary.href} arrow>
                {content.primary.label}
              </Button>
              <Button href={content.secondary.href} variant="ghost">
                {content.secondary.label}
              </Button>
            </div>
          </div>

          <div ref={mapRef} className={styles.mapWrap}>
            <LineMap content={content.map} hint={content.hint} focus={focus} fine={fine} onHover={setFocus} onToggle={toggle} />
          </div>
        </div>
        <a ref={cueRef} className={styles.cue} href="#manifest">
          {content.cue}
          <i aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
