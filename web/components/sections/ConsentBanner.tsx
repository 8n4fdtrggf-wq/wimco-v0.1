import type { ConsentContent } from '@/content/types';
import { Button } from '@/components/ui/Button';
import styles from './ConsentBanner.module.css';

/**
 * Markup only. Behaviour lives in /assets/js/site.js (initConsent), shared with every other page:
 * it reveals the banner once the visitor has scrolled past the first screen, stores the choice in
 * localStorage under "wimco-consent-v1", and loads Google Analytics only after "Godkänn".
 */
export function ConsentBanner({ content }: { content: ConsentContent }) {
  return (
    <div className={styles.consent} data-consent="" hidden role="region" aria-label="Cookies">
      <p>
        {content.text} <a href={content.link.href}>{content.link.label}</a>
      </p>
      <div className={styles.actions}>
        <Button variant="ghost" size="sm" data={{ 'consent-choice': 'denied' }}>
          {content.deny}
        </Button>
        <Button size="sm" data={{ 'consent-choice': 'granted' }}>
          {content.allow}
        </Button>
      </div>
    </div>
  );
}
