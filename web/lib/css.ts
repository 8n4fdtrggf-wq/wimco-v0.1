import type { CSSProperties } from 'react';

/** Build an inline style object of CSS custom properties: vars({ i: 2, c: 'red' }) → { '--i': 2, '--c': 'red' }. */
export function vars(values: Record<string, string | number>, extra?: CSSProperties): CSSProperties {
  const out: Record<string, string | number> = {};
  for (const key in values) out[`--${key}`] = values[key];
  return { ...(out as CSSProperties), ...extra };
}

/** Join class names, skipping falsy values. */
export function cx(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(' ');
}

/** Replace {key} placeholders in a content string. */
export function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));
}

/** Keep in sync with --nav-h in globals.css. */
export const NAV_HEIGHT = 64;
