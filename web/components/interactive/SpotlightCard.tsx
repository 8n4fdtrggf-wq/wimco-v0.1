'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';
import type { LineId } from '@/content/types';
import { lineColor } from '@/lib/lines';
import { vars } from '@/lib/css';
import styles from './SpotlightCard.module.css';

const SIZE = 360;

/**
 * A card with a soft light in its line colour that follows a mouse pointer (decorative; fine pointers only).
 * The light is a child moved with transform, so pointer moves never restyle the card's content.
 */
export function SpotlightCard({
  id,
  line,
  children,
  style,
}: {
  id?: string;
  line: LineId;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const spot = useRef<HTMLSpanElement>(null);
  const rect = useRef<DOMRect | null>(null);
  return (
    <div
      id={id}
      className={styles.card}
      style={{ ...vars({ c: lineColor(line) }), ...style }}
      onPointerEnter={(e) => {
        rect.current = e.currentTarget.getBoundingClientRect();
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !rect.current || !spot.current) return;
        spot.current.style.transform = `translate3d(${e.clientX - rect.current.left - SIZE / 2}px, ${e.clientY - rect.current.top - SIZE / 2}px, 0)`;
      }}
    >
      <span ref={spot} className={styles.spot} aria-hidden="true" />
      {children}
    </div>
  );
}
