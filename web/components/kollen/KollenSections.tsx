'use client';

import { cx, vars } from '@/lib/css';
import { track } from '@/lib/site';
import type { laws as LawsCopy, packages as PackagesCopy, order as OrderCopy } from '@/content/kollen';
import type { KollenArea, KollenPackage } from '../../../lib/kollen/catalog.js';
import { KollenOrder } from './KollenOrder';
import { toggleSelection, useSelection } from './selection';
import shared from '../a11y/A11ySections.module.css';
import styles from './KollenSections.module.css';

/** The five rules: area, rule, date, authority and what the kollen checks. */
export function Laws({ copy, areas }: { copy: typeof LawsCopy; areas: KollenArea[] }) {
  return (
    <section id={copy.id} className={cx('section', shared.law)} aria-labelledby="kraven-title">
      <div className="wrap">
        <div className={shared.head}>
          <div>
            <p className="tag">{copy.tag}</p>
            <h2 id="kraven-title" className="title" data-rise="">
              {copy.title}
            </h2>
          </div>
          <p className={shared.lede} data-rise="">
            {copy.lede}
          </p>
        </div>
        <ol className={styles.laws}>
          {areas.map((a, i) => (
            <li key={a.id} data-rise="" style={vars({ i })}>
              <span className={cx(styles.lawNo, 'mono')} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{a.name}</h3>
              <dl>
                <div className={styles.wide}>
                  <dt>{copy.head.law}</dt>
                  <dd>{a.law}</dd>
                </div>
                <div>
                  <dt>{copy.head.since}</dt>
                  <dd>{a.since}</dd>
                </div>
                <div>
                  <dt>{copy.head.authority}</dt>
                  <dd>{a.authority}</dd>
                </div>
                <div className={styles.wide}>
                  <dt>{copy.head.checks}</dt>
                  <dd>{a.checks}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
        <p className={shared.note}>{copy.note}</p>
      </div>
    </section>
  );
}

/** One card per fix, then the monitoring. Each card adds or removes itself from the order. */
export function Packages({ copy, packages }: { copy: typeof PackagesCopy; packages: Record<string, KollenPackage> }) {
  const selected = useSelection();
  const list = Object.values(packages);
  return (
    <section id={copy.id} className={cx('section', shared.packages)} aria-labelledby="paket-title">
      <div className="wrap">
        <div className={shared.head}>
          <div>
            <p className="tag">{copy.tag}</p>
            <h2 id="paket-title" className="title" data-rise="">
              {copy.title}
            </h2>
          </div>
          <p className={shared.lede} data-rise="">
            {copy.lede}
          </p>
        </div>
        <div className={styles.grid}>
          {list.map((p, i) => {
            const on = selected.includes(p.id);
            return (
              <article key={p.id} className={cx(shared.pkg, styles.card)} data-rec={p.monthly || undefined} aria-labelledby={`kp-${p.id}`} data-rise="" style={vars({ i })}>
                {p.monthly && <p className={shared.flag}>{copy.watchFlag}</p>}
                <h3 id={`kp-${p.id}`}>{p.name}</h3>
                <p className={shared.price}>
                  <b>{p.price}</b>
                </p>
                <p className={shared.sum}>{p.summary}</p>
                <ul className={shared.list}>
                  {p.includes.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={styles.toggle}
                  aria-pressed={on}
                  onClick={() => {
                    toggleSelection(p.id);
                    track('kollen_package', { package: p.id, on: !on, from: 'cards' });
                  }}
                >
                  <span aria-hidden="true">{on ? '✓' : '+'}</span> {on ? copy.added : copy.add}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Order({ copy, packages }: { copy: typeof OrderCopy; packages: Record<string, KollenPackage> }) {
  return (
    <section id={copy.id} className={cx('section', shared.order)} aria-labelledby="bestall-title">
      <div className={cx('wrap', shared.orderGrid)}>
        <div className={shared.orderCopy}>
          <p className="tag">{copy.tag}</p>
          <h2 id="bestall-title" className="title" data-rise="">
            {copy.title}
          </h2>
          <p className={shared.lede}>{copy.body}</p>
          <p className={shared.talk}>
            {copy.talkFirst}{' '}
            <a className="link" href={`mailto:${copy.email}`}>
              {copy.email}
            </a>
            .
          </p>
        </div>
        <div className={shared.panel}>
          <KollenOrder copy={copy} packages={packages} />
        </div>
      </div>
    </section>
  );
}
