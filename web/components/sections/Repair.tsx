'use client';

import { useRef } from 'react';
import type { RepairContent, Station } from '@/content/types';
import { ScoreRing } from '@/components/score/ScoreRing';
import { gsap, MQ, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { cx, vars } from '@/lib/css';
import { clamp01, lerp, paintRing, publish, total } from '@/lib/score';
import styles from './Repair.module.css';

interface Props {
  content: RepairContent;
  stations: Station[];
  serviceNames: Record<Station['service'], string>;
}

/** Scroll progress layout: a short lead-in, six equal steps, a short hold. */
const LEAD = 0.05;
const RUN = 0.88;
const STEPS = 6;
/** Progress at which `n` fixes are complete; also the snap points. */
const at = (n: number) => LEAD + (RUN * n) / STEPS;
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * The peak. A pinned stage: the example site on the left, the six findings and the score on the right.
 * Scroll is the repair: each step strikes a finding, applies its fix to the site, and moves its arc
 * from the example's "before" to "after". The totals are computed, not animated between two numbers.
 * Under reduced motion nothing is pinned: the section shows the finished repair with every
 * finding and fix side by side.
 */
export function Repair({ content, stations, serviceNames }: Props) {
  const root = useRef<HTMLElement>(null);
  const before = stations.map((s) => s.before);
  const after = stations.map((s) => s.after);
  const site = content.site;

  useGSAP(
    () => {
      const el = root.current!;
      const stage = el.querySelector<HTMLElement>('[data-stage]')!;
      const ring = el.querySelector('#repair-ring');
      const rows = gsap.utils.toArray<HTMLElement>('[data-fix]', el);
      const from = el.querySelector<HTMLElement>('[data-from]');
      const live = [...before];
      let lastFixed = -1;
      let lastCurrent = -1;

      const apply = (p: number) => {
        const k = clamp01((p - LEAD) / RUN) * STEPS;
        let fixed = 0;
        for (let i = 0; i < STEPS; i++) {
          const t = clamp01(k - i);
          live[i] = Math.round(lerp(before[i], after[i], smooth(t)));
          if (t >= 0.5) fixed = i + 1;
        }
        paintRing(ring, live);
        publish(live);

        const current = Math.min(STEPS - 1, fixed);
        if (fixed !== lastFixed || current !== lastCurrent) {
          for (let i = 0; i < STEPS; i++) el.toggleAttribute(`data-f${i}`, i < fixed);
          rows.forEach((r, i) => {
            r.dataset.state = i < fixed ? 'fixed' : i === current ? 'active' : 'pending';
            r.toggleAttribute('data-current', i === current);
          });
          el.dataset.fixed = String(fixed);
          lastFixed = fixed;
          lastCurrent = current;
        }
        if (from) from.textContent = String(total(before));
      };

      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        apply(0);
        const st = ScrollTrigger.create({
          trigger: stage,
          pin: true,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < 900 ? 3.6 : 4.4))}`,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          snap: {
            snapTo: Array.from({ length: STEPS + 1 }, (_, n) => at(n)).concat(1),
            duration: { min: 0.2, max: 0.6 },
            delay: 0.08,
            ease: 'power2.inOut',
          },
          onUpdate: (self) => apply(self.progress),
        });

        // The silence before it: the pause line holds still while the stage rises under it.
        gsap.from('[data-pause]', {
          opacity: 0,
          y: 24,
          duration: 1.2,
          ease: 'expo.out',
          scrollTrigger: { trigger: '[data-pause]', start: 'top 75%', once: true },
        });

        return () => st.kill();
      });

      mm.add(MQ.reduce, () => {
        el.dataset.static = 'true';
        apply(1);
        // The repair is already shown complete; the dock keeps the example's starting score until here.
        ScrollTrigger.create({
          trigger: stage,
          start: 'top 60%',
          onEnter: () => publish(after),
          onLeaveBack: () => publish(before),
        });
        return () => {
          delete el.dataset.static;
        };
      });
    },
    { scope: root },
  );

  return (
    <section id="atgarda" ref={root} className={styles.repair} aria-labelledby="atgarda-title">
      <div className={cx('wrap', styles.pause)}>
        <p data-pause="">{content.pause}</p>
      </div>

      <div className={styles.stage} data-stage="">
        <div className={cx('wrap', styles.grid)}>
          {/* ---------- Left: the example site ---------- */}
          <div className={styles.left}>
            <header className={styles.head}>
              <h2 id="atgarda-title" className={styles.title}>
                {content.title}
              </h2>
              <p className={styles.lede}>{content.lede}</p>
            </header>

            <div className={styles.browser} aria-hidden="true">
              <div className={styles.tabs}>
                <span className={styles.tab}>
                  <i className={styles.favicon} />
                  <span className={styles.swap}>
                    <span data-before="">{site.tabBefore}</span>
                    <span data-after="">{site.tabAfter}</span>
                  </span>
                </span>
              </div>
              <div className={styles.url}>
                <i className={styles.lock} />
                <span>{site.host}</span>
                <span className={styles.load}>
                  <i />
                </span>
              </div>

              <div className={styles.page}>
                <div className={styles.siteNav}>
                  <span className={styles.logo}>{site.company}</span>
                  <span className={cx(styles.swap, styles.navSwap)}>
                    <span data-before="" className={styles.navBefore}>
                      {site.navBefore.map((n) => (
                        <i key={n}>{n}</i>
                      ))}
                    </span>
                    <span data-after="" className={styles.navAfter}>
                      {site.navAfter.map((n) => (
                        <i key={n}>{n}</i>
                      ))}
                      <b>Boka</b>
                    </span>
                  </span>
                </div>

                <div className={styles.siteHero}>
                  <div className={styles.img}>
                    <span className={styles.imgHeavy}>
                      <em>{site.imageWeight}</em>
                    </span>
                    <span className={styles.imgLight} />
                  </div>
                  <div className={styles.siteCopy}>
                    <span className={cx(styles.swap, styles.h)}>
                      <span data-before="">{site.headlineBefore}</span>
                      <span data-after="">{site.headlineAfter}</span>
                    </span>
                    <span className={cx(styles.swap, styles.p)}>
                      <span data-before="">{site.bodyBefore}</span>
                      <span data-after="">{site.bodyAfter}</span>
                    </span>
                    <span className={styles.siteCta}>{site.cta} →</span>
                  </div>
                </div>

                <div className={styles.cookie}>
                  <span>{site.cookie}</span>
                  <b>{site.cookieButton}</b>
                </div>
                <div className={styles.toast}>
                  <i />
                  {site.toast}
                </div>
              </div>
            </div>
          </div>

          {/* ---------- Right: score and the six fixes ---------- */}
          <div className={styles.right}>
            <div className={styles.scoreRow}>
              <ScoreRing id="repair-ring" size="md" label={content.ringLabel} caption="av 100" scores={before} className={styles.ring} />
              <div className={styles.delta}>
                <span className="tag">{site.host}</span>
                <p>
                  <span data-from="">{total(before)}</span> → <b>{total(after)}</b>
                </p>
                <small>{content.note}</small>
              </div>
            </div>

            <ol className={styles.fixes}>
              {stations.map((s, i) => (
                <li
                  key={s.name}
                  data-fix=""
                  data-state={i === 0 ? 'active' : 'pending'}
                  data-current={i === 0 ? '' : undefined}
                  style={vars({ i })}
                >
                  <span className={styles.mark} aria-hidden="true" />
                  <div className={styles.fixBody}>
                    <div className={styles.fixHead}>
                      <b>{s.name}</b>
                      <span className={styles.score}>
                        {s.before} → {s.after}
                      </span>
                    </div>
                    <p className={styles.finding}>
                      <span className="sr-only">{content.findingLabel}: </span>
                      {s.finding}
                    </p>
                    <p className={styles.fix}>
                      <span className="sr-only">{content.fixLabel}: </span>
                      {s.fix}
                      <span className={styles.service}>
                        <span className="sr-only">{content.serviceLabel} </span>
                        {serviceNames[s.service]}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
