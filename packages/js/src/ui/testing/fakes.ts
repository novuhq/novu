import { vi } from 'vitest';
import type { NotificationsCache } from '../../cache';
import type { Notification, Notifications } from '../../notifications';
import type { FiltersCountResponse } from '../../notifications/types';
import type { Novu } from '../../novu';

/**
 * Test doubles for the engine's collaborators. Each one is built as a `Partial` of the real type and asserted
 * once, so tests stay honest about which members they rely on.
 */

export const createFakeNotificationsCache = (overrides: Partial<NotificationsCache> = {}): NotificationsCache => {
  const cache: Partial<NotificationsCache> = {
    has: () => false,
    getAll: () => undefined,
    update: () => {},
    ...overrides,
  };

  return cache as NotificationsCache;
};

/**
 * A `count` implementation that satisfies both overloads of `Notifications['count']`: the single-filter shape and
 * the multi-filter shape are returned together, and callers read the one they asked for.
 */
export const createFakeCount = (counts: FiltersCountResponse['counts'] = []) =>
  vi.fn(async () => ({ data: { count: 0, filter: {}, counts } }));

export const createFakeNotificationsApi = (overrides: Partial<Notifications> = {}): Notifications => {
  const notifications: Partial<Notifications> = {
    count: createFakeCount(),
    cache: createFakeNotificationsCache(),
    ...overrides,
  };

  return notifications as Notifications;
};

export const createFakeNovu = (overrides: Partial<Novu> = {}): Novu => {
  const novu: Partial<Novu> = {
    applicationIdentifier: 'app',
    subscriberId: 'subscriber',
    contextKey: undefined,
    on: vi.fn(() => () => {}),
    notifications: createFakeNotificationsApi(),
    ...overrides,
  };

  return novu as Novu;
};

export const createFakeNotification = (overrides: Partial<Notification> = {}): Notification => {
  const notification: Partial<Notification> = {
    id: '1',
    subject: 'Subject',
    body: 'Body',
    isRead: false,
    isArchived: false,
    isSnoozed: false,
    createdAt: new Date().toISOString(),
    read: vi.fn(async () => ({})),
    unread: vi.fn(async () => ({})),
    archive: vi.fn(async () => ({})),
    completePrimary: vi.fn(async () => ({})),
    completeSecondary: vi.fn(async () => ({})),
    ...overrides,
  };

  return notification as Notification;
};

/** jsdom has no Web Animations API; tooltips and popovers animate through it. */
export const installAnimatePolyfill = () => {
  if (typeof Element.prototype.animate === 'function') {
    return;
  }

  Element.prototype.animate = () => {
    const animation: Partial<Animation> = {
      cancel() {},
      finish() {},
      play() {},
      pause() {},
      commitStyles() {},
      currentTime: 0,
      playState: 'finished',
      onfinish: null,
      effect: null,
    };
    Object.defineProperty(animation, 'finished', { value: Promise.resolve(animation) });

    return animation as Animation;
  };
};

/** An `Animation` whose `finished` settles only when the test calls `finish()` or `cancel()`, like a real one. */
export type ControlledAnimation = Animation & { finish: () => void; cancel: () => void };

export const createControlledAnimation = (): ControlledAnimation => {
  let resolveFinished: (animation: Animation) => void = () => {};
  let rejectFinished: (reason: unknown) => void = () => {};
  const finished = new Promise<Animation>((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });
  // A rejection nobody waits for must not fail the test run.
  finished.catch(() => {});

  const animation: Partial<Animation> & { playState: AnimationPlayState } = {
    playState: 'running',
    finish() {
      animation.playState = 'finished';
      resolveFinished(animation as Animation);
    },
    cancel() {
      animation.playState = 'idle';
      rejectFinished(new DOMException('The animation was cancelled', 'AbortError'));
    },
  };
  Object.defineProperty(animation, 'finished', { value: finished });

  return animation as ControlledAnimation;
};

/**
 * Replaces `Element.prototype.animate` with a spy that records every call and hands back a controlled animation.
 * `restore` puts the previous implementation (or none, as in jsdom) back.
 */
export const installAnimateSpy = () => {
  const calls: Array<{
    element: Element;
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null;
    options: number | KeyframeAnimationOptions | undefined;
    animation: ControlledAnimation;
  }> = [];
  const prototype = Element.prototype as { animate?: Element['animate'] };
  const original = prototype.animate;

  prototype.animate = function animate(this: Element, keyframes, options) {
    const animation = createControlledAnimation();
    calls.push({ element: this, keyframes, options, animation });

    return animation;
  };

  return {
    calls,
    restore: () => {
      if (original) {
        prototype.animate = original;
      } else {
        delete prototype.animate;
      }
    },
  };
};

/**
 * Makes `el` look like it plays a CSS exit animation: computed styles report one, and `getAnimations()` returns
 * the returned controlled animation.
 */
export const stubRunningExitAnimation = (el: HTMLElement, durationMs = 120) => {
  el.style.animationName = 'nv-exit';
  el.style.animationDuration = `${durationMs / 1000}s`;
  el.style.animationDelay = '0s';
  el.style.animationIterationCount = '1';
  const animation = createControlledAnimation();
  (el as { getAnimations?: () => Animation[] }).getAnimations = () =>
    animation.playState === 'running' ? [animation] : [];

  return animation;
};

/** A `matchMedia` for `prefers-reduced-motion`, which jsdom doesn't have. `restore` removes it again. */
export const stubReducedMotionQuery = (initiallyMatches: boolean) => {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const query = {
    matches: initiallyMatches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => listeners.delete(listener),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query)
  );

  return {
    listenerCount: () => listeners.size,
    setMatches: (matches: boolean) => {
      query.matches = matches;
      for (const listener of listeners) {
        listener({ matches });
      }
    },
    restore: () => vi.unstubAllGlobals(),
  };
};
