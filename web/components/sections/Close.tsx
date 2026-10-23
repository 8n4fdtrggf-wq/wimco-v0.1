'use client';

import { useRef } from 'react';
import type { ContactContent, Station } from '@/content/types';
import { AnalysisForm } from '@/components/interactive/AnalysisForm';
import { ProjectForm } from '@/components/interactive/ProjectForm';
import { ScoreRing } from '@/components/score/ScoreRing';
import { ScrollTrigger, useGSAP } from '@/lib/gsap';
import { cx } from '@/lib/css';
import { publish } from '@/lib/score';
import styles from './Close.module.css';

/**
 * The hand-over. The instrument that followed the visitor down the page empties
 * ("?" in the bar and here), and the page ends on two real inputs: analyse your site,
 * or tell Willem what you want built.
 */
export function Close({ content, stations }: { content: ContactContent; stations: Station[] }) {
  const root = useRef<HTMLElement>(null);
  const after = stations.map((s) => s.after);
  const { analyse, project, willem } = content;

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top 55%',
        onEnter: () => publish(null),
        onLeaveBack: () => publish(after),
      });
    },
    { scope: root },
  );

  return (
    <section id="starta" ref={root} className={cx('section', styles.close)} aria-labelledby="starta-title">
      <div className="wrap">
        <div className={styles.head}>
          <ScoreRing size="md" label="" className={styles.ring} />
          <div className={styles.headText}>
            <h2 id="starta-title" className={styles.title} data-rise="">
              {content.title}
            </h2>
            <p className={styles.lede} data-rise="">
              {content.lede}
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          <div id={analyse.id} className={cx(styles.panel, styles.primary)} data-rise="">
            <p className="tag">{analyse.eyebrow}</p>
            <h3 className={styles.panelTitle}>{analyse.title}</h3>
            <p className={styles.body}>{analyse.body}</p>
            <AnalysisForm content={analyse} />
            <ol className={styles.gets}>
              {analyse.gets.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ol>
          </div>

          <div id={project.id} className={styles.panel} data-rise="">
            <p className="tag">{project.eyebrow}</p>
            <h3 className={styles.panelTitle}>{project.title}</h3>
            <p className={styles.body}>{project.body}</p>
            <ProjectForm content={project} email={willem.email} />
          </div>
        </div>
      </div>
    </section>
  );
}
