'use client';

import { useRef, useState } from 'react';
import type { Station, StationsContent } from '@/content/types';
import { gsap, MQ, useGSAP } from '@/lib/gsap';
import { cx, vars } from '@/lib/css';
import styles from './Stations.module.css';

/**
 * What the score measures, set as the report's own key: a weighting bar that draws itself,
 * and a table of the six categories. Pointing at (or focusing) a row isolates its share of the bar.
 */
export function Stations({ content, stations }: { content: StationsContent; stations: Station[] }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.from('[data-bar] > span', {
          scaleX: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: { trigger: '[data-bar]', start: 'top 85%', once: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section id="stationer" ref={root} className={cx('section', styles.stations)} aria-labelledby="stationer-title">
      <div className="wrap">
        <div className={styles.head}>
          <h2 id="stationer-title" className={styles.title} data-rise="">
            {content.title}
          </h2>
          <p className={styles.lede} data-rise="">
            {content.lede}
          </p>
        </div>

        <div className={styles.bar} data-bar="" data-active={active ?? undefined} aria-hidden="true">
          {stations.map((s, i) => (
            <span key={s.name} style={vars({ w: s.weight })} data-on={active === i || undefined}>
              <b>
                {s.name} <em>{s.weight}%</em>
              </b>
            </span>
          ))}
        </div>

        <table className={styles.table}>
          <caption className="sr-only">Wimco Scores sex delar, med vikt, källa och vad som mäts</caption>
          <thead>
            <tr>
              <th scope="col">Del</th>
              <th scope="col">Vikt</th>
              <th scope="col">Källa</th>
              <th scope="col">Vad som mäts</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((s, i) => (
              <tr
                key={s.name}
                data-rise=""
                data-on={active === i || undefined}
                tabIndex={0}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <th scope="row">{s.name}</th>
                <td className={styles.weight}>{s.weight}%</td>
                <td>
                  <span className={styles.source} data-kind={s.source.startsWith('Bed') ? 'judged' : 'measured'}>
                    {s.source}
                  </span>
                </td>
                <td className={styles.measures}>{s.measures}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className={styles.note} data-rise="">
          {content.sourcesNote}{' '}
          <a className="link" href={content.link.href}>
            {content.link.label}
          </a>
        </p>
      </div>
    </section>
  );
}
