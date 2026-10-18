import type { FlowNode } from '@/content/types';
import { vars } from '@/lib/css';
import styles from './Visuals.module.css';

/** An automation flow: the wire draws down and each step lights in order (explanation). */
export function FlowMock({ active, nodes }: { active: boolean; nodes: FlowNode[] }) {
  return (
    <div className={styles.flow} data-active={active ? '' : undefined}>
      <span className={styles.wire}>
        <i />
      </span>
      {nodes.map((n, i) => (
        <div key={i} className={styles.node} style={vars({ d: i })}>
          <time>{n.time}</time>
          <b>{n.title}</b>
          <span>{n.body}</span>
        </div>
      ))}
    </div>
  );
}
