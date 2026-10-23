import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { meta } from '@/content/site';
// Self-hosted fonts: the site's CSP only allows fonts from its own origin.
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(meta.siteUrl),
  title: meta.title,
  description: meta.description,
  alternates: { canonical: '/' },
  icons: { icon: '/assets/favicon.svg' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: meta.siteName,
    locale: meta.locale,
    title: meta.ogTitle,
    description: meta.ogDescription,
    images: [{ url: meta.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: meta.ogTitle,
    description: meta.ogDescription,
    images: [meta.ogImage],
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  colorScheme: 'light',
  themeColor: meta.themeColor,
};

/** Adds `js` before first paint; CSS uses it to prepare reveals only when JS runs. Hashed into the CSP by scripts/publish.mjs. */
const JS_FLAG = "document.documentElement.classList.add('js')";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: JS_FLAG }} />
        {/* Shared with every page on wimco.se: consent, Google Analytics, Turnstile, /api/config. */}
        <script type="module" src="/assets/js/site.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
