import { Button } from '@/components/ui/Button';
import { cx, vars } from '@/lib/css';
import type { law as LawCopy, packages as PackagesCopy, process as ProcessCopy, order as OrderCopy } from '@/content/tillganglighet';
import type { A11yPackage } from '../../../lib/a11y/packages.js';
import { A11yOrder } from './A11yOrder';
import styles from './A11ySections.module.css';

/** The law in four rows, laid out like the Wimco Score table on the start page. */
export function Law({ copy }: { copy: typeof LawCopy }) {
  return (
    <section id="lagen" className={cx('section', styles.law)} aria-labelledby="lagen-title">
      <div className="wrap">
        <div className={styles.head}>
          <div>
            <p className="tag">{copy.tag}</p>
            <h2 id="lagen-title" className="title" data-rise="">
              {copy.title}
            </h2>
          </div>
          <p className={styles.lede} data-rise="">
            {copy.lede}
          </p>
        </div>
        <dl className={styles.table}>
          {copy.rows.map((r) => (
            <div key={r.label} data-rise="">
              <dt>{r.label}</dt>
              <dd>{r.text}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.note}>
          {copy.note}{' '}
          <a className="link" href={copy.noteLink.href} target="_blank" rel="noopener">
            {copy.noteLink.label}
          </a>
          .
        </p>
      </div>
    </section>
  );
}

/** Three packages. The recommended one carries the accent, like the primary panel at the end of the start page. */
export function Packages({ copy, packages }: { copy: typeof PackagesCopy; packages: A11yPackage[] }) {
  return (
    <section id={copy.id} className={cx('section', styles.packages)} aria-labelledby="paket-title">
      <div className="wrap">
        <div className={styles.head}>
          <div>
            <p className="tag">{copy.tag}</p>
            <h2 id="paket-title" className="title" data-rise="">
              {copy.title}
            </h2>
          </div>
          <p className={styles.lede} data-rise="">
            {copy.lede}
          </p>
        </div>
        <div className={styles.grid}>
          {packages.map((p, i) => (
            <article key={p.id} className={styles.pkg} data-rec={p.recommended || undefined} aria-labelledby={`pkg-${p.id}`} data-rise="" style={vars({ i })}>
              {p.recommended && <p className={styles.flag}>{copy.recommended}</p>}
              <h3 id={`pkg-${p.id}`}>{p.name}</h3>
              <p className={styles.price}>
                <b>{p.price}</b>
                <span>{p.priceNote}</span>
              </p>
              <p className={styles.sum}>{p.summary}</p>
              <ul className={styles.list}>
                {p.includes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className={cx(styles.delivery, 'mono')}>{p.delivery}</p>
              <Button href="#bestall" variant={p.recommended ? 'primary' : 'ghost'} block arrow data={{ 'pick-package': p.id }}>
                {`${copy.order} ${p.name.toLowerCase()}`}
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Four steps on a line, numbered like the "gets" list in the start page's closing panel. */
export function Process({ copy }: { copy: typeof ProcessCopy }) {
  return (
    <section className={cx('section', styles.process)} aria-labelledby="process-title">
      <div className="wrap">
        <p className="tag">{copy.tag}</p>
        <h2 id="process-title" className="title" data-rise="">
          {copy.title}
        </h2>
        <ol className={styles.steps}>
          {copy.steps.map((s, i) => (
            <li key={s.title} data-rise="" style={vars({ i })}>
              <span className={styles.num} aria-hidden="true">
                {i + 1}
              </span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The order: copy on the left, the form in a panel on the right. */
export function Order({
  copy,
  packages,
  platforms,
  sizes,
}: {
  copy: typeof OrderCopy;
  packages: A11yPackage[];
  platforms: Record<string, string>;
  sizes: Record<string, string>;
}) {
  return (
    <section id={copy.id} className={cx('section', styles.order)} aria-labelledby="bestall-title">
      <div className={cx('wrap', styles.orderGrid)}>
        <div className={styles.orderCopy}>
          <p className="tag">{copy.tag}</p>
          <h2 id="bestall-title" className="title" data-rise="">
            {copy.title}
          </h2>
          <p className={styles.lede}>{copy.body}</p>
          <p className={styles.talk}>
            {copy.talkFirst}{' '}
            <a className="link" href={`mailto:${copy.email}`}>
              {copy.email}
            </a>
            .
          </p>
        </div>
        <div className={styles.panel}>
          <A11yOrder copy={copy} packages={packages} platforms={platforms} sizes={sizes} />
        </div>
      </div>
    </section>
  );
}
