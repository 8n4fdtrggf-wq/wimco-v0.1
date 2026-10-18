'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Spring, type SpringConfig } from './spring';

export const QUERIES = {
  /** Layout where sections pin and scrub with scroll. Below it, they stack and use native gestures. */
  pin: '(min-width: 961px) and (min-height: 640px)',
  finePointer: '(hover: hover) and (pointer: fine)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const;

/** Subscribe to a media query. Returns `serverValue` during SSR and the first hydration pass. */
export function useMediaQuery(query: string, serverValue = false) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export const useReducedMotion = () => useMediaQuery(QUERIES.reducedMotion);

/** A Spring owned by a component. `onUpdate` always sees the latest closure; the spring stops on unmount. */
export function useSpring(initial: number, config: SpringConfig, onUpdate: (value: number) => void) {
  const callback = useRef(onUpdate);
  useEffect(() => {
    callback.current = onUpdate;
  });
  const [spring] = useState(() => new Spring(initial, config, (v) => callback.current(v)));
  useEffect(() => () => spring.stop(), [spring]);
  return spring;
}

/** True once the element has entered the viewport; never flips back. */
export function useInViewOnce<T extends Element>(options: IntersectionObserverInit = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const { root, rootMargin, threshold } = options;
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { root, rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, root, rootMargin, threshold]);
  return [ref, inView] as const;
}

/** The id of the section that currently crosses the middle of the viewport. */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(',');
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    key.split(',').forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [key]);
  return active;
}
