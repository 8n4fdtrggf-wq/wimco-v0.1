'use client';

import { useEffect, useRef, useState } from 'react';
import type { NavContent } from '@/content/types';
import { ScoreRing } from '@/components/score/ScoreRing';
import { gsap, ScrollTrigger, useGSAP, MQ } from '@/lib/gsap';
import { cx, format } from '@/lib/css';
import { paintRing, subscribe, total } from '@/lib/score';
import styles from './SiteNav.module.css';

/**
 * The bar. Wordmark, section links with the active one marked, and the score dock:
 * the hero's instrument in miniature. It appears once the hero ring has scrolled away,
 * follows the score as sections publish it (lib/score.ts), and in the closing section
 * turns into "Din sajt?", the hand-over to the visitor's own analysis.
 */
export function SiteNav({ content, home = true }: { content: NavContent; home?: boolean }) {
  // On other pages, section links point back to the start page and the score dock is left out.
  const href = (h: string) => (!home && h.startsWith('#') ? `/${h}` : h);
  const root = useRef<HTMLElement>(null);
  const dock = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);

  // Dock: repaint on every published score. Writes to the DOM directly; no React render per frame.
  useEffect(() => {
    const el = dock.current;
    if (!el) return;
    const ring = el.querySelector('[data-ring]');
    const num = el.querySelector<HTMLElement>('[data-dock-num]');
    const sub = el.querySelector<HTMLElement>('[data-dock-sub]');
    return subscribe((scores) => {
      paintRing(ring, scores);
      const handover = scores === null;
      el.dataset.handover = handover ? 'true' : 'false';
      if (num) num.textContent = handover ? content.dock.handover : String(total(scores));
      if (sub) sub.textContent = handover ? '' : content.dock.example;
      el.setAttribute(
        'aria-label',
        handover ? content.dock.handoverLabel : format(content.dock.label, { score: total(scores) }),
      );
    });
  }, [content.dock]);

  useGSAP(
    () => {
      // Dock shows once the hero instrument is out of view.
      const heroRing = document.getElementById('hero-ring');
      if (heroRing) ScrollTrigger.create({
        trigger: heroRing,
        start: 'bottom top+=64',
        onEnter: () => root.current?.setAttribute('data-dock', 'on'),
        onLeaveBack: () => root.current?.removeAttribute('data-dock'),
      });

      // Active section in the links. Measured from live rects on scroll rather than per-section
      // triggers, so it stays right whatever pinning further down does to the layout.
      const links = gsap.utils.toArray<HTMLAnchorElement>('[data-section-link]', root.current);
      const tracked = links
        .map((a) => ({ a, el: document.getElementById(a.dataset.sectionLink ?? '') }))
        .filter((t): t is { a: HTMLAnchorElement; el: HTMLElement } => !!t.el);
      let activeId = '';
      const mark = () => {
        const line = window.innerHeight * 0.45;
        let next = '';
        for (const { el } of tracked) {
          const r = el.getBoundingClientRect();
          if (r.top <= line && r.bottom > line) next = el.id;
        }
        if (next === activeId) return;
        activeId = next;
        tracked.forEach(({ a, el }) => (el.id === next ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
      };
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: mark, onRefresh: mark });

      // Reading progress: a hairline under the bar, scrubbed by the whole page.
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.fromTo(
          '[data-progress]',
          { scaleX: 0 },
          { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } },
        );
      });
    },
    { scope: root },
  );

  // Close the mobile menu on Escape or when a link inside it is used.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header ref={root} className={styles.nav} data-open={open || undefined}>
      <div className={cx('wrap', styles.inner)}>
        <a className={styles.logo} href={home ? '#top' : '/'} aria-label={home ? content.homeLabel : content.homePageLabel}>
          Wimco<i>.</i>
        </a>

        <nav aria-label={content.label} className={styles.links}>
          {content.links.map((l) => (
            <a
              key={l.href}
              href={href(l.href)}
              data-section-link={home ? l.id : undefined}
              aria-current={!home && l.page ? 'page' : undefined}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className={styles.right}>
          {home && (
            <a ref={dock} className={styles.dock} href="#din-sajt" data-handover="false">
              <ScoreRing size="sm" label="" className={styles.dockRing} />
              <span className={styles.dockText} aria-hidden="true">
                <b data-dock-num="">0</b>
                <small data-dock-sub="">{content.dock.example}</small>
              </span>
            </a>
          )}
          <a className={styles.cta} href={href(content.cta.href)}>
            {content.cta.label}
          </a>
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="mobilmeny"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? content.menu.close : content.menu.open}
          </button>
        </div>
      </div>

      <div id="mobilmeny" className={styles.sheet} hidden={!open}>
        <nav aria-label={content.label} className="wrap">
          {content.links.map((l) => (
            <a key={l.href} href={href(l.href)} onClick={() => setOpen(false)} aria-current={!home && l.page ? 'page' : undefined}>
              {l.label}
            </a>
          ))}
          <a className={styles.sheetCta} href={href(content.cta.href)} onClick={() => setOpen(false)}>
            {content.cta.label}
          </a>
        </nav>
      </div>

      <span className={styles.progress} aria-hidden="true">
        <i data-progress="" />
      </span>
    </header>
  );
}
