import type { ReactNode } from 'react';
import type { LineId } from '@/content/types';
import { cx } from '@/lib/css';
import { Eyebrow } from './Eyebrow';
import { Reveal } from './Reveal';
import styles from './SectionHeading.module.css';

interface Props {
  eyebrow: string;
  title: string;
  lede?: string;
  lines?: LineId[];
  segment?: LineId;
  tone?: 'default' | 'inverse';
  children?: ReactNode;
  className?: string;
}

/** Eyebrow + title + optional lede, revealed as one "station arrival". */
export function SectionHeading({ eyebrow, title, lede, lines, segment, tone, children, className }: Props) {
  return (
    <Reveal className={cx(styles.head, className)}>
      <Eyebrow lines={lines} segment={segment} tone={tone}>
        {eyebrow}
      </Eyebrow>
      <h2 className="title">{title}</h2>
      {lede && <p className={cx('lede', tone === 'inverse' && styles.inverseLede)}>{lede}</p>}
      {children}
    </Reveal>
  );
}
