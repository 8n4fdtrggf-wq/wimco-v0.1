import type { LineId } from '@/content/types';
import { lines } from '@/content/site';
import { lineColor } from '@/lib/lines';
import { cx, vars } from '@/lib/css';
import styles from './LineBadge.module.css';

interface Props {
  line: LineId;
  size?: 'sm' | 'md' | 'lg';
  /** Text shown instead of the line letter (e.g. a step number). */
  children?: string;
  className?: string;
}

/** The transit roundel. Decorative by default; the line name is always written next to it. */
export function LineBadge({ line, size = 'md', children, className }: Props) {
  return (
    <span className={cx(styles.badge, styles[size], className)} style={vars({ c: lineColor(line) })} aria-hidden="true">
      {children ?? lines[line].letter}
    </span>
  );
}
