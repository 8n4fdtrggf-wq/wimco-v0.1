import type { PortalRow } from '@/content/types';
import { cx, vars } from '@/lib/css';
import styles from './Visuals.module.css';

interface Props {
  active: boolean;
  head: [string, string, string];
  rows: PortalRow[];
}

/** A customer portal whose rows settle in and whose open cases resolve while you watch. */
export function PortalMock({ active, head, rows }: Props) {
  return (
    <div className={styles.portal} data-active={active ? '' : undefined}>
      <div className={styles.aside}>
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className={styles.table}>
        <div className={cx(styles.row, styles.rowHead)}>
          {head.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        {rows.map((r, i) => (
          <div key={r.customer} className={styles.row} style={vars({ d: i + 1 })}>
            <span>{r.customer}</span>
            <span>{r.matter}</span>
            <span className={cx(styles.status, r.resolvesTo && styles.swap)} style={vars({ sd: `${r.delayMs ?? 0}ms` })}>
              <em className={styles.statusFrom}>{r.status}</em>
              {r.resolvesTo && <em className={styles.statusTo}>{r.resolvesTo}</em>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
