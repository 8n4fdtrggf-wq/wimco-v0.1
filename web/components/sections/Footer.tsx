import type { FooterContent } from '@/content/types';
import styles from './Footer.module.css';

export function Footer({ content, logoHref = '#top' }: { content: FooterContent; logoHref?: string }) {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.brand}>
          <a className={styles.logo} href={logoHref}>
            Wimco<i>.</i>
          </a>
          <p>{content.tagline}</p>
        </div>
        {content.columns.map((col, i) => (
          <nav key={col.title} aria-label={col.title} className={styles.column}>
            <h2>{col.title}</h2>
            <ul>
              {col.links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} {...(l.external ? { target: '_blank', rel: 'noopener' } : {})}>
                    {l.label}
                  </a>
                </li>
              ))}
              {i === content.columns.length - 1 && (
                <li>
                  <button type="button" className={styles.linkButton} data-consent-open="">
                    {content.consentLabel}
                  </button>
                </li>
              )}
            </ul>
          </nav>
        ))}
      </div>
      <div className={`wrap ${styles.legal}`}>
        <span className="mono">{content.legal}</span>
      </div>
    </footer>
  );
}
