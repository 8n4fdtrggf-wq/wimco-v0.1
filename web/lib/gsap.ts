'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { useGSAP } from '@gsap/react';

/** Registered once, client side only. Every animated component imports from here. */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollToPlugin);
  gsap.defaults({ ease: 'power3.out', duration: 0.7 });
}

/** Media conditions shared by every gsap.matchMedia() on the page. */
export const MQ = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
  wide: '(min-width: 900px)',
  fine: '(hover: hover) and (pointer: fine)',
} as const;

export { gsap, ScrollTrigger, useGSAP };
