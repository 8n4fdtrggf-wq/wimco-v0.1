'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { clearStyle, easeOutCubic, enterProgress, setStyle, useReducedMotion, useScrollFrame } from '@/lib/motion';

interface Props {
  children: ReactNode;
  className?: string;
  /** Starting scale while the element is below the fold. */
  from?: number;
  /** Fraction of the viewport over which it settles to 1. */
  distance?: number;
}

/**
 * Section transition primitive: a surface settles from slightly smaller to full size as it
 * arrives, scrubbed by scroll. Transform only; off under reduced motion.
 */
export function EnterScale({ children, className, from = 0.94, distance = 0.7 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rect = useRef<DOMRect | null>(null);
  const reduce = useReducedMotion();

  useScrollFrame(
    () => {
      rect.current = ref.current?.getBoundingClientRect() ?? null;
    },
    (ctx) => {
      if (!rect.current) return;
      const p = easeOutCubic(enterProgress(rect.current, ctx.vh, 1, distance));
      setStyle(ref.current, 'transform', `scale(${(from + (1 - from) * p).toFixed(4)})`);
    },
    !reduce,
  );

  useEffect(() => {
    if (reduce) clearStyle(ref.current, 'transform');
  }, [reduce]);

  return (
    <div ref={ref} className={className} style={{ transformOrigin: '50% 0', willChange: 'transform' }}>
      {children}
    </div>
  );
}
