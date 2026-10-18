/**
 * Write a style only when it changed. Scroll-driven writes happen every frame; skipping
 * identical values keeps the browser from invalidating anything it doesn't need to.
 */

type Styled = HTMLElement | SVGElement;
const cache = new WeakMap<Styled, Map<string, string>>();

export function setStyle(el: Styled | null | undefined, prop: string, value: string) {
  if (!el) return;
  let map = cache.get(el);
  if (!map) {
    map = new Map();
    cache.set(el, map);
  }
  if (map.get(prop) === value) return;
  map.set(prop, value);
  el.style.setProperty(prop, value);
}

export function clearStyle(el: Styled | null | undefined, ...props: string[]) {
  if (!el) return;
  const map = cache.get(el);
  props.forEach((p) => {
    el.style.removeProperty(p);
    map?.delete(p);
  });
}

/** Toggle a boolean data attribute without React re-rendering. */
export function setFlag(el: Element | null | undefined, name: string, on: boolean) {
  if (!el) return;
  if (on) el.setAttribute(name, '');
  else el.removeAttribute(name);
}
