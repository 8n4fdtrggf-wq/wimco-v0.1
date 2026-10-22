import type { BuildContent } from '@/content/types';
import { cx } from '@/lib/css';
import styles from './Build.module.css';

/** What Wimco builds, as a catalogue: one schema per row, facts instead of pitch. */
export function Build({ content }: { content: BuildContent }) {
  return (
    <section id="tjanster" className={cx('section', styles.build)} aria-labelledby="tjanster-title">
      <div className="wrap">
        <div className={styles.head}>
          <h2 id="tjanster-title" className={styles.title} data-rise="">
            {content.title}
          </h2>
          <p className={styles.lede} data-rise="">
            {content.lede}
          </p>
        </div>

        <ul className={styles.list}>
          {content.items.map((item) => (
            <li key={item.service} className={styles.row} data-rise="">
              <h3 className={styles.name}>{item.name}</h3>
              <p className={styles.what}>{item.what}</p>
              <ul className={styles.examples} aria-label={`Exempel på ${item.name.toLowerCase()}`}>
                {item.examples.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              <p className={styles.time}>
                <span className="sr-only">{content.head.time}: </span>
                {item.time}
              </p>
            </li>
          ))}
        </ul>

        <a className={styles.cta} href={content.cta.href} data-rise="">
          {content.cta.label}
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
