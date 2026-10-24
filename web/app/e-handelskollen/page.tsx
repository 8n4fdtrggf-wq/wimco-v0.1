import type { Metadata } from 'next';
import * as site from '@/content/site';
import * as kollen from '@/content/kollen';
import { AREAS, KOLLEN_PACKAGES, DISCLAIMER } from '../../../lib/kollen/catalog.js';
import { SiteNav } from '@/components/nav/SiteNav';
import { Motion } from '@/components/motion/Motion';
import { Faq } from '@/components/sections/Faq';
import { Footer } from '@/components/sections/Footer';
import { ConsentBanner } from '@/components/sections/ConsentBanner';
import { Process } from '@/components/a11y/A11ySections';
import { KollenCheck } from '@/components/kollen/KollenCheck';
import { Laws, Packages, Order } from '@/components/kollen/KollenSections';

export const metadata: Metadata = {
  title: kollen.meta.title,
  description: kollen.meta.description,
  alternates: { canonical: '/e-handelskollen/' },
  openGraph: {
    type: 'website',
    url: '/e-handelskollen/',
    siteName: site.meta.siteName,
    locale: site.meta.locale,
    title: kollen.meta.ogTitle,
    description: kollen.meta.ogDescription,
    images: [{ url: site.meta.ogImage, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title: kollen.meta.ogTitle, description: kollen.meta.ogDescription, images: [site.meta.ogImage] },
};

function StructuredData() {
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'E-handelskollen',
      serviceType: 'Kontroll och åtgärd av lagkrav för nätbutiker',
      areaServed: 'SE',
      url: `${site.meta.siteUrl}/e-handelskollen/`,
      provider: { '@type': 'ProfessionalService', name: site.meta.siteName, url: `${site.meta.siteUrl}/` },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Åtgärder och bevakning',
        itemListElement: Object.values(KOLLEN_PACKAGES).map((p) => ({
          '@type': 'Offer',
          name: p.name,
          description: p.summary,
          priceSpecification: {
            '@type': p.monthly ? 'UnitPriceSpecification' : 'PriceSpecification',
            priceCurrency: 'SEK',
            valueAddedTaxIncluded: false,
            ...(p.from ? { minPrice: p.amount } : { price: p.amount }),
            ...(p.monthly ? { unitCode: 'MON' } : {}),
          },
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: kollen.faq.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

/**
 * /e-handelskollen/: five legal requirements for Swedish online shops in one free check, red and green,
 * a fixed-price fix for every red area, and monthly monitoring.
 */
export default function Page() {
  return (
    <>
      <StructuredData />
      <a className="skip" href="#main">
        {site.nav.skip}
      </a>
      <SiteNav content={site.nav} home={false} current="kollen" />
      <main id="main">
        <KollenCheck hero={kollen.hero} copy={kollen.check} text={kollen.result} areas={AREAS} packages={KOLLEN_PACKAGES} disclaimer={DISCLAIMER} />
        <Laws copy={kollen.laws} areas={AREAS} />
        <Packages copy={kollen.packages} packages={KOLLEN_PACKAGES} />
        <Process copy={kollen.process} />
        <Order copy={kollen.order} packages={KOLLEN_PACKAGES} />
        <Faq content={kollen.faq} />
      </main>
      <Footer content={site.footer} logoHref="/" />
      <ConsentBanner content={site.consent} />
      <Motion />
    </>
  );
}
