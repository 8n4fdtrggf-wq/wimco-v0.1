'use client';

import { useRef, type KeyboardEvent } from 'react';
import type { HeroContent, LineId } from '@/content/types';
import { lines } from '@/content/site';
import { lineColor } from '@/lib/lines';
import { vars } from '@/lib/css';
import { clamp, useSpring } from '@/lib/motion';
import styles from './LineMap.module.css';

/** Map geometry is presentation, so it lives here; the labels come from content. */
const ROUTES: { line: LineId; d: string; stop: [number, number]; badge: [number, number] }[] = [
  { line: 'h', d: 'M48 72 H226 L300 146 V392', stop: [140, 72], badge: [48, 72] },
  { line: 'w', d: 'M48 178 H240 L314 252 V392', stop: [150, 178], badge: [48, 178] },
  { line: 'a', d: 'M472 112 H402 L328 186 V392', stop: [420, 112], badge: [472, 112] },
  { line: 'o', d: 'M472 262 H416 L342 336 V392', stop: [430, 262], badge: [472, 262] },
];

/** How far each depth layer drifts toward the pointer, in px. Grid < routes < badges. */
const DEPTH = [3, 7, 12];

interface Props {
  content: HeroContent['map'];
  hint: HeroContent['hint'];
  focus: LineId | null;
  fine: boolean;
  onHover: (line: LineId | null) => void;
  onToggle: (line: LineId) => void;
}

export function LineMap({ content, hint, focus, fine, onHover, onToggle }: Props) {
  const layers = useRef<(SVGGElement | null)[]>([]);
  const rect = useRef<DOMRect | null>(null);
  const pos = useRef({ x: 0, y: 0 });

  const paint = () =>
    layers.current.forEach((g, i) => {
      if (g) g.style.transform = `translate(${(pos.current.x * DEPTH[i]).toFixed(2)}px, ${(pos.current.y * DEPTH[i]).toFixed(2)}px)`;
    });
  // Decorative pointer tracking, smoothed by a slow critically damped spring so it never feels glued.
  const sx = useSpring(0, { response: 0.9, eps: 0.002 }, (v) => {
    pos.current.x = v;
    paint();
  });
  const sy = useSpring(0, { response: 0.9, eps: 0.002 }, (v) => {
    pos.current.y = v;
    paint();
  });

  const lineFromEvent = (target: EventTarget) =>
    ((target as Element).closest('[data-line]')?.getAttribute('data-line') as LineId | null) ?? null;

  const onKey = (line: LineId) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(line);
    }
  };

  const on = (line: LineId) => (focus === line ? '' : undefined);

  return (
    <div
      className={styles.wrap}
      onPointerEnter={(e) => {
        rect.current = e.currentTarget.getBoundingClientRect();
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !rect.current) return;
        const r = rect.current;
        sx.to(clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1));
        sy.to(clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1));
      }}
      onPointerLeave={(e) => {
        sx.to(0);
        sy.to(0);
        if (e.pointerType === 'mouse') onHover(null);
      }}
    >
      <svg
        className={styles.map}
        viewBox="0 0 520 480"
        role="img"
        aria-label={content.ariaLabel}
        data-focus={focus ?? undefined}
        onPointerOver={(e) => {
          if (e.pointerType === 'mouse') onHover(lineFromEvent(e.target));
        }}
        onClick={(e) => {
          const line = lineFromEvent(e.target);
          if (line && !fine) onToggle(line);
        }}
      >
        <defs>
          <pattern id="wimco-dotgrid" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.3" className={styles.dot} />
          </pattern>
        </defs>

        <g ref={(el) => { layers.current[0] = el; }} className={styles.layer}>
          <rect x="-30" y="-30" width="580" height="540" rx="28" fill="url(#wimco-dotgrid)" />
        </g>

        <g ref={(el) => { layers.current[1] = el; }} className={styles.layer}>
          {ROUTES.map((r, i) => (
            <path
              key={r.line}
              className={`${styles.route} ${styles.draw}`}
              d={r.d}
              pathLength={1}
              data-line={r.line}
              data-on={on(r.line)}
              style={vars({ i, c: lineColor(r.line) })}
            />
          ))}
          {ROUTES.map((r, i) => (
            <g key={r.line} className={`${styles.stopGroup} ${styles.pop}`} data-line={r.line} data-on={on(r.line)} style={vars({ i, c: lineColor(r.line) })}>
              <circle className={styles.stop} cx={r.stop[0]} cy={r.stop[1]} r="7" />
              <text className={styles.label} x={r.stop[0]} y={r.stop[1] - 20} textAnchor="middle">
                {content.stops[r.line]}
              </text>
            </g>
          ))}
        </g>

        <g ref={(el) => { layers.current[2] = el; }} className={styles.layer}>
          <g className={styles.pop} style={vars({ i: 4 })}>
            {ROUTES.map((r) => (
              <g
                key={r.line}
                className={styles.badge}
                data-line={r.line}
                data-on={on(r.line)}
                tabIndex={0}
                role="button"
                aria-pressed={focus === r.line}
                aria-label={`${lines[r.line].letter}: ${lines[r.line].name}`}
                style={vars({ c: lineColor(r.line) })}
                onFocus={() => onHover(r.line)}
                onBlur={() => onHover(null)}
                onKeyDown={onKey(r.line)}
              >
                <circle className={styles.focusRing} cx={r.badge[0]} cy={r.badge[1]} r="23" />
                <circle className={styles.badgeFill} cx={r.badge[0]} cy={r.badge[1]} r="17" />
                <text className={styles.badgeText} x={r.badge[0]} y={r.badge[1] + 5} textAnchor="middle">
                  {lines[r.line].letter}
                </text>
              </g>
            ))}
          </g>
          <g className={styles.pop} style={vars({ i: 6 })}>
            <rect className={styles.station} x="282" y="384" width="78" height="30" rx="15" />
            <text className={styles.destination} x="321" y="448" textAnchor="middle">
              {content.destination}
            </text>
            <text className={styles.label} x="321" y="468" textAnchor="middle">
              {content.destinationSub}
            </text>
          </g>
        </g>
      </svg>
      <p className={styles.hint} data-hidden={focus ? '' : undefined}>
        {fine ? hint.fine : hint.coarse}
      </p>
    </div>
  );
}
