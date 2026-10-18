import type { CompareContent } from '@/content/types';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { EnterScale } from '@/components/interactive/EnterScale';
import { CompareSlider } from '@/components/interactive/CompareSlider';
import styles from './Compare.module.css';

/** The signature section: an inverted band that settles into place, holding the before/after slider. */
export function Compare({ content }: { content: CompareContent }) {
  return (
    <section id="optimering" className={styles.compare} aria-label={content.label}>
      <EnterScale className={styles.band}>
        <div className="wrap">
          <SectionHeading
            eyebrow={content.eyebrow}
            title={content.title}
            lede={content.lede}
            lines={[content.line]}
            segment={content.line}
            tone="inverse"
            className={styles.head}
          />
          <CompareSlider slider={content.slider} before={content.before} after={content.after} />
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {content.metricsHead.map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {content.metrics.map((m) => (
                  <tr key={m.label}>
                    <th scope="row">{m.label}</th>
                    <td className={styles.before}>{m.before}</td>
                    <td className={styles.after}>{m.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>{content.note}</p>
        </div>
      </EnterScale>
    </section>
  );
}
