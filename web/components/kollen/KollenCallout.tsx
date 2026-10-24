import { Button } from '@/components/ui/Button';
import styles from './KollenCallout.module.css';

/** A pointer from a single-topic page (like /tillganglighet/) to the full E-handelskollen. */
export function KollenCallout({ title, body, cta, href }: { title: string; body: string; cta: string; href: string }) {
  return (
    <aside className={styles.callout} aria-label="E-handelskollen">
      <div className="wrap">
        <div className={styles.inner}>
          <div>
            <p className="tag">E-handelskollen</p>
            <h2>{title}</h2>
            <p>{body}</p>
          </div>
          <Button href={href} arrow>
            {cta}
          </Button>
        </div>
      </div>
    </aside>
  );
}
