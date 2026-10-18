/**
 * A critically damped (or slightly under-damped) spring, configured the way Apple does it:
 * `response` (seconds, how quickly it gets there) and `damping` (1 = no overshoot).
 * It retargets from the live value and keeps its velocity, so motion is always interruptible.
 * Under prefers-reduced-motion it jumps straight to the target.
 */

export interface SpringConfig {
  response?: number;
  damping?: number;
  /** Settle threshold in the value's own units. */
  eps?: number;
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Spring {
  value: number;
  target: number;
  velocity = 0;
  onUpdate: (value: number) => void;
  private k = 0;
  private c = 0;
  private eps: number;
  private raf = 0;
  private last = 0;

  constructor(initial: number, config: SpringConfig = {}, onUpdate: (value: number) => void = () => {}) {
    this.value = initial;
    this.target = initial;
    this.eps = config.eps ?? 0.001;
    this.onUpdate = onUpdate;
    this.configure(config);
  }

  configure({ response = 0.4, damping = 1 }: SpringConfig) {
    const w = (2 * Math.PI) / response;
    this.k = w * w;
    this.c = 2 * damping * w;
    return this;
  }

  /** Animate to `target`. Pass `velocity` (units/s) to hand off a gesture's momentum. */
  to(target: number, velocity?: number) {
    this.target = target;
    if (velocity !== undefined) this.velocity = velocity;
    if (prefersReducedMotion()) {
      this.set(target);
      return;
    }
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  /** Jump without animating (direct manipulation, keyboard input, reduced motion). */
  set(value: number) {
    this.stop();
    this.value = this.target = value;
    this.velocity = 0;
    this.onUpdate(value);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick = (now: number) => {
    const dt = Math.min(0.032, (now - this.last) / 1000);
    this.last = now;
    this.velocity += (-this.k * (this.value - this.target) - this.c * this.velocity) * dt;
    this.value += this.velocity * dt;
    if (Math.abs(this.value - this.target) < this.eps && Math.abs(this.velocity) < this.eps * 10) {
      this.value = this.target;
      this.velocity = 0;
      this.raf = 0;
    } else {
      this.raf = requestAnimationFrame(this.tick);
    }
    this.onUpdate(this.value);
  };
}
