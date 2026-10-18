export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Progressive resistance past a boundary (iOS rubber-band). */
export const rubberband = (overshoot: number, dimension: number, constant = 0.55) =>
  (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

/** Where a flick would come to rest, using Apple's exponential-decay projection. Velocity in px/s. */
export const projectMomentum = (velocity: number, deceleration = 0.998) =>
  ((velocity / 1000) * deceleration) / (1 - deceleration);

export const nearest = (value: number, points: number[]) =>
  points.reduce((best, p) => (Math.abs(p - value) < Math.abs(best - value) ? p : best), points[0]);

/** 0 → 1 across a tall section whose inner element is sticky for `stickyHeight` px. */
export const pinProgress = (rect: DOMRect, stickyHeight: number) =>
  clamp(-rect.top / Math.max(1, rect.height - stickyHeight));

/** 0 → 1 as an element's top travels from `start` × viewport to (start − length) × viewport. */
export const enterProgress = (rect: DOMRect, vh: number, start = 1, length = 0.5) =>
  clamp((vh * start - rect.top) / (vh * length));
