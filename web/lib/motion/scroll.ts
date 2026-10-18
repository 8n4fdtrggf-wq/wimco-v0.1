'use client';

import { useEffect, useRef } from 'react';

/**
 * One requestAnimationFrame per scroll for the whole page.
 * Every job runs its `read` (layout reads: getBoundingClientRect) first, then every job runs
 * its `write` (style writes: transform, opacity). Batching like this avoids layout thrashing.
 */

export interface FrameContext {
  vh: number;
  scrollY: number;
  docHeight: number;
}

interface Job {
  read: (ctx: FrameContext) => void;
  write: (ctx: FrameContext) => void;
}

const jobs = new Set<Job>();
const ctx: FrameContext = { vh: 0, scrollY: 0, docHeight: 0 };
let ticking = false;
let listening = false;

function measure() {
  ctx.vh = window.innerHeight;
  ctx.docHeight = document.documentElement.scrollHeight;
}

function frame() {
  ticking = false;
  ctx.scrollY = window.scrollY;
  jobs.forEach((job) => job.read(ctx));
  jobs.forEach((job) => job.write(ctx));
}

export function requestFrame() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(frame);
}

function listen() {
  if (listening) return;
  listening = true;
  measure();
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    requestFrame();
  });
  document.fonts?.ready.then(() => {
    measure();
    requestFrame();
  });
  new ResizeObserver(() => {
    measure();
    requestFrame();
  }).observe(document.body);
}

export function addFrameJob(job: Job) {
  listen();
  jobs.add(job);
  requestFrame();
  return () => {
    jobs.delete(job);
  };
}

/**
 * Register a scroll-driven read/write pair for as long as `enabled` is true.
 * The callbacks are read from refs, so they can close over fresh props without re-registering.
 */
export function useScrollFrame(
  read: (ctx: FrameContext) => void,
  write: (ctx: FrameContext) => void,
  enabled = true,
) {
  const r = useRef(read);
  const w = useRef(write);
  useEffect(() => {
    r.current = read;
    w.current = write;
  });
  useEffect(() => {
    if (!enabled) return;
    return addFrameJob({ read: (c) => r.current(c), write: (c) => w.current(c) });
  }, [enabled]);
}
