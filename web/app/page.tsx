import * as content from '@/content/site';
import { SiteNav } from '@/components/nav/SiteNav';
import { Motion } from '@/components/motion/Motion';
import { Hero } from '@/components/sections/Hero';
import { Stations } from '@/components/sections/Stations';
import { Repair } from '@/components/sections/Repair';
import { Automation } from '@/components/sections/Automation';
import { Build } from '@/components/sections/Build';
import { Work } from '@/components/sections/Work';
import { Kollen } from '@/components/sections/Kollen';
import { AREAS } from '../../lib/kollen/catalog.js';
import { Ownership } from '@/components/sections/Ownership';
import { About } from '@/components/sections/About';
import { Faq } from '@/components/sections/Faq';
import { Close } from '@/components/sections/Close';
import { Footer } from '@/components/sections/Footer';
import { ConsentBanner } from '@/components/sections/ConsentBanner';

/**
 * Structured data: the business and the site as one graph (other pages point to `#org`),
 * and the FAQ.
 */
function StructuredData() {
  const { meta, contact, faq } = content;
  const { company } = contact;
  const org = `${meta.siteUrl}/#org`;
  const data = [
    {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'ProfessionalService',
          '@id': org,
          name: meta.siteName,
          url: `${meta.siteUrl}/`,
          logo: `${meta.siteUrl}/assets/logo.png`,
          image: `${meta.siteUrl}${meta.ogImage}`,
          description: meta.description,
          email: company.email,
          telephone: company.phoneHref,
          contactPoint: [company, ...company.morePhones].map((p) => ({
            '@type': 'ContactPoint',
            telephone: p.phoneHref,
            email: company.email,
            contactType: 'customer service',
            areaServed: 'SE',
            availableLanguage: 'sv',
          })),
          address: { '@type': 'PostalAddress', addressLocality: 'Stockholm', addressCountry: 'SE' },
          areaServed: { '@type': 'Country', name: 'Sverige' },
          knowsAbout: content.build.items.map((i) => i.name),
          sameAs: meta.sameAs,
        },
        {
          '@type': 'WebSite',
          '@id': `${meta.siteUrl}/#website`,
          url: `${meta.siteUrl}/`,
          name: meta.siteName,
          inLanguage: 'sv-SE',
          publisher: { '@id': org },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

/**
 * The start page reads as one running Wimco Score report (docs/redesign/BRIEF.md):
 * a scan in progress → what is measured → the repair (the peak) → automation you run yourself
 * → what we do → references → yours to edit and own → the company → questions → your turn.
 */
export default function Page() {
  const { stations, contact } = content;
  const heroAnalyse = { ...contact.analyse, id: 'analys' };
  return (
    <>
      <StructuredData />
      <a className="skip" href="#main">
        {content.nav.skip}
      </a>
      <SiteNav content={content.nav} />
      <main id="main">
        <Hero content={content.hero} stations={stations} analyse={heroAnalyse} />
        <Stations content={content.stationsSection} stations={stations} />
        <Repair content={content.repair} stations={stations} serviceNames={content.serviceNames} />
        <Automation content={content.automation} />
        <Build content={content.build} />
        <Work content={content.work} />
        <Kollen content={content.kollenTeaser} areas={AREAS} />
        <Ownership content={content.ownership} />
        <About company={contact.company} process={content.process} />
        <Faq content={content.faq} />
        <Close content={contact} stations={stations} />
      </main>
      <Footer content={content.footer} />
      <ConsentBanner content={content.consent} />
      <Motion />
    </>
  );
}
