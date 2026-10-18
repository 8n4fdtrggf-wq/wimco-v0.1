import type { ContactContent } from '@/content/types';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SpotlightCard } from '@/components/interactive/SpotlightCard';
import { AnalysisForm } from '@/components/interactive/AnalysisForm';
import { ProjectForm } from '@/components/interactive/ProjectForm';
import { CopyButton } from '@/components/interactive/CopyButton';
import { cx, vars } from '@/lib/css';
import styles from './Contact.module.css';

/** "Var står du i dag?": two ways in (analyse what you have / build something new), then Willem himself. */
export function Contact({ content }: { content: ContactContent }) {
  const { analyse, project, willem } = content;
  return (
    <section id="starta" className={cx('wrap', styles.contact)}>
      <SectionHeading eyebrow={content.eyebrow} title={content.title} segment="a" />
      <Reveal variant="stagger" className={styles.grid}>
        <SpotlightCard id={analyse.id} line={analyse.line} style={vars({ i: 0 })}>
          <Eyebrow lines={[analyse.line]}>{analyse.eyebrow}</Eyebrow>
          <h3 className={styles.title}>{analyse.title}</h3>
          <p className={styles.body}>{analyse.body}</p>
          <AnalysisForm content={analyse} />
          <ol className={styles.gets}>
            {analyse.gets.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ol>
        </SpotlightCard>

        <SpotlightCard id={project.id} line={project.line} style={vars({ i: 1 })}>
          <Eyebrow lines={[project.line]}>{project.eyebrow}</Eyebrow>
          <h3 className={styles.title}>{project.title}</h3>
          <p className={styles.body}>{project.body}</p>
          <ProjectForm content={project} email={willem.email} />
        </SpotlightCard>

        <div className={styles.willem} style={vars({ i: 2 })}>
          <div className={styles.me}>
            <span className={styles.avatar} aria-hidden="true">
              {willem.initial}
            </span>
            <div className={styles.meText}>
              <h3 className={styles.title}>{willem.title}</h3>
              <p className={styles.body}>{willem.body}</p>
            </div>
          </div>
          <div className={styles.lines}>
            <div className={styles.contactLine}>
              <a href={`mailto:${willem.email}`}>{willem.email}</a>
              <CopyButton value={willem.email} label={willem.copyEmailLabel} idle={willem.copy} done={willem.copied} />
            </div>
            <div className={styles.contactLine}>
              <a href={`tel:${willem.phoneHref}`}>{willem.phone}</a>
              <CopyButton value={willem.phone} label={willem.copyPhoneLabel} idle={willem.copy} done={willem.copied} />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
