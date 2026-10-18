import type { LineId } from '@/content/types';

export const LINE_ORDER: LineId[] = ['h', 'w', 'a', 'o'];

/** The CSS token for a transit line's colour. */
export const lineColor = (line: LineId) => `var(--line-${line})`;

/** A softer tint of a line colour, used where a line colour repeats. */
export const lineTint = (line: LineId) => `color-mix(in oklab, var(--line-${line}) 55%, var(--bg))`;
