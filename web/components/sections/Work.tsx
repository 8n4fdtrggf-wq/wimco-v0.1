'use client';

import { useState } from 'react';
import type { WorkContent } from '@/content/types';
import { cx } from '@/lib/css';
import { CaseOrbit } from '@/components/work/CaseOrbit';
import styles from './Work.module.css';

/**
 * Referenser: real sites Wimco built. Each one is its screenshot with small live cards floating
 * around it (components/work/CaseOrbit.tsx); the screenshot links to the case once it has settled.
 * The list beside it switches which reference is shown; items come from content/site.ts.
 */
export function Work({ content }: { content: WorkContent }) {
  const [active, setActive] = useState(0);
  const item = content.items[active];
  const many = content.items.length > 1;

  return (
    <section id="referenser" className={cx('section', styles.work)} aria-labelledby="referenser-title">
      <div className="wrap">
        <div className={styles.head}>
          <h2 id="referenser-title" className={styles.title} data-rise="">
            {content.title}
          </h2>
          {content.lede && (
            <p className={styles.lede} data-rise="">
              {content.lede}
            </p>
          )}
        </div>

        <div className={styles.stage}>
          <div className={styles.orbit} data-rise="">
            <CaseOrbit
              items={content.items}
              active={active}
              screenLabel={content.screenLabel}
              orbitLabel={content.orbitLabel}
              readCase={content.readCase}
            />
          </div>

          <div className={styles.side} data-rise="">
            <p className={cx(styles.label, 'mono')}>
              <span>{content.listLabel}</span>
              <span>
                {String(active + 1).padStart(2, '0')} / {String(content.items.length).padStart(2, '0')}
              </span>
            </p>
            <ul className={styles.list}>
              {content.items.map((w, i) => (
                <li key={w.id}>
                  {many ? (
                    <button type="button" className={styles.pick} aria-pressed={i === active} onClick={() => setActive(i)}>
                      <b>{w.name}</b>
                      <small>{w.about}</small>
                    </button>
                  ) : (
                    <div className={styles.pick} data-only="">
                      <b>{w.name}</b>
                      <small>{w.about}</small>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className={styles.detail} aria-live="polite">
              <ul className={styles.did} aria-label={`${content.didLabel}: ${item.name}`}>
                {item.did.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              {item.caseHref && (
              <a className={styles.visit} href={item.caseHref}>
                {content.readCase}
                <span className="sr-only">: {item.name}</span>
                <i aria-hidden="true">→</i>
              </a>
              )}
              {item.href && (
              <a className={styles.visit} href={item.href} target="_blank" rel="noopener">
                {content.visit}
                <span className="sr-only"> {item.name}</span>
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              )}
            </div>

            <a className={styles.next} href={content.next.cta.href}>
              <span>
                <b>{content.next.title}</b>
                <small>{content.next.body}</small>
              </span>
              <em>
                {content.next.cta.label}
                <i aria-hidden="true">→</i>
              </em>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
