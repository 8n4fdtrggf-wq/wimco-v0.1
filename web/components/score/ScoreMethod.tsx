import { Button } from '@/components/ui/Button';
import { ScoreRing } from '@/components/score/ScoreRing';
import { cx, vars } from '@/lib/css';
import type { Scores } from '@/lib/score';
import type * as copy from '@/content/score';
import styles from './ScoreMethod.module.css';

/** Opening: the definition first, an example ring beside it. */
export function MethodHero({ copy: c, scores }: { copy: typeof copy.hero; scores: Scores }) {
  return (
    <section className={styles.hero} aria-labelledby="metod-title">
      <div className={cx('wrap', styles.heroGrid)}>
        <div className={styles.heroCopy}>
          <p className={cx('tag', 'rise')}>{c.tag}</p>
          <h1 id="metod-title" className={cx('display', 'rise', 'rise-move', styles.heroTitle)}>
            {c.title}
          </h1>
          <p className={cx('rise', 'rise-move', styles.heroLede)} style={vars({ i: 1 })}>
            {c.lede}
          </p>
          <div className={cx('rise', styles.heroActions)} style={vars({ i: 2 })}>
            <Button href={c.cta.href} arrow>
              {c.cta.label}
            </Button>
            <a className="link" href={c.secondary.href}>
              {c.secondary.label}
            </a>
          </div>
        </div>
        <figure className={cx('rise', styles.heroCard)} style={vars({ i: 3 })}>
          <figcaption className="tag">{c.ringNote}</figcaption>
          <ScoreRing label={c.ringLabel} caption={c.ringCaption} scores={scores} size="md" />
        </figure>
      </div>
    </section>
  );
}

function Head({ tag, title, lede, id }: { tag: string; title: string; lede?: string; id: string }) {
  return (
    <div className={styles.head}>
      <div>
        <p className="tag">{tag}</p>
        <h2 id={id} className="title" data-rise="">
          {title}
        </h2>
      </div>
      {lede && (
        <p className={styles.lede} data-rise="">
          {lede}
        </p>
      )}
    </div>
  );
}

/** The three kinds of source, as cards carrying the same chips as the score table. */
export function Sources({ copy: c }: { copy: typeof copy.sources }) {
  return (
    <section className={cx('section', styles.sources)} aria-labelledby="kallor-title">
      <div className="wrap">
        <Head id="kallor-title" tag={c.tag} title={c.title} lede={c.lede} />
        <div className={styles.cards}>
          {c.items.map((s, i) => (
            <article key={s.label} className={styles.card} data-rise="" style={vars({ i })}>
              <span className={styles.chip} data-kind={s.kind}>
                {s.label}
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** How each part is computed, and how a single check scores. */
export function Calculation({ copy: c }: { copy: typeof copy.calculation }) {
  return (
    <section id="berakning" className={cx('section', styles.calc)} aria-labelledby="berakning-title">
      <div className="wrap">
        <Head id="berakning-title" tag={c.tag} title={c.title} lede={c.lede} />
        <div className={styles.calcGrid}>
          <dl className={styles.rows}>
            {c.rows.map((r) => (
              <div key={r.label} data-rise="">
                <dt>{r.label}</dt>
                <dd className="mono">{r.weight}</dd>
                <dd>{r.text}</dd>
              </div>
            ))}
          </dl>
          <aside className={styles.checks} data-rise="" aria-labelledby="kontroll-title">
            <h3 id="kontroll-title">{c.checksTitle}</h3>
            <ul>
              {c.checks.map((k) => (
                <li key={k.label}>
                  <span className={styles.dot} data-tone={k.tone} aria-hidden="true" />
                  <b>{k.label}</b>
                  <span className="mono">{k.value}</span>
                </li>
              ))}
            </ul>
            <p>{c.note}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

/** The report's three groups, in the order the report shows them. */
export function Priority({ copy: c }: { copy: typeof copy.priority }) {
  return (
    <section className={cx('section', styles.priority)} aria-labelledby="prio-title">
      <div className="wrap">
        <Head id="prio-title" tag={c.tag} title={c.title} lede={c.lede} />
        <ol className={styles.tiers}>
          {c.tiers.map((t, i) => (
            <li key={t.label} data-tone={t.tone} data-rise="" style={vars({ i })}>
              <span className={cx('mono', styles.tierNum)}>{String(i + 1).padStart(2, '0')}</span>
              <h3>{t.label}</h3>
              <p>{t.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Limits and security side by side: the honest small print, set as two panels. */
export function SmallPrint({ limits, security }: { limits: typeof copy.limits; security: typeof copy.security }) {
  return (
    <section className={cx('section', styles.print)} aria-label={`${limits.title} ${security.title}`}>
      <div className={cx('wrap', styles.printGrid)}>
        <article className={styles.panel} data-rise="">
          <p className="tag">{limits.tag}</p>
          <h2 className={styles.panelTitle}>{limits.title}</h2>
          <ul className={styles.list}>
            {limits.items.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </article>
        <article className={styles.panel} data-rise="" style={vars({ i: 1 })}>
          <p className="tag">{security.tag}</p>
          <h2 className={styles.panelTitle}>{security.title}</h2>
          {security.paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className={styles.para}>
              {p}
            </p>
          ))}
          <p className={styles.para}>
            <a className="link" href={security.link.href}>
              {security.link.label}
            </a>
          </p>
        </article>
      </div>
    </section>
  );
}

/** Closing panel, in the start page's dark accent. */
export function MethodClose({ copy: c }: { copy: typeof copy.close }) {
  return (
    <section className={cx('section', styles.closeSection)} aria-labelledby="close-title">
      <div className="wrap">
        <div className={styles.close} data-rise="">
          <div>
            <h2 id="close-title" className="title">
              {c.title}
            </h2>
            <p>{c.body}</p>
          </div>
          <div className={styles.closeActions}>
            <Button href={c.cta.href} arrow>
              {c.cta.label}
            </Button>
            <Button href={c.secondary.href} variant="ghost">
              {c.secondary.label}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
