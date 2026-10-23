import * as content from '@/content/site';
import { SiteNav } from '@/components/nav/SiteNav';
import { Motion } from '@/components/motion/Motion';
import { Hero } from '@/components/sections/Hero';
import { Stations } from '@/components/sections/Stations';
import { Repair } from '@/components/sections/Repair';
import { Automation } from '@/components/sections/Automation';
import { Build } from '@/components/sections/Build';
import { Ownership } from '@/components/sections/Ownership';
import { Willem } from '@/components/sections/Willem';
import { Faq } from '@/components/sections/Faq';
import { Close } from '@/components/sections/Close';
import { Footer } from '@/components/sections/Footer';
import { ConsentBanner } from '@/components/sections/ConsentBanner';

/** Structured data: the business, and the FAQ (eligible for rich results). */
function StructuredData() {
  const { meta, contact, faq } = content;
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: meta.siteName,
      url: `${meta.siteUrl}/`,
      image: `${meta.siteUrl}${meta.ogImage}`,
      description: meta.description,
      email: contact.willem.email,
      telephone: contact.willem.phoneHref,
      areaServed: 'SE',
      founder: { '@type': 'Person', name: 'Willem' },
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
 * → what we build → yours to edit and own → Willem → questions → your turn.
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
        <Ownership content={content.ownership} />
        <Willem willem={contact.willem} process={content.process} />
        <Faq content={content.faq} />
        <Close content={contact} stations={stations} />
      </main>
      <Footer content={content.footer} />
      <ConsentBanner content={content.consent} />
      <Motion />
    </>
  );
}
