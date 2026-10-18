import { prefersReducedMotion } from './spring';

/**
 * Error feedback: one short horizontal shake on the field that needs attention.
 * WAAPI, transform only, 320ms with a strong ease-out. Skipped under reduced motion
 * (the inline message still explains the error).
 */
export function shake(el: Element | null | undefined) {
  if (!el || prefersReducedMotion()) return;
  el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  );
}
