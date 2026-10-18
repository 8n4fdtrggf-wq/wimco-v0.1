'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { AfterShotContent, BeforeShotContent, CompareContent } from '@/content/types';
import { format } from '@/lib/css';
import { clamp, nearest, projectMomentum, rubberband, useReducedMotion, useSpring } from '@/lib/motion';
import { AfterShot, BeforeShot } from './Shots';
import styles from './CompareSlider.module.css';

interface Props {
  slider: CompareContent['slider'];
  before: BeforeShotContent;
  after: AfterShotContent;
}

interface Drag {
  id: number;
  left: number;
  width: number;
  offset: number;
  near: boolean;
  moved: boolean;
  touch: boolean;
  startX: number;
  history: { x: number; t: number }[];
}

/**
 * Drag-to-compare (signature interaction).
 * - Mouse: responds on press; grabbing near the handle keeps the grab offset (no jump).
 * - Touch: tracks 1:1 after a small horizontal threshold; vertical drags stay page scroll (touch-action: pan-y);
 *   a tap without movement glides the handle there.
 * - Release: momentum is projected forward and the handle snaps to the nearest resting point,
 *   carrying the finger's velocity into a slightly under-damped spring. Slow releases stay put.
 * - Past the edges the handle rubber-bands instead of stopping hard.
 * - Keyboard (arrows / Home / End) moves instantly; keyboard actions are never animated.
 */
export function CompareSlider({ slider, before, after }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);
  const gripRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLButtonElement>(null);
  const tagBefore = useRef<HTMLSpanElement>(null);
  const tagAfter = useRef<HTMLSpanElement>(null);
  const x = useRef(0.5);
  const touched = useRef(false);
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState(false);
  const reduce = useReducedMotion();

  // Position is expressed as a fraction, and the grip spans the full width, so translateX(%) needs no measuring.
  const paint = useCallback(
    (v: number) => {
      x.current = v;
      const c = clamp(v);
      if (afterRef.current) afterRef.current.style.clipPath = `inset(0 0 0 ${(c * 100).toFixed(2)}%)`;
      if (gripRef.current) gripRef.current.style.transform = `translate3d(${(v * 100).toFixed(2)}%, 0, 0)`;
      if (tagBefore.current) tagBefore.current.style.opacity = c < 0.14 ? '0' : '1';
      if (tagAfter.current) tagAfter.current.style.opacity = c > 0.86 ? '0' : '1';
      const pct = Math.round(c * 100);
      knobRef.current?.setAttribute('aria-valuenow', String(pct));
      knobRef.current?.setAttribute('aria-valuetext', format(slider.valueText, { before: pct, after: 100 - pct }));
    },
    [slider.valueText],
  );
  const spring = useSpring(0.5, { response: 0.4 }, paint);

  // A one-time nudge the first time the slider is properly in view, so the handle reads as draggable.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || reduce) return;
    const timers: number[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        timers.push(
          window.setTimeout(() => {
            if (touched.current) return;
            spring.configure({ response: 0.6 });
            spring.to(0.34);
          }, 350),
          window.setTimeout(() => {
            if (!touched.current) spring.to(0.5);
          }, 1150),
        );
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [reduce, spring]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current || (e.pointerType === 'mouse' && e.button !== 0)) return; // ignore a second finger
    touched.current = true;
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const near = Math.abs(px - x.current * r.width) < 36;
    drag.current = {
      id: e.pointerId,
      left: r.left,
      width: r.width,
      offset: near ? px - x.current * r.width : 0,
      near,
      moved: false,
      touch: e.pointerType !== 'mouse',
      startX: e.clientX,
      history: [{ x: px, t: e.timeStamp }],
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    if (!drag.current.touch && !near) {
      spring.configure({ response: 0.4, damping: 1 });
      spring.to(clamp(px / r.width));
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const px = e.clientX - d.left;
    if (!d.moved) {
      if (Math.abs(e.clientX - d.startX) < (d.touch ? 8 : 2)) return; // hysteresis before committing
      d.moved = true;
      if (d.touch && !d.near) d.offset = 0;
    }
    let raw = (px - d.offset) / d.width;
    if (raw < 0) raw = -rubberband(-raw * d.width, d.width) / d.width;
    else if (raw > 1) raw = 1 + rubberband((raw - 1) * d.width, d.width) / d.width;
    spring.set(raw);
    d.history.push({ x: px, t: e.timeStamp });
    if (d.history.length > 6) d.history.shift();
  };

  const end = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    setDragging(false);
    spring.configure({ response: 0.4, damping: 1 });
    if (cancelled) {
      spring.to(clamp(x.current));
      return;
    }
    if (!d.moved) {
      if (d.touch) spring.to(clamp((e.clientX - d.left) / d.width));
      return;
    }
    const first = d.history[0];
    const last = d.history[d.history.length - 1];
    const fresh = e.timeStamp - last.t < 80;
    const velocity = fresh && last.t > first.t ? (last.x - first.x) / ((last.t - first.t) / 1000) : 0; // px/s
    if (Math.abs(velocity) > 450) {
      const landing = (x.current * d.width + projectMomentum(velocity)) / d.width;
      spring.configure({ response: 0.4, damping: 0.8 }); // the flick earned a little bounce
      spring.to(nearest(landing, slider.snaps), velocity / d.width);
    } else {
      spring.to(clamp(x.current));
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 0.2 : 0.05;
    let v: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = clamp(x.current - step);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = clamp(x.current + step);
    else if (e.key === 'Home') v = 0;
    else if (e.key === 'End') v = 1;
    if (v === null) return;
    e.preventDefault();
    touched.current = true;
    spring.set(v);
  };

  return (
    <div
      ref={rootRef}
      className={styles.cmp}
      data-drag={dragging ? '' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => end(e, false)}
      onPointerCancel={(e) => end(e, true)}
    >
      <BeforeShot content={before} />
      <AfterShot ref={afterRef} content={after} />
      <span ref={tagBefore} className={`${styles.tag} ${styles.tagBefore}`} aria-hidden="true">
        {slider.before}
      </span>
      <span ref={tagAfter} className={`${styles.tag} ${styles.tagAfter}`} aria-hidden="true">
        {slider.after}
      </span>
      <div ref={gripRef} className={styles.grip}>
        <button
          ref={knobRef}
          type="button"
          role="slider"
          className={styles.knob}
          aria-label={slider.label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={50}
          aria-valuetext={format(slider.valueText, { before: 50, after: 50 })}
          onKeyDown={onKeyDown}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
