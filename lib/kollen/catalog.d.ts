// Typer för catalog.js, så att Next.js-sidan (web/) kan importera samma områden och paket som API:t.
export type AreaId = 'tillganglighet' | 'angerknapp' | 'rabatter' | 'miljo' | 'sparning';
export interface KollenArea {
  id: AreaId;
  name: string;
  law: string;
  since: string;
  authority: string;
  checks: string;
  package: string;
}
export interface KollenPackage {
  id: string;
  area: AreaId | null;
  name: string;
  price: string;
  amount: number;
  from?: boolean;
  monthly?: boolean;
  summary: string;
  includes: string[];
}
export const AREAS: KollenArea[];
export const AREA_IDS: AreaId[];
export const KOLLEN_PACKAGES: Record<string, KollenPackage>;
export const KOLLEN_PACKAGE_IDS: string[];
export const DISCLAIMER: string;
