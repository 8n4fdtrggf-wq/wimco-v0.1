'use client';

import { useRef, useState } from 'react';
import type { WorkContent } from '@/content/types';
import { gsap, MQ, useGSAP } from '@/lib/gsap';
import { cx, format } from '@/lib/css';
import styles from './Work.module.css';

/**
 * Referenser: real sites Wimco built, shown on one laptop. The page on the screen scrolls
 * with the visitor's own scroll, so a glance shows the top and a few seconds show the rest.
 * The list beside it switches which site is on the screen; items come from content/site.ts.
 */
export function Work({ content }: { content: WorkContent }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const item = content.items[active];
  const many = content.items.length > 1;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const screen = root.current?.querySelector<HTMLElement>('[data-screen]');
        if (!screen) return;
        // Every shot travels its own overflow, so tall and short screenshots both end at their foot.
        gsap.utils.toArray<HTMLElement>('[data-shot]', screen).forEach((shot) => {
          gsap.to(shot, {
            y: () => Math.min(0, screen.clientHeight - shot.offsetHeight),
            ease: 'none',
            scrollTrigger: { trigger: screen, start: 'center 58%', end: 'bottom top+=72', scrub: 0.5, invalidateOnRefresh: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="referenser" className={cx('section', styles.work)} aria-labelledby="referenser-title">
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
          <div className={styles.laptop} data-rise="">
            <div className={styles.lid}>
              <div className={styles.display}>
                <i className={styles.notch} aria-hidden="true" />
                <div className={styles.bar} aria-hidden="true">
                  <span className={styles.lights}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className={cx(styles.url, 'mono')}>{item.host}</span>
                </div>
                <div className={styles.screen} data-screen="">
                  {content.items.map((w, i) => (
                    <img
                      key={w.id}
                      data-shot=""
                      data-on={i === active || undefined}
                      src={w.image.src}
                      width={w.image.width}
                      height={w.image.height}
                      alt={i === active ? format(content.screenLabel, { name: w.name }) : ''}
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.base} aria-hidden="true">
              <i />
            </div>
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
