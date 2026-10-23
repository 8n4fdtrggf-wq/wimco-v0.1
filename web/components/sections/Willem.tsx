'use client';

import { useRef } from 'react';
import type { ProcessContent, WillemContent } from '@/content/types';
import { CopyButton } from '@/components/interactive/CopyButton';
import { gsap, MQ, useGSAP } from '@/lib/gsap';
import { cx, vars } from '@/lib/css';
import styles from './Willem.module.css';

/** A person, then four steps on a line that draws itself as you read along it. */
export function Willem({ willem, process }: { willem: WillemContent; process: ProcessContent }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.fromTo(
          '[data-rail] i',
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: { trigger: '[data-steps]', start: 'top 80%', end: 'bottom 55%', scrub: 0.5 },
          },
        );
        gsap.utils.toArray<HTMLElement>('[data-steps] > li').forEach((li, i, all) => {
          gsap.from(li, {
            opacity: 0.25,
            y: 12,
            ease: 'none',
            scrollTrigger: {
              trigger: '[data-steps]',
              start: `top+=${(i / all.length) * 60}% 80%`,
              end: `top+=${(i / all.length) * 60 + 20}% 70%`,
              scrub: 0.5,
            },
          });
        });
      });
    },
    { scope: root },
  );

  return (
    <section id="willem" ref={root} className={cx('section', styles.willem)} aria-labelledby="willem-title">
      <div className="wrap">
        <div className={styles.me}>
          <span className={styles.avatar} aria-hidden="true">
            {willem.initial}
          </span>
          <div className={styles.meText}>
            <h2 id="willem-title" className={styles.title} data-rise="">
              {willem.title}
            </h2>
            <p className={styles.body} data-rise="">
              {willem.body}
            </p>
            <div className={styles.lines} data-rise="">
              <span className={styles.contactLine}>
                <a href={`mailto:${willem.email}`}>{willem.email}</a>
                <CopyButton value={willem.email} label={willem.copyEmailLabel} idle={willem.copy} done={willem.copied} />
              </span>
              <span className={styles.contactLine}>
                <a href={`tel:${willem.phoneHref}`}>{willem.phone}</a>
                <CopyButton value={willem.phone} label={willem.copyPhoneLabel} idle={willem.copy} done={willem.copied} />
              </span>
            </div>
          </div>
        </div>

        <h3 className={styles.processTitle}>{process.title}</h3>
        <div className={styles.rail} data-rail="" aria-hidden="true">
          <i />
        </div>
        <ol className={styles.steps} data-steps="">
          {process.steps.map((s, i) => (
            <li key={s.title} style={vars({ i })}>
              <span className={styles.stepNo} aria-hidden="true" />
              <h4>{s.title}</h4>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
