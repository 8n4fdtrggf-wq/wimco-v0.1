'use client';

import { useEffect, useState } from 'react';
import type { CampaignContent } from '@/content/types';
import { cx } from '@/lib/css';
import styles from './Campaign.module.css';

/** True once the last day of the offer (Swedish time) has passed. */
export function campaignOver(until: string, now = new Date()) {
  // 23:59:59 on the last day in Stockholm. CET is UTC+1 in January, which is when the offers end.
  const end = new Date(`${until}T23:59:59+01:00`);
  return Number.isNaN(end.getTime()) || now > end;
}

/**
 * The offer pill: a short label, one line of text and a link to the project form.
 * With `note`, a plain paragraph without the link (used beside the project form).
 * Rendered in the static HTML (so it is there on first paint and for crawlers) and
 * removed on the client once the offer has ended, so an old build never shows an expired offer.
 */
export function Campaign({ content, className, note = false }: { content: CampaignContent; className?: string; note?: boolean }) {
  // Starts visible on both server and client (no hydration mismatch), then checks the date.
  const [over, setOver] = useState(false);
  useEffect(() => setOver(campaignOver(content.until)), [content.until]);
  if (over) return null;

  // Next to the form itself the link would point at where the visitor already is: label and text only.
  if (note) {
    return (
      <p className={cx(styles.pill, styles.note, className)} data-campaign="">
        <span className={styles.label}>{content.label}</span>
        <span className={styles.text}>{content.text}</span>
      </p>
    );
  }

  return (
    <a className={cx(styles.pill, className)} href={content.link.href} data-campaign="">
      <span className={styles.label}>{content.label}</span>
      <span className={styles.text}>{content.short}</span>
      <span className={styles.link}>
        {content.link.label}
        <span aria-hidden="true"> →</span>
      </span>
    </a>
  );
}
