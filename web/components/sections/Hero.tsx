'use client';

import { useRef } from 'react';
import type { AnalyseContent, HeroContent, Station } from '@/content/types';
import { AnalysisForm } from '@/components/interactive/AnalysisForm';
import { ScoreRing } from '@/components/score/ScoreRing';
import { gsap, MQ, useGSAP } from '@/lib/gsap';
import { cx, format, vars } from '@/lib/css';
import { band, hasPublished, paintRing, publish, total } from '@/lib/score';
import styles from './Hero.module.css';

interface Props {
  content: HeroContent;
  stations: Station[];
  analyse: AnalyseContent;
}

/**
 * The surface, already running. Left: the real Wimco Score input. Right: the instrument,
 * finishing a labelled example scan in three planes (ghost of the example site behind,
 * the score card, findings in front) that separate with the pointer and with scroll.
 */
export function Hero({ content, stations, analyse }: Props) {
  const root = useRef<HTMLElement>(null);
  const before = stations.map((s) => s.before);
  const finalTotal = total(before);
  const ex = content.example;

  useGSAP(
    () => {
      const ring = root.current!.querySelector('#hero-ring');
      const status = root.current!.querySelector<HTMLElement>('[data-status]');
      const rows = gsap.utils.toArray<HTMLElement>('[data-row]');
      const finish = () => {
        paintRing(ring, before);
        rows.forEach((r) => r.setAttribute('data-done', ''));
        if (status) status.textContent = ex.done;
        // A visitor who scrolled straight past the scan may already be in the repair; leave its score alone.
        if (!hasPublished()) publish(before);
      };

      const mm = gsap.matchMedia();

      mm.add(MQ.reduce, () => {
        finish();
      });

      mm.add(MQ.motion, () => {
        // 1. Arrival: copy settles, planes come in at different depths.
        const intro = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.1 } });
        intro
          .from('[data-copy] > *', { y: 26, opacity: 0, stagger: 0.08 })
          .from('[data-plane="back"]', { y: 40, opacity: 0, duration: 1.4 }, 0.1)
          .from('[data-plane="mid"]', { y: 60, opacity: 0, scale: 0.96, duration: 1.2 }, 0.2)
          .from('[data-plane="front"] > *', { y: 30, opacity: 0, stagger: 0.12 }, 0.9);

        // 2. The example scan: one row at a time, its arc fills, the total counts up.
        const live = before.map(() => 0);
        rows.forEach((r) => r.removeAttribute('data-done'));
        paintRing(ring, live);
        const scan = gsap.timeline({ delay: 0.55, onComplete: finish });
        if (status) status.textContent = format(ex.running, { host: ex.host });
        rows.forEach((row, i) => {
          const proxy = { v: 0 };
          scan
            .add(() => row.setAttribute('data-running', ''))
            .to(proxy, {
              v: before[i],
              duration: 0.55,
              ease: 'power2.out',
              onUpdate: () => {
                live[i] = proxy.v;
                paintRing(ring, live);
              },
            })
            .add(() => {
              row.removeAttribute('data-running');
              row.setAttribute('data-done', '');
            })
            .to({}, { duration: 0.08 });
        });

        // 3. Scroll: the copy lifts away first, the planes separate (front fastest).
        gsap
          .timeline({
            scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.4 },
            defaults: { ease: 'none' },
          })
          .to('[data-copy]', { y: -60, opacity: 0.15 }, 0)
          .to('[data-plane="back"]', { y: 30 }, 0)
          .to('[data-plane="mid"]', { y: -40, scale: 0.94 }, 0)
          .to('[data-plane="front"]', { y: -140 }, 0);

        return () => scan.kill();
      });

      // 4. Pointer depth on fine pointers: each plane follows by its own amount.
      mm.add(`${MQ.motion} and ${MQ.fine} and ${MQ.wide}`, () => {
        const stage = root.current!.querySelector<HTMLElement>('[data-stage]')!;
        const planes = [
          { el: '[data-plane="back"]', d: -10 },
          { el: '[data-plane="mid"]', d: 8 },
          { el: '[data-plane="front"]', d: 22 },
        ].map(({ el, d }) => ({
          x: gsap.quickTo(el, 'xPercent', { duration: 0.9, ease: 'power3.out' }),
          r: gsap.quickTo(el, 'rotation', { duration: 1.1, ease: 'power3.out' }),
          d,
        }));
        const onMove = (e: PointerEvent) => {
          const nx = e.clientX / window.innerWidth - 0.5;
          planes.forEach((p) => {
            p.x(nx * p.d * 0.3);
            p.r(nx * p.d * 0.04);
          });
        };
        const onLeave = () => planes.forEach((p) => (p.x(0), p.r(0)));
        const doc = stage.ownerDocument.documentElement;
        window.addEventListener('pointermove', onMove);
        doc.addEventListener('mouseleave', onLeave);
        return () => {
          window.removeEventListener('pointermove', onMove);
          doc.removeEventListener('mouseleave', onLeave);
        };
      });
    },
    { scope: root },
  );

  return (
    <section id="top" ref={root} className={styles.hero} aria-labelledby="hero-title">
      <div className={cx('wrap', styles.grid)}>
        <div className={styles.copy} data-copy="">
          <h1 id="hero-title" className={styles.title}>
            {content.title}
          </h1>
          <p className={styles.lede}>{content.lede}</p>
          <div id="analys" className={styles.form}>
            <AnalysisForm content={analyse} />
          </div>
          <ul className={styles.proof}>
            {content.proof.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <div className={styles.stage} data-stage="">
          {/* Back plane: the example site, out of focus behind the instrument */}
          <div className={styles.ghost} data-plane="back" aria-hidden="true">
            <div className={styles.ghostBar}>
              <i />
              <i />
              <i />
              <span>{ex.host}</span>
            </div>
            <div className={styles.ghostPage}>
              <span className={styles.ghostImg} />
              <span className={styles.ghostHead}>{ex.siteHeadline}</span>
              <span className={styles.ghostLine} />
              <span className={styles.ghostLine} />
            </div>
          </div>

          {/* Mid plane: the score card */}
          <div className={styles.card} data-plane="mid">
            <div className={styles.cardHead}>
              <span className="tag">{ex.tag}</span>
              <span className={styles.host}>{ex.host}</span>
            </div>
            <ScoreRing
              id="hero-ring"
              label={format(ex.ringLabel, { score: finalTotal })}
              caption={ex.caption}
              scores={before}
              className={styles.ring}
            />
            <p className={styles.status} data-status="" aria-hidden="true">
              {ex.done}
            </p>
            <ol className={styles.rows}>
              {stations.map((s, i) => (
                <li key={s.name} data-row="" data-done="" data-band={band(s.before)} style={vars({ i })}>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.rowName}>
                    {s.name}
                    <small>{ex.log[i]}</small>
                  </span>
                  <b className={styles.rowScore}>{s.before}</b>
                </li>
              ))}
            </ol>
          </div>

          {/* Front plane: three findings that float off the card */}
          <div className={styles.front} data-plane="front" aria-hidden="true">
            {ex.chips.map((c, i) => (
              <span key={c} className={styles.chip} style={vars({ i })}>
                <i />
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
