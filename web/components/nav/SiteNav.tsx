'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NavContent } from '@/content/types';
import { Button } from '@/components/ui/Button';
import { LineBadge } from '@/components/ui/LineBadge';
import { clamp, setStyle, useActiveSection, useScrollFrame } from '@/lib/motion';
import styles from './SiteNav.module.css';

/**
 * Translucent sticky nav.
 * - The active-section pill slides between links (spatial feedback for "where am I").
 * - A 2px line under the bar fills with page progress, in the four line colours.
 * - Below 900px the links move into a menu that scales from its trigger (top right).
 */
export function SiteNav({ content }: { content: NavContent }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const sectionIds = content.links.flatMap((l) => (l.id ? [l.id] : []));
  const active = useActiveSection(['top', 'manifest', ...sectionIds, 'optimering', 'starta']);

  const linksRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const movePill = useCallback(() => {
    const nav = linksRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const link = nav.querySelector<HTMLAnchorElement>(`a[data-sec="${active}"]`);
    if (!link) {
      pill.removeAttribute('data-on');
      return;
    }
    pill.style.width = `${link.offsetWidth}px`;
    pill.style.transform = `translateX(${link.offsetLeft}px)`;
    pill.setAttribute('data-on', '');
  }, [active]);

  useEffect(() => {
    movePill();
    window.addEventListener('resize', movePill);
    document.fonts?.ready.then(movePill);
    return () => window.removeEventListener('resize', movePill);
  }, [movePill]);

  // Let the pill take its first position without sliding in from 0.
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  useScrollFrame(
    () => {},
    (ctx) => {
      const p = clamp(ctx.scrollY / Math.max(1, ctx.docHeight - ctx.vh));
      setStyle(progressRef.current, 'transform', `scaleX(${p.toFixed(4)})`);
    },
  );

  // Menu: Escape closes and returns focus; tapping outside closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <header className={styles.nav}>
      <div className={`wrap ${styles.inner}`}>
        <a className={styles.logo} href="#top" aria-label={content.homeLabel}>
          Wimco<i>.</i>
        </a>
        <nav ref={linksRef} className={styles.links} aria-label={content.label} data-ready={ready ? '' : undefined}>
          <span ref={pillRef} className={styles.pill} aria-hidden="true" />
          {content.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              data-sec={l.id}
              aria-current={l.id && active === l.id ? 'true' : undefined}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <Button href={content.cta.href} size="sm" className={styles.cta}>
          {content.cta.label}
        </Button>

        <button
          ref={buttonRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls="site-menu"
          data-open={open ? '' : undefined}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={styles.labelOpen}>{content.menu.open}</span>
          <span className={styles.labelClose} aria-hidden="true">
            {content.menu.close}
          </span>
        </button>

        <div
          id="site-menu"
          ref={menuRef}
          className={styles.menu}
          data-open={open ? '' : undefined}
          inert={!open}
          onClick={(e) => {
            if ((e.target as Element).closest('a')) setOpen(false);
          }}
        >
          {content.links.map((l) => (
            <a key={l.href} className={styles.menuItem} href={l.href}>
              <LineBadge line={l.line} />
              {l.label}
            </a>
          ))}
          <Button href={content.cta.href} block className={styles.menuCta}>
            {content.cta.label}
          </Button>
        </div>
      </div>
      <div className={styles.progress} aria-hidden="true">
        <i ref={progressRef} />
      </div>
    </header>
  );
}
