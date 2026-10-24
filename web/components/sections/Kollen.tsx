import type { KollenTeaserContent } from '@/content/types';
import type { KollenArea } from '../../../lib/kollen/catalog.js';
import { Button } from '@/components/ui/Button';
import { cx, vars } from '@/lib/css';
import styles from './Kollen.module.css';

/**
 * E-handelskollen on the start page: the five rules as a board, and an address field that starts
 * the check on /e-handelskollen/ (a plain GET form, so it works without JavaScript).
 */
export function Kollen({ content, areas }: { content: KollenTeaserContent; areas: KollenArea[] }) {
  return (
    <section id="e-handelskollen" className={cx('section', styles.kollen)} aria-labelledby="kollen-teaser-title">
      <div className={cx('wrap', styles.grid)}>
        <div className={styles.copy}>
          <p className="tag">{content.tag}</p>
          <h2 id="kollen-teaser-title" className={styles.title} data-rise="">
            {content.title}
          </h2>
          <p className={styles.lede} data-rise="">
            {content.lede}
          </p>
          <form className={styles.form} action={content.href} method="get" data-rise="">
            <label htmlFor="kollen-teaser-url" className="sr-only">
              {content.inputLabel}
            </label>
            <input
              id="kollen-teaser-url"
              name="url"
              // text, not url: a native url field rejects "dinbutik.se" without https://
              type="text"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={content.placeholder}
              required
            />
            <Button type="submit" arrow>
              {content.submit}
            </Button>
          </form>
          <p className={styles.note}>
            {content.note}{' '}
            <a className="link" href={content.href}>
              {content.more}
            </a>
          </p>
        </div>

        <div className={styles.board} data-rise="">
          <p className={cx(styles.boardHead, 'mono')}>
            <span>{content.boardTitle}</span>
            <span>{content.boardSince}</span>
          </p>
          <ol className={styles.rows}>
            {areas.map((a, i) => (
              <li key={a.id} style={vars({ i })}>
                <i aria-hidden="true" />
                <span className={styles.name}>
                  {a.name}
                  <small>{a.authority}</small>
                </span>
                <span className={cx(styles.since, 'mono')}>{a.since}</span>
              </li>
            ))}
          </ol>
          <p className={styles.price}>{content.price}</p>
        </div>
      </div>
    </section>
  );
}
