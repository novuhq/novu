import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';
import { stubReducedMotionQuery } from '../../testing/fakes';
import { createPrefersReducedMotion, resolveMotionMode } from './mode';

describe('resolveMotionMode', () => {
  it.each([
    [true, false, 'full'],
    [true, true, 'reduced'],
    [false, false, 'off'],
    [false, true, 'off'],
  ] as const)('animations %s with reduced motion %s is %s', (animations, prefersReducedMotion, mode) => {
    expect(resolveMotionMode(animations, prefersReducedMotion)).toBe(mode);
  });
});

describe('createPrefersReducedMotion', () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it('is false where there is no matchMedia, as in a server render', () => {
    const prefersReducedMotion = createRoot(() => createPrefersReducedMotion());

    expect(prefersReducedMotion()).toBe(false);
  });

  it('follows the OS preference and stops listening when its owner is disposed', () => {
    const query = stubReducedMotionQuery(true);
    restore = query.restore;
    const { prefersReducedMotion, dispose } = createRoot((dispose) => ({
      prefersReducedMotion: createPrefersReducedMotion(),
      dispose,
    }));

    expect(prefersReducedMotion()).toBe(true);

    query.setMatches(false);
    expect(prefersReducedMotion()).toBe(false);

    dispose();
    expect(query.listenerCount()).toBe(0);
  });
});
