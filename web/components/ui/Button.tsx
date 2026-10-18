import type { ReactNode } from 'react';
import { cx } from '@/lib/css';
import styles from './Button.module.css';

interface Props {
  children: ReactNode;
  href?: string;
  external?: boolean;
  variant?: 'primary' | 'ghost';
  size?: 'md' | 'sm';
  arrow?: boolean;
  block?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  onClick?: () => void;
  /** Extra data-* attributes, e.g. hooks for the shared site.js. */
  data?: Record<string, string>;
}

/** Pill button. Renders a link when `href` is set. Press feedback is a 0.97 scale on :active. */
export function Button({
  children,
  href,
  external,
  variant = 'primary',
  size = 'md',
  arrow,
  block,
  type = 'button',
  className,
  onClick,
  data,
}: Props) {
  const dataAttrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));
  const cls = cx(styles.btn, styles[variant], size === 'sm' && styles.sm, block && styles.block, className);
  const inner = (
    <>
      {children}
      {arrow && (
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <a className={cls} href={href} onClick={onClick} {...dataAttrs} {...(external ? { target: '_blank', rel: 'noopener' } : {})}>
        {inner}
      </a>
    );
  }
  return (
    <button className={cls} type={type} onClick={onClick} {...dataAttrs}>
      {inner}
    </button>
  );
}
