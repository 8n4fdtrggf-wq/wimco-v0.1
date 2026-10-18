import type { FaqContent } from '@/content/types';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { cx } from '@/lib/css';
import styles from './Faq.module.css';

/**
 * Native <details> accordion: keyboard and screen-reader support for free, works without JS.
 * Where the browser supports ::details-content, opening animates its height; elsewhere it opens instantly.
 */
export function Faq({ content }: { content: FaqContent }) {
  return (
    <section id="faq" className={cx('wrap', styles.faq)}>
      <div className={styles.grid}>
        <SectionHeading eyebrow={content.eyebrow} title={content.title} segment="o" className={styles.head} />
        <div className={styles.list}>
          {content.items.map((item) => (
            <details key={item.question} className={styles.item} name="faq">
              <summary className={styles.question}>
                <span>{item.question}</span>
                <i className={styles.icon} aria-hidden="true" />
              </summary>
              <div className={styles.answer}>
                <p>
                  {item.answer}
                  {item.link && (
                    <>
                      {' '}
                      <a href={item.link.href}>{item.link.label}</a>.
                    </>
                  )}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
