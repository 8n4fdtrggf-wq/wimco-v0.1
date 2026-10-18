import type { FactsContent } from '@/content/types';
import { Reveal } from '@/components/ui/Reveal';
import { vars } from '@/lib/css';
import styles from './Facts.module.css';

/** Four plain facts that answer "what is it like to work with you?" before the services. */
export function Facts({ content }: { content: FactsContent }) {
  return (
    <section className={styles.facts} aria-label={content.label}>
      <div className="wrap">
        <Reveal as="ul" variant="stagger" className={styles.list}>
          {content.items.map((item, i) => (
            <li key={item.title} style={vars({ i })}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
