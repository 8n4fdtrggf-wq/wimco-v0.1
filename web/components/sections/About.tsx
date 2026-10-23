'use client';

import { useRef } from 'react';
import type { ProcessContent, CompanyContent } from '@/content/types';
import { CopyButton } from '@/components/interactive/CopyButton';
import { gsap, MQ, useGSAP } from '@/lib/gsap';
import { cx, vars } from '@/lib/css';
import styles from './About.module.css';

/** The company and how to reach it, then four steps on a line that draws itself as you read along it. */
export function About({ company, process }: { company: CompanyContent; process: ProcessContent }) {
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
    <section id="om-wimco" ref={root} className={cx('section', styles.about)} aria-labelledby="om-wimco-title">
      <div className="wrap">
        <div className={styles.me}>
          <span className={styles.avatar} aria-hidden="true">
            {company.initial}
          </span>
          <div className={styles.meText}>
            <h2 id="om-wimco-title" className={styles.title} data-rise="">
              {company.title}
            </h2>
            <p className={styles.body} data-rise="">
              {company.body}
            </p>
            <div className={styles.lines} data-rise="">
              <span className={styles.contactLine}>
                <a href={`mailto:${company.email}`}>{company.email}</a>
                <CopyButton value={company.email} label={company.copyEmailLabel} idle={company.copy} done={company.copied} />
              </span>
              <span className={styles.contactLine}>
                <a href={`tel:${company.phoneHref}`}>{company.phone}</a>
                <CopyButton value={company.phone} label={`${company.copyPhoneLabel} ${company.phone}`} idle={company.copy} done={company.copied} />
              </span>
              {company.morePhones.map((p) => (
                <span key={p.phoneHref} className={styles.contactLine}>
                  <a href={`tel:${p.phoneHref}`}>{p.phone}</a>
                  <CopyButton value={p.phone} label={`${company.copyPhoneLabel} ${p.phone}`} idle={company.copy} done={company.copied} />
                </span>
              ))}
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
