import type { Metadata } from 'next';
import * as site from '@/content/site';
import * as score from '@/content/score';
import { SiteNav } from '@/components/nav/SiteNav';
import { Motion } from '@/components/motion/Motion';
import { Stations } from '@/components/sections/Stations';
import { MethodHero, Sources, Calculation, Priority, SmallPrint, MethodClose } from '@/components/score/ScoreMethod';
import { Footer } from '@/components/sections/Footer';
import { ConsentBanner } from '@/components/sections/ConsentBanner';

export const metadata: Metadata = {
  title: score.meta.title,
  description: score.meta.description,
  alternates: { canonical: '/wimco-score/' },
  openGraph: {
    type: 'website',
    url: '/wimco-score/',
    siteName: site.meta.siteName,
    locale: site.meta.locale,
    title: score.meta.ogTitle,
    description: score.meta.ogDescription,
    images: [{ url: site.meta.ogImage, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title: score.meta.ogTitle, description: score.meta.ogDescription, images: [site.meta.ogImage] },
};

/** The tool itself, as a free web application offered by the business on the start page (`#org`). */
function StructuredData() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Wimco Score',
    url: `${site.meta.siteUrl}/wimco-score/`,
    description: score.hero.lede,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Webbläsare',
    inLanguage: 'sv-SE',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'SEK' },
    provider: { '@type': 'ProfessionalService', '@id': `${site.meta.siteUrl}/#org`, name: site.meta.siteName, url: `${site.meta.siteUrl}/` },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

/**
 * /wimco-score/: what the score measures, where each number comes from, how it is weighted
 * and prioritised, and its limits. The analysis itself runs on the start page.
 */
export default function Page() {
  return (
    <>
      <StructuredData />
      <a className="skip" href="#main">
        {site.nav.skip}
      </a>
      <SiteNav content={site.nav} home={false} current="score" />
      <main id="main">
        <MethodHero copy={score.hero} scores={site.stations.map((s) => s.after)} />
        <Sources copy={score.sources} />
        <Stations content={score.stationsSection} stations={site.stations} />
        <Calculation copy={score.calculation} />
        <Priority copy={score.priority} />
        <SmallPrint limits={score.limits} security={score.security} />
        <MethodClose copy={score.close} />
      </main>
      <Footer content={site.footer} logoHref="/" />
      <ConsentBanner content={site.consent} />
      <Motion />
    </>
  );
}
