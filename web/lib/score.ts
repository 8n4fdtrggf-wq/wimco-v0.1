/**
 * The page's score instrument.
 *
 * Weights are the real Wimco Score weights (lib/analysis/score.js in the repo root).
 * Category scores on this page belong to a made-up example company and are labelled as such
 * wherever they appear; the totals are computed here, never typed in.
 *
 * A tiny store carries "the score right now" between sections: the hero scan publishes the
 * example's first result, the repair section publishes every step as you scroll, and the
 * closing section hands the instrument over (null = "your site?"). The nav dock listens.
 */

export const WEIGHTS = [20, 15, 15, 20, 15, 15] as const;

export type Scores = readonly number[];

export function total(scores: Scores): number {
  let sum = 0;
  for (let i = 0; i < WEIGHTS.length; i++) sum += (WEIGHTS[i] * (scores[i] ?? 0)) / 100;
  return Math.round(sum);
}

export type Band = 'poor' | 'avg' | 'good';
export function band(score: number): Band {
  return score >= 90 ? 'good' : score >= 50 ? 'avg' : 'poor';
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/* ---------- ring geometry (one SVG shared by hero, repair stage and nav dock) ---------- */

export const RING = { size: 200, r: 84, stroke: 14, gap: 3 } as const;
export const CIRC = 2 * Math.PI * RING.r;

/** Start offset and usable length of each weighted segment, in px along the circle. */
export const SEGMENTS = (() => {
  const out: { start: number; len: number }[] = [];
  let acc = 0;
  for (const w of WEIGHTS) {
    const full = (w / 100) * CIRC;
    out.push({ start: acc + RING.gap / 2, len: full - RING.gap });
    acc += full;
  }
  return out;
})();

/**
 * Paint a ring imperatively: every [data-seg="i"] arc gets its length and band,
 * [data-total] gets the number. Called every scroll frame, so it touches attributes only.
 */
export function paintRing(root: Element | null, scores: Scores | null) {
  if (!root) return;
  const arcs = root.querySelectorAll<SVGCircleElement>('[data-seg]');
  arcs.forEach((arc) => {
    const i = Number(arc.dataset.seg);
    const seg = SEGMENTS[i];
    const s = scores ? scores[i] ?? 0 : 0;
    const len = Math.max(0.001, (seg.len * s) / 100);
    arc.setAttribute('stroke-dasharray', `${len.toFixed(2)} ${CIRC.toFixed(2)}`);
    arc.dataset.band = scores ? band(s) : 'none';
  });
  const num = root.querySelector<HTMLElement>('[data-total]');
  if (num) {
    const text = scores ? String(total(scores)) : '?';
    if (num.textContent !== text) num.textContent = text;
  }
}

/* ---------- store ---------- */

type Listener = (scores: Scores | null) => void;
let current: Scores | null = null;
const listeners = new Set<Listener>();

export function publish(scores: Scores | null) {
  current = scores;
  listeners.forEach((l) => l(scores));
}
export function subscribe(l: Listener) {
  listeners.add(l);
  l(current);
  return () => {
    listeners.delete(l);
  };
}
