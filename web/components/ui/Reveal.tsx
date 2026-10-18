'use client';

import { createElement, type CSSProperties, type ReactNode } from 'react';
import { useInViewOnce } from '@/lib/motion';

interface Props {
  children: ReactNode;
  /**
   * heading: the eyebrow segment draws and the .title settles up.
   * stagger: direct children settle in order (give each child a --i).
   * The behaviour lives in globals.css under [data-reveal]; content is never hidden.
   */
  variant?: 'heading' | 'stagger';
  as?: 'div' | 'ul' | 'ol' | 'header';
  className?: string;
  style?: CSSProperties;
  id?: string;
}

export function Reveal({ children, variant = 'heading', as = 'div', className, style, id }: Props) {
  const [ref, inView] = useInViewOnce<HTMLElement>({ rootMargin: '0px 0px -12% 0px' });
  return createElement(
    as,
    { ref, id, className, style, 'data-reveal': variant, 'data-in': inView ? '' : undefined },
    children,
  );
}
