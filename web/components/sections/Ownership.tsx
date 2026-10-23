'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import type { OwnershipContent } from '@/content/types';
import { gsap, MQ, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { cx, format, vars } from '@/lib/css';
import styles from './Ownership.module.css';

type Field = 'headline' | 'body' | 'price';
type Phase = 'idle' | 'publishing' | 'published';

const clock = () => new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

/**
 * What sets Wimco apart, shown rather than claimed: a small working editor over the example site.
 * Click a text and type, swap the image, press Publicera. When the section arrives, the editor makes
 * one edit on its own (3 → 2 veckor) to show it can be done, unless the visitor has already started.
 * Underneath: the promises, each set against the usual way, struck through.
 */
export function Ownership({ content }: { content: OwnershipContent }) {
  const root = useRef<HTMLElement>(null);
  const ed = content.editor;
  const initial = { headline: ed.headline, body: ed.body, price: ed.price };
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [image, setImage] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [time, setTime] = useState('');
  const touched = useRef(false);
  const demo = useRef<gsap.core.Timeline | null>(null);

  const field = (name: Field) => root.current?.querySelector<HTMLElement>(`[data-field="${name}"]`) ?? null;

  const mark = (key: string, isChanged: boolean) => {
    setChanged((prev) => {
      if (prev.has(key) === isChanged) return prev;
      const next = new Set(prev);
      if (isChanged) next.add(key);
      else next.delete(key);
      return next;
    });
    setPhase((p) => (p === 'published' ? 'idle' : p));
  };

  // Any interaction ends the self-made demo edit where it stands.
  const stopDemo = () => {
    touched.current = true;
    demo.current?.kill();
    demo.current = null;
    field('headline')?.removeAttribute('data-demo');
  };

  const onInput = (name: Field) => {
    const el = field(name);
    if (!el) return;
    mark(name, (el.textContent ?? '').trim() !== initial[name]);
  };

  // Enter commits the edit (these are one-line fields), Escape leaves the field.
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  };

  const swap = () => {
    stopDemo();
    const next = (image + 1) % ed.images.length;
    setImage(next);
    mark('image', next !== 0);
  };

  const reset = () => {
    stopDemo();
    (['headline', 'body', 'price'] as const).forEach((n) => {
      const el = field(n);
      if (el) el.textContent = initial[n];
    });
    setImage(0);
    setChanged(new Set());
    setPhase('idle');
  };

  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        // One self-made edit when the editor arrives: the "3" is selected and typed over with "2".
        ScrollTrigger.create({
          trigger: '[data-editor]',
          start: 'top 65%',
          once: true,
          onEnter: () => {
            if (touched.current) return;
            const el = field('headline');
            if (!el) return;
            const from = ed.headline;
            const to = ed.demoHeadline;
            let i = 0;
            while (i < from.length && from[i] === to[i]) i++;
            const head = from.slice(0, i);
            const tail = from.slice(i + 1);
            const tl = gsap.timeline({ delay: 0.5 });
            tl.add(() => el.setAttribute('data-demo', 'select'))
              .to({}, { duration: 0.7 })
              .add(() => {
                el.textContent = head + to[i] + tail;
                el.setAttribute('data-demo', 'typed');
                mark('headline', true);
              })
              .to({}, { duration: 1.1 })
              .add(() => el.removeAttribute('data-demo'));
            demo.current = tl;
          },
        });
      });
    },
    { scope: root },
  );

  const publish = contextSafe(() => {
    stopDemo();
    if (changed.size === 0 || phase === 'publishing') return;
    setPhase('publishing');
    const reduce = window.matchMedia(MQ.reduce).matches;
    const bar = root.current?.querySelector('[data-publish-bar]');
    gsap.fromTo(
      bar ?? {},
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: reduce ? 0.01 : 1.1,
        ease: 'power2.inOut',
        onComplete: () => {
          setTime(clock());
          setPhase('published');
          setChanged(new Set());
        },
      },
    );
  });

  const editable = (name: Field, className: string) => ({
    'data-field': name,
    className: cx(styles.editable, className),
    contentEditable: 'plaintext-only' as const,
    suppressContentEditableWarning: true,
    spellCheck: false,
    role: 'textbox',
    'aria-label': ed.fieldLabels[name],
    tabIndex: 0,
    onFocus: stopDemo,
    onPointerDown: stopDemo,
    onInput: () => onInput(name),
    onKeyDown,
  });

  const count = changed.size;

  return (
    <section id="eget" ref={root} className={cx('section', styles.ownership)} aria-labelledby="eget-title">
      <div className="wrap">
        <div className={styles.head}>
          <h2 id="eget-title" className={styles.title} data-rise="">
            {content.title}
          </h2>
          <p className={styles.lede} data-rise="">
            {content.lede}
          </p>
        </div>

        {/* ---------- The editor ---------- */}
        <div className={styles.editor} data-editor="" data-phase={phase} data-rise="">
          <div className={styles.toolbar}>
            <span className={styles.toolLabel}>
              <i aria-hidden="true" />
              {ed.label}
            </span>
            <span className={styles.status} aria-live="polite">
              {phase === 'published' ? (
                <>
                  <b>{format(ed.published, { time })}</b> {ed.publishedSub}
                </>
              ) : count > 0 ? (
                count === 1 ? ed.change : format(ed.changes, { count })
              ) : (
                ed.noChanges
              )}
            </span>
            <span className={styles.tools}>
              <button type="button" className={styles.ghostBtn} onClick={swap}>
                {ed.swapImage}
              </button>
              <button type="button" className={styles.ghostBtn} onClick={reset}>
                {ed.undo}
              </button>
              <button
                type="button"
                className={styles.publish}
                onClick={publish}
                disabled={count === 0 || phase === 'publishing'}
              >
                {phase === 'publishing' ? ed.publishing : ed.publish}
              </button>
            </span>
            <span className={styles.publishBar} aria-hidden="true">
              <i data-publish-bar="" />
            </span>
          </div>

          <div className={styles.canvas}>
            <p className={styles.hint} aria-hidden="true">
              <span className={styles.cursor} />
              {ed.hint}
            </p>
            <div className={styles.site}>
              <div className={styles.siteNav} aria-hidden="true">
                <b>{ed.company}</b>
                <span>
                  {ed.nav.map((n) => (
                    <i key={n}>{n}</i>
                  ))}
                  <em>Boka</em>
                </span>
              </div>
              <div className={styles.siteHero}>
                <div className={styles.copy}>
                  <p {...editable('headline', styles.h)}>{ed.headline}</p>
                  <p {...editable('body', styles.p)}>{ed.body}</p>
                  <p className={styles.priceRow}>
                    <span>{ed.priceLabel}</span> <span {...editable('price', styles.price)}>{ed.price}</span>
                  </p>
                </div>
                <div className={styles.image} data-kind={ed.images[image].kind} role="img" aria-label={ed.images[image].label}>
                  <span className={styles.imageTag} aria-hidden="true">
                    {ed.images[image].label}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className={styles.demoNote}>{ed.demoNote}</p>
        </div>

        {/* ---------- The promises ---------- */}
        <h3 className={styles.promisesTitle} data-rise="">
          {content.promisesTitle}
        </h3>
        <ul className={styles.promises}>
          {content.promises.map((p, i) => (
            <li key={p.title} data-rise="" style={vars({ i })}>
              <span className={styles.check} aria-hidden="true" />
              <div>
                <h4>{p.title}</h4>
                <p className={styles.usual}>
                  <span className="sr-only">{content.usualLabel}: </span>
                  <s>{p.usual}</s>
                </p>
                <p className={styles.body}>{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
