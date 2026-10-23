import { forwardRef } from 'react';
import { band, CIRC, RING, SEGMENTS, total, WEIGHTS, type Scores } from '@/lib/score';
import { cx } from '@/lib/css';
import styles from './ScoreRing.module.css';

interface Props {
  /** Small caption under the number, e.g. "av 100". */
  caption?: string;
  /** Accessible description of what the ring shows. */
  label: string;
  size?: 'lg' | 'md' | 'sm';
  className?: string;
  /** Server-rendered starting state (also what no-JS and reduced motion keep). Scripts repaint via paintRing(). */
  scores?: Scores;
  id?: string;
}

/**
 * Six weighted arcs (Prestanda 20, Mobil 15, Tillgänglighet 15, SEO 20, Tydlighet 15, Konvertering 15)
 * around a total. Static markup; paintRing() in lib/score.ts fills it.
 */
export const ScoreRing = forwardRef<HTMLDivElement, Props>(function ScoreRing(
  { caption, label, size = 'lg', className, scores, id },
  ref,
) {
  const c = RING.size / 2;
  return (
    <div
      ref={ref}
      id={id}
      data-ring=""
      className={cx(styles.ring, styles[size], className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <svg viewBox={`0 0 ${RING.size} ${RING.size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${c} ${c})`} fill="none" strokeWidth={RING.stroke} strokeLinecap="butt">
          {SEGMENTS.map((s, i) => (
            <circle
              key={`t${i}`}
              className={styles.track}
              cx={c}
              cy={c}
              r={RING.r}
              strokeDasharray={`${s.len.toFixed(2)} ${CIRC.toFixed(2)}`}
              strokeDashoffset={(-s.start).toFixed(2)}
            />
          ))}
          {SEGMENTS.map((s, i) => (
            <circle
              key={`v${i}`}
              className={styles.value}
              data-seg={i}
              data-weight={WEIGHTS[i]}
              data-band={scores ? band(scores[i]) : 'none'}
              cx={c}
              cy={c}
              r={RING.r}
              strokeDasharray={`${scores ? Math.max(0.001, (s.len * scores[i]) / 100).toFixed(2) : '0.001'} ${CIRC.toFixed(2)}`}
              strokeDashoffset={(-s.start).toFixed(2)}
            />
          ))}
        </g>
      </svg>
      <div className={styles.center} aria-hidden="true">
        <b data-total="">{scores ? total(scores) : '?'}</b>
        {caption && <span>{caption}</span>}
      </div>
    </div>
  );
});
