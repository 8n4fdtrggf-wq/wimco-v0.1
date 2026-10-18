import { forwardRef } from 'react';
import type { AfterShotContent, BeforeShotContent } from '@/content/types';
import { cx } from '@/lib/css';
import styles from './Shots.module.css';

/**
 * Two "screenshots" of a fictional client site. They are pictures, so they carry their own
 * fixed palette in either theme. Sized in container units so they scale with the slider.
 */

export function BeforeShot({ content }: { content: BeforeShotContent }) {
  return (
    <div className={cx(styles.shot, styles.before)} aria-hidden="true">
      <div className={styles.bar}>
        <span className={styles.logo}>{content.company}</span>
        <span className={styles.links}>
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className={styles.body}>
        <p className={styles.welcome}>{content.welcome}</p>
        <div className={styles.image}>
          <span className={styles.spinner} />
        </div>
        <p className={styles.small}>{content.body}</p>
      </div>
      <div className={styles.cookie}>
        <span>{content.cookie}</span>
        <b>{content.cookieButton}</b>
      </div>
      <span className={cx(styles.score, styles.poor)}>
        <b>{content.score}</b>
        {content.scoreLabel}
      </span>
    </div>
  );
}

export const AfterShot = forwardRef<HTMLDivElement, { content: AfterShotContent }>(function AfterShot({ content }, ref) {
  return (
    <div ref={ref} className={cx(styles.shot, styles.after)} aria-hidden="true">
      <div className={styles.bar}>
        <span className={styles.logo}>{content.company}</span>
        <span className={styles.nav}>
          {content.nav.map((n) => (
            <em key={n}>{n}</em>
          ))}
        </span>
        <span className={styles.navCta}>{content.navCta}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.copy}>
          <p className={styles.headline}>{content.headline}</p>
          <p className={styles.sub}>{content.sub}</p>
          <span className={styles.cta}>{content.cta}</span>
        </div>
        <div className={styles.photo} />
      </div>
      <span className={cx(styles.score, styles.good)}>
        <b>{content.score}</b>
        {content.scoreLabel}
      </span>
    </div>
  );
});
