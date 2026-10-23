'use client';

import { useRef, useState } from 'react';
import type { AutomationContent } from '@/content/types';
import { gsap, MQ, useGSAP } from '@/lib/gsap';
import { cx, vars } from '@/lib/css';
import styles from './Automation.module.css';

type Phase = 'idle' | 'running' | 'done';

const clock = (d: Date) => d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

/**
 * The visitor runs it. One button sends a test request through four stages, each stage's panel
 * filling in with the visitor's own clock time. It all happens in the page; nothing is sent.
 */
export function Automation({ content }: { content: AutomationContent }) {
  const root = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [time, setTime] = useState('08:14');
  const tl = useRef<gsap.core.Timeline | null>(null);
  const { surface, form } = content;

  const { contextSafe } = useGSAP({ scope: root });

  const run = contextSafe(() => {
    tl.current?.kill();
    setTime(clock(new Date()));
    setPhase('running');
    const steps = gsap.utils.toArray<HTMLElement>('[data-step]', root.current);
    steps.forEach((s) => s.removeAttribute('data-lit'));
    const reduce = window.matchMedia(MQ.reduce).matches;
    const t = gsap.timeline({ onComplete: () => setPhase('done') });
    steps.forEach((step, i) => {
      t.add(() => step.setAttribute('data-lit', ''), reduce ? 0 : i * 0.75 + 0.15);
      if (!reduce) {
        t.fromTo(
          step.querySelector('[data-panel]'),
          { y: 14, opacity: 0, scale: 0.97 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' },
          i * 0.75 + 0.15,
        );
      }
    });
    tl.current = t;
  });

  return (
    <section id="automation" ref={root} className={cx('section', styles.automation)} aria-labelledby="automation-title">
      <div className={cx('wrap', styles.grid)}>
        <div className={styles.copy}>
          <h2 id="automation-title" className={styles.title} data-rise="">
            {content.title}
          </h2>
          <p className={styles.lede} data-rise="">
            {content.lede}
          </p>
          <div className={styles.actions} data-rise="">
            <button type="button" className={styles.run} onClick={run} disabled={phase === 'running'} data-phase={phase}>
              <span className={styles.runDot} aria-hidden="true" />
              {phase === 'idle' ? content.run : content.rerun}
            </button>
            <small>{content.demoNote}</small>
            <span className="sr-only" aria-live="polite">
              {phase === 'done' ? content.steps.map((s) => s.title).join('. ') : ''}
            </span>
          </div>
          <div className={styles.more} data-rise="">
            <h3>{content.more.title}</h3>
            <ul>
              {content.more.items.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>

        <ol className={styles.flow} data-phase={phase}>
          {content.steps.map((s, i) => (
            <li key={s.title} className={styles.step} data-step="" style={vars({ i })}>
              <span className={styles.node} aria-hidden="true" />
              <div className={styles.stepText}>
                <span className={styles.time}>{time}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
              <div className={styles.panel} data-panel="" aria-hidden="true">
                {i === 0 && (
                  <div className={styles.formPanel}>
                    <b>{surface.formTitle}</b>
                    <span>{form.name}</span>
                    <span className={styles.msg}>{form.message}</span>
                  </div>
                )}
                {i === 1 && (
                  <div className={styles.crm}>
                    {surface.crmHead.map((h) => (
                      <span key={h} className={styles.crmHead}>
                        {h}
                      </span>
                    ))}
                    <span>{form.name}</span>
                    <span>{form.service}</span>
                    <span className={styles.status}>{surface.crmStatus}</span>
                  </div>
                )}
                {i === 2 && (
                  <div className={styles.mail}>
                    <b>{surface.replySubject}</b>
                    <span>{surface.replyBody}</span>
                  </div>
                )}
                {i === 3 && (
                  <div className={styles.push}>
                    <span className={styles.app}>W</span>
                    <span>
                      <b>Wimco</b>
                      {surface.summary}
                    </span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
