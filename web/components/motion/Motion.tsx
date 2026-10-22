'use client';

import { gsap, MQ, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { NAV_HEIGHT } from '@/lib/css';

/**
 * Page-wide motion that belongs to no single section:
 * - [data-rise] elements settle in as they arrive, batched so neighbours stagger together.
 * - In-page links glide with ScrollToPlugin (instant under reduced motion), then move focus.
 * - ScrollTrigger re-measures once the web fonts have loaded.
 * Renders nothing.
 */
export function Motion() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MQ.motion, () => {
      ScrollTrigger.batch('[data-rise]', {
        start: 'top 88%',
        once: true,
        onEnter: (els) =>
          gsap.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'expo.out', overwrite: true }),
      });
    });

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const id = a.getAttribute('href')!.slice(1);
      const target = id ? document.getElementById(id) : document.body;
      if (!target) return;
      e.preventDefault();
      const reduce = window.matchMedia(MQ.reduce).matches;
      const focus = () => {
        const input = target.querySelector<HTMLElement>('input[type="url"]');
        (input && id.startsWith('din') ? input : target).focus({ preventScroll: true });
        history.replaceState(null, '', id ? `#${id}` : '#');
      };
      if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) {
        target.setAttribute('tabindex', '-1');
      }
      gsap.to(window, {
        duration: reduce ? 0 : 1.1,
        ease: 'power3.inOut',
        scrollTo: { y: id ? target : 0, offsetY: NAV_HEIGHT + 16, autoKill: true },
        onComplete: focus,
      });
    };
    document.addEventListener('click', onClick);

    let alive = true;
    document.fonts?.ready.then(() => alive && ScrollTrigger.refresh());

    return () => {
      alive = false;
      document.removeEventListener('click', onClick);
      mm.revert();
    };
  });
  return null;
}
