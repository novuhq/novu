import { type Accessor, createSignal, onCleanup } from 'solid-js';

/**
 * How much the engine animates. `full` plays every transition, `reduced` keeps fades only (the OS asks for less
 * motion), `off` plays nothing (`appearance.animations: false`).
 */
export type MotionMode = 'full' | 'reduced' | 'off';

/** `animations: false` wins; otherwise the OS preference decides. `animations: true` does not override it. */
export const resolveMotionMode = (animations: boolean, prefersReducedMotion: boolean): MotionMode => {
  if (!animations) {
    return 'off';
  }

  return prefersReducedMotion ? 'reduced' : 'full';
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * The OS "reduce motion" preference as a signal. Without `matchMedia` (a server render, jsdom) it is `false`.
 * Call it inside a reactive owner: the listener is removed when the owner is disposed.
 */
export const createPrefersReducedMotion = (): Accessor<boolean> => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => false;
  }

  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  const [prefersReducedMotion, setPrefersReducedMotion] = createSignal(query.matches);
  const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', onChange);
    onCleanup(() => query.removeEventListener('change', onChange));
  } else {
    // Safari before 14 only knows the deprecated listener API.
    query.addListener(onChange);
    onCleanup(() => query.removeListener(onChange));
  }

  return prefersReducedMotion;
};
