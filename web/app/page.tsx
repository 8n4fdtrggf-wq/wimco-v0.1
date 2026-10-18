import * as content from '@/content/site';
import { SiteNav } from '@/components/nav/SiteNav';
import { Hero } from '@/components/sections/Hero';
import { Manifesto } from '@/components/sections/Manifesto';
import { Facts } from '@/components/sections/Facts';
import { Services } from '@/components/sections/Services';
import { Compare } from '@/components/sections/Compare';
import { Score } from '@/components/sections/Score';
import { Process } from '@/components/sections/Process';
import { Faq } from '@/components/sections/Faq';
import { Contact } from '@/components/sections/Contact';
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

export default function Page() {
  return (
    <>
      <StructuredData />
      <a className="skip" href="#main">
        {content.nav.skip}
      </a>
      <SiteNav content={content.nav} />
      <main id="main">
        <Hero content={content.hero} />
        <Manifesto content={content.manifesto} />
        <Facts content={content.facts} />
        <Services content={content.services} lines={content.lines} />
        <Compare content={content.compare} />
        <Score content={content.score} />
        <Process content={content.process} />
        <Faq content={content.faq} />
        <Contact content={content.contact} />
      </main>
      <Footer content={content.footer} />
      <ConsentBanner content={content.consent} />
    </>
  );
}
