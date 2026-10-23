import type { Metadata } from 'next';
import * as site from '@/content/site';
import * as a11y from '@/content/tillganglighet';
import { PACKAGES, SHOP_PLATFORMS, COMPANY_SIZES } from '../../../lib/a11y/packages.js';
import { SiteNav } from '@/components/nav/SiteNav';
import { Motion } from '@/components/motion/Motion';
import { Faq } from '@/components/sections/Faq';
import { Footer } from '@/components/sections/Footer';
import { ConsentBanner } from '@/components/sections/ConsentBanner';
import { A11yCheck } from '@/components/a11y/A11yCheck';
import { Law, Packages, Process, Order } from '@/components/a11y/A11ySections';

export const metadata: Metadata = {
  title: a11y.meta.title,
  description: a11y.meta.description,
  alternates: { canonical: '/tillganglighet/' },
  openGraph: {
    type: 'website',
    url: '/tillganglighet/',
    siteName: site.meta.siteName,
    locale: site.meta.locale,
    title: a11y.meta.ogTitle,
    description: a11y.meta.ogDescription,
    images: [{ url: site.meta.ogImage, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title: a11y.meta.ogTitle, description: a11y.meta.ogDescription, images: [site.meta.ogImage] },
};

function StructuredData() {
  const packages = Object.values(PACKAGES);
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Tillgänglighet för e-handel',
      serviceType: 'Tillgänglighetsgranskning och åtgärd enligt WCAG 2.1 AA',
      areaServed: 'SE',
      url: `${site.meta.siteUrl}/tillganglighet/`,
      provider: { '@type': 'ProfessionalService', name: site.meta.siteName, url: `${site.meta.siteUrl}/` },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Tillgänglighetspaket',
        itemListElement: packages.map((p) => {
          const amount = Number(p.price.replace(/\D/g, ''));
          return {
            '@type': 'Offer',
            name: p.name,
            description: p.summary,
            priceSpecification: {
              '@type': 'PriceSpecification',
              priceCurrency: 'SEK',
              valueAddedTaxIncluded: false,
              ...(p.price.startsWith('från') ? { minPrice: amount } : { price: amount }),
            },
          };
        }),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: a11y.faq.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

/**
 * /tillganglighet/: test the three page types PTS reviews for free, see what to fix,
 * and order a review, a fix or monitoring at a fixed price.
 */
export default function Page() {
  const packages = Object.values(PACKAGES);
  return (
    <>
      <StructuredData />
      <a className="skip" href="#main">
        {site.nav.skip}
      </a>
      <SiteNav content={site.nav} home={false} />
      <main id="main">
        <A11yCheck hero={a11y.hero} copy={a11y.check} text={a11y.result} />
        <Law copy={a11y.law} />
        <Packages copy={a11y.packages} packages={packages} />
        <Process copy={a11y.process} />
        <Order copy={a11y.order} packages={packages} platforms={SHOP_PLATFORMS} sizes={COMPANY_SIZES} />
        <Faq content={a11y.faq} />
      </main>
      <Footer content={site.footer} logoHref="/" />
      <ConsentBanner content={site.consent} />
      <Motion />
    </>
  );
}
