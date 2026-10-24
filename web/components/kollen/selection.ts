'use client';

import { useEffect, useState } from 'react';
import type { KollenPackage } from '../../../lib/kollen/catalog.js';

/**
 * The packages picked on /e-handelskollen/, shared by the result, the package cards and the order form.
 * Module state plus a window event, so the three client components stay in step without a provider.
 */
const EVENT = 'wimco:kollen-selection';
let current: string[] = [];

export function setSelection(ids: string[]) {
  current = [...new Set(ids)];
  window.dispatchEvent(new CustomEvent(EVENT, { detail: current }));
}

export function toggleSelection(id: string, on?: boolean) {
  const want = on ?? !current.includes(id);
  setSelection(want ? [...current, id] : current.filter((x) => x !== id));
}

export function useSelection() {
  const [sel, setSel] = useState<string[]>(current);
  useEffect(() => {
    const on = (e: Event) => setSel((e as CustomEvent<string[]>).detail);
    window.addEventListener(EVENT, on);
    setSel(current);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return sel;
}

/** The latest result, announced to the order form. */
export const RESULT_EVENT = 'wimco:kollen-result';

const fmt = (n: number) => `${n.toLocaleString('sv-SE').replace(/ /g, ' ')} kr`;

/** "17 800 kr + 1 990 kr/mån"; "från …" when a package has a starting price. Same rule as kollenTotal() in lib/leads.js. */
export function totalFor(ids: string[], packages: Record<string, KollenPackage>) {
  const pkgs = ids.map((id) => packages[id]).filter(Boolean);
  const once = pkgs.filter((p) => !p.monthly);
  const monthly = pkgs.filter((p) => p.monthly);
  const parts: string[] = [];
  if (once.length) parts.push(`${once.some((p) => p.from) ? 'från ' : ''}${fmt(once.reduce((s, p) => s + p.amount, 0))}`);
  if (monthly.length) parts.push(`${fmt(monthly.reduce((s, p) => s + p.amount, 0))}/mån`);
  return parts.join(' + ');
}
