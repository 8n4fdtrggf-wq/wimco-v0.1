// Typer för packages.js, så att Next.js-sidan (web/) kan importera samma paket som API:t.
export interface A11yPackage {
  id: string;
  name: string;
  price: string;
  priceNote: string;
  summary: string;
  includes: string[];
  delivery: string;
  recommended?: boolean;
}
export const PACKAGES: Record<'granskning' | 'atgard' | 'bevakning', A11yPackage>;
export const PACKAGE_IDS: string[];
export const SHOP_PLATFORMS: Record<string, string>;
export const COMPANY_SIZES: Record<string, string>;
