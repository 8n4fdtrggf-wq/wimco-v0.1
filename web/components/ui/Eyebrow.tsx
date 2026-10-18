import type { CSSProperties, ReactNode } from 'react';
import type { LineId } from '@/content/types';
import { lineColor } from '@/lib/lines';
import { cx, vars } from '@/lib/css';
import { LineBadge } from './LineBadge';
import styles from './Eyebrow.module.css';

interface Props {
  children: ReactNode;
  /** Badges shown before the label. */
  lines?: LineId[];
  /** Draws a short line segment after the label in this line's colour (animated by <Reveal>). */
  segment?: LineId;
  tone?: 'default' | 'inverse';
  className?: string;
  style?: CSSProperties;
}

export function Eyebrow({ children, lines = [], segment, tone = 'default', className, style }: Props) {
  return (
    <p className={cx(styles.eyebrow, tone === 'inverse' && styles.inverse, className)} style={style}>
      {lines.map((l) => (
        <LineBadge key={l} line={l} />
      ))}
      {children}
      {segment && <span className={styles.seg} data-seg="" style={vars({ c: lineColor(segment) })} aria-hidden="true" />}
    </p>
  );
}
