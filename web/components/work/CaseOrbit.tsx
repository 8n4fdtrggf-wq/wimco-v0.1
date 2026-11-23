'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { WorkItem } from '@/content/types';
import { gsap, MQ, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { format } from '@/lib/css';
import { OrbitCard } from './OrbitCards';
import styles from './CaseOrbit.module.css';

/**
 * A reference shown as its screenshot with small live cards floating around it in 3D.
 *
 * Sequence: when the stage scrolls into view the screenshot settles out of a blur, then the cards
 * arrive one by one. Once that is done the screenshot becomes a link to the case ("ready"). Every
 * few seconds the cards blur out and come back in other slots; picking another reference in the
 * list runs the same exit, swaps the screenshot and the cards, and brings them back in.
 *
 * Slot positions are CSS (`data-slot`), so phones can use fewer, larger slots. GSAP animates only
 * the inner layers: [data-bob] drifts, [data-card] enters and exits, [data-hero] settles.
 */
const SLOTS = 8;
const SHUFFLE_MS = 7000;

interface Props {
  items: WorkItem[];
  active: number;
  screenLabel: string;
  orbitLabel: string;
  readCase: string;
}

export function CaseOrbit({ items, active, screenLabel, orbitLabel, readCase }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(active);
  const [offset, setOffset] = useState(0);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduce, setReduce] = useState(false);
  const busy = useRef(false);
  const item = items[shown];
  const live = ready && inView && !reduce;

  const q = (sel: string) => gsap.utils.toArray<HTMLElement>(sel, stage.current);

  // Entrance and drift. Reduced motion skips straight to the finished, clickable state.
  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.reduce, () => {
        setReduce(true);
        setReady(true);
        return () => setReduce(false);
      });
      mm.add(MQ.motion, () => {
        gsap.set('[data-hero]', { opacity: 0, scale: 0.9, filter: 'blur(16px)' });
        gsap.set('[data-card]', { opacity: 0, scale: 0.8, filter: 'blur(14px)' });
        ScrollTrigger.create({
          trigger: stage.current,
          start: 'top 72%',
          once: true,
          onEnter: () => {
            gsap
              .timeline({ onComplete: () => setReady(true) })
              .to('[data-hero]', { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out' })
              .to(
                '[data-card]',
                { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out', stagger: { each: 0.07, from: 'random' } },
                0.35,
              );
          },
        });

        // Pointer tilt for the whole rig, around its resting angle.
        const rig = stage.current?.querySelector<HTMLElement>('[data-rig]');
        if (!rig || !window.matchMedia(MQ.fine).matches) return;
        const rx = gsap.quickTo(rig, 'rotationX', { duration: 0.9, ease: 'power3.out' });
        const ry = gsap.quickTo(rig, 'rotationY', { duration: 0.9, ease: 'power3.out' });
        gsap.set(rig, { rotationX: 9, rotationY: 0 });
        const move = (e: PointerEvent) => {
          const r = stage.current!.getBoundingClientRect();
          rx(9 - ((e.clientY - r.top) / r.height - 0.5) * 8);
          ry(((e.clientX - r.left) / r.width - 0.5) * 12);
        };
        const leave = () => {
          rx(9);
          ry(0);
        };
        stage.current!.addEventListener('pointermove', move);
        stage.current!.addEventListener('pointerleave', leave);
        return () => {
          stage.current?.removeEventListener('pointermove', move);
          stage.current?.removeEventListener('pointerleave', leave);
        };
      });
      return () => mm.revert();
    },
    { scope: stage },
  );

  // Each card drifts on its own slow loop, so the cluster never looks frozen.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        q('[data-bob]').forEach((el) => {
          gsap.fromTo(
            el,
            { y: gsap.utils.random(-6, 0) },
            { y: gsap.utils.random(4, 9), duration: gsap.utils.random(2.8, 4.6), ease: 'sine.inOut', yoyo: true, repeat: -1 },
          );
        });
      });
      return () => mm.revert();
    },
    { scope: stage, dependencies: [item.orbit.length], revertOnUpdate: true },
  );

  // The page inside the screenshot scrolls slowly down and back while the stage is live.
  useEffect(() => {
    if (!live) return;
    const screen = stage.current?.querySelector<HTMLElement>('[data-screen]');
    const shot = screen?.querySelector<HTMLElement>('img');
    if (!screen || !shot) return;
    const tween = gsap.fromTo(
      shot,
      { y: 0 },
      { y: () => Math.min(0, screen.clientHeight - shot.offsetHeight), duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1, repeatDelay: 1.6, delay: 1 },
    );
    return () => {
      tween.kill();
      gsap.set(shot, { y: 0 });
    };
  }, [live, shown]);

  // Only play while the stage is on screen.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Blur the cards (and, when swapping references, the screenshot) out, then run `then`. */
  const exit = contextSafe((withHero: boolean, then: () => void) => {
    busy.current = true;
    const tl = gsap.timeline({ onComplete: then });
    tl.to('[data-card]', { opacity: 0, scale: 0.86, filter: 'blur(12px)', duration: 0.45, ease: 'power2.inOut', stagger: { each: 0.035, from: 'random' } });
    if (withHero) tl.to('[data-hero]', { opacity: 0, scale: 0.94, filter: 'blur(14px)', duration: 0.5, ease: 'power2.inOut' }, 0.1);
    else tl.to('[data-hero]', { rotationY: -7, scale: 0.97, duration: 0.5, ease: 'power2.inOut' }, 0);
  });

  /** Bring the cards (and screenshot) back in after a shuffle or a swap. */
  const enter = contextSafe(() => {
    gsap
      .timeline({ onComplete: () => void (busy.current = false) })
      .to('[data-hero]', { opacity: 1, scale: 1, rotationY: 0, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out' })
      .fromTo(
        '[data-card]',
        { opacity: 0, scale: 0.82, filter: 'blur(14px)' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', stagger: { each: 0.06, from: 'random' } },
        0.15,
      );
  });

  // After the DOM has the new slots or the new reference, animate in. Skips the first render.
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!reduce) enter();
  }, [offset, shown]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shuffle on a timer while live.
  useEffect(() => {
    if (!live) return;
    const t = window.setTimeout(() => {
      if (!busy.current) exit(false, () => setOffset((o) => o + 3));
    }, SHUFFLE_MS);
    return () => window.clearTimeout(t);
  }, [live, offset]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new pick in the list swaps the reference.
  useEffect(() => {
    if (active === shown) return;
    if (reduce || !ready) {
      setShown(active);
      return;
    }
    exit(true, () => setShown(active));
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={stage} className={styles.stage}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.rig} data-rig="">
        <ul className={styles.cards} aria-label={format(orbitLabel, { name: item.name })}>
          {item.orbit.map((card, i) => (
            <li key={i} className={styles.slot} data-slot={(i + offset) % SLOTS}>
              <div className={styles.bob} data-bob="">
                <div className={styles.layer} data-card="">
                  <OrbitCard card={card} live={live} still={reduce} />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className={styles.center}>
          <a
            className={styles.hero}
            href={item.caseHref ?? item.href}
            data-hero=""
            data-ready={ready || undefined}
          >
            <span className={styles.bar} aria-hidden="true">
              <span className={styles.lights}>
                <i />
                <i />
                <i />
              </span>
              <span className={`${styles.url} mono`}>{item.host}</span>
            </span>
            <span className={styles.screen} data-screen="">
              <img
                key={item.id}
                src={item.image.src}
                width={item.image.width}
                height={item.image.height}
                alt={format(screenLabel, { name: item.name })}
                decoding="async"
              />
            </span>
            {item.caseHref && (
              <span className={styles.cta}>
                {readCase}
                <span className="sr-only">: {item.name}</span>
                <i aria-hidden="true">→</i>
              </span>
            )}
          </a>
        </div>
      </div>
    </div>
  );
}
