'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './CopyButton.module.css';

interface Props {
  value: string;
  label: string;
  idle: string;
  done: string;
}

/** Copies a value; the label crossfades (with a touch of blur) to the confirmation, then back. */
export function CopyButton({ value, label, idle, done }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const confirm = () => {
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      confirm();
    } catch {
      // Clipboard refused: select the text next to the button so the visitor can copy it.
      const text = (document.activeElement?.parentElement?.firstElementChild as HTMLElement | null) ?? null;
      if (text) {
        const range = document.createRange();
        range.selectNodeContents(text);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  return (
    <button type="button" className={styles.button} data-done={copied ? '' : undefined} aria-label={label} onClick={onClick}>
      <span className={styles.idle}>{idle}</span>
      <span className={styles.done} aria-hidden="true">
        {done}
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? done : ''}
      </span>
    </button>
  );
}
