import type { MotionMode } from '../core/motion/mode';
import { MOTION_DISTANCE_PX, MOTION_EASING, readMotionDurationMs } from '../core/motion/tokens';

/**
 * Motion for the items of a list, run with the Web Animations API on the item wrapper: the only box around an item,
 * since outlet and island wrappers are `display: contents`.
 */

const pendingEnters = new WeakMap<HTMLElement, () => void>();

const canAnimate = (element: HTMLElement) => typeof element.animate === 'function';

const clearInlineMotion = (item: HTMLElement) => {
  for (const property of ['height', 'opacity', 'overflow']) {
    item.style.removeProperty(property);
  }
};

/** Cancels a pending or running enter of `item` and clears what it set. */
export const stopItemMotion = (item: HTMLElement) => {
  pendingEnters.get(item)?.();
  pendingEnters.delete(item);
  for (const animation of item.getAnimations?.() ?? []) {
    animation.cancel();
  }
};

/** Whether `item` is rendered and at least partly inside the visible part of `scroller`. */
export const isItemOnScreen = (item: HTMLElement, scroller: HTMLElement | undefined): boolean => {
  if (!scroller || item.getClientRects().length === 0) {
    return false;
  }
  const itemRect = item.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();

  // An item without height yet (its host content is still rendering) counts when it starts inside the view.
  return itemRect.top < scrollerRect.bottom && (itemRect.bottom > scrollerRect.top || itemRect.top >= scrollerRect.top);
};

/**
 * Fades the item out while sliding it 8px toward the inline start, then collapses it so the items below move up.
 * `reduced` motion only fades it. `delay` staggers items that leave together. Returns `undefined` when there is
 * nothing to animate.
 */
export const animateItemExit = (item: HTMLElement, motion: MotionMode, delay = 0): Animation | undefined => {
  if (!canAnimate(item)) {
    return undefined;
  }
  const height = item.getBoundingClientRect().height;
  stopItemMotion(item);
  if (height === 0) {
    return undefined;
  }

  if (motion === 'reduced') {
    const duration = readMotionDurationMs(item, 'fast');

    return duration > 0
      ? item.animate([{ opacity: 1 }, { opacity: 0 }], { duration, delay, easing: 'linear', fill: 'both' })
      : undefined;
  }

  const duration = readMotionDurationMs(item, 'slow');
  if (duration <= 0) {
    return undefined;
  }
  // A shift toward the inline end would overflow the scrolling list and flash a horizontal scrollbar.
  const shift = (getComputedStyle(item).direction === 'rtl' ? 1 : -1) * MOTION_DISTANCE_PX.md;
  // Collapse the gap a host may have put between items too, so the items below don't jump at the end.
  const gap = item.parentElement ? Number.parseFloat(getComputedStyle(item.parentElement).rowGap) || 0 : 0;
  item.style.overflow = 'hidden';

  return item.animate(
    [
      {
        height: `${height}px`,
        opacity: 1,
        transform: 'translateX(0)',
        marginBottom: '0px',
        easing: MOTION_EASING.exit,
      },
      {
        height: `${height}px`,
        opacity: 0,
        transform: `translateX(${shift}px)`,
        marginBottom: '0px',
        offset: 0.4,
        easing: MOTION_EASING.standard,
      },
      { height: '0px', opacity: 0, transform: `translateX(${shift}px)`, marginBottom: `${-gap}px` },
    ],
    // `both`: the item keeps its measured height while it waits for its turn.
    { duration, delay, easing: 'linear', fill: 'both' }
  );
};

/**
 * Expands a newly inserted item from nothing. The item stays collapsed until the next frame: a host renders its
 * content into the item's outlet a microtask after the item is inserted, so its height is only known then.
 */
export const animateItemEnter = (item: HTMLElement, motion: MotionMode) => {
  if (!canAnimate(item)) {
    return;
  }
  stopItemMotion(item);

  if (motion === 'reduced') {
    const duration = readMotionDurationMs(item, 'fast');
    if (duration > 0) {
      item.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: 'linear' });
    }

    return;
  }

  const duration = readMotionDurationMs(item, 'slow');
  if (duration <= 0) {
    return;
  }
  item.style.height = '0px';
  item.style.opacity = '0';
  item.style.overflow = 'hidden';

  const frame = requestAnimationFrame(() => {
    pendingEnters.delete(item);
    if (!item.isConnected) {
      clearInlineMotion(item);

      return;
    }
    const height = item.scrollHeight;
    const animation = item.animate(
      [
        { height: '0px', opacity: 0 },
        { height: `${height}px`, opacity: 1 },
      ],
      {
        duration,
        easing: MOTION_EASING.enter,
      }
    );
    // The running animation wins over the inline styles; clearing them now leaves the natural size at the end.
    item.style.removeProperty('height');
    item.style.removeProperty('opacity');
    animation.finished.then(
      () => item.style.removeProperty('overflow'),
      () => item.style.removeProperty('overflow')
    );
  });

  pendingEnters.set(item, () => {
    cancelAnimationFrame(frame);
    clearInlineMotion(item);
  });
};

/**
 * Fades a whole list out before it shows other content, and holds the last frame until the animation is cancelled.
 * Returns `undefined` when there is nothing to animate, such as a list that isn't rendered.
 */
export const fadeOutList = (list: HTMLElement | undefined, motion: MotionMode): Animation | undefined => {
  if (!list || !canAnimate(list) || motion === 'off' || list.getClientRects().length === 0) {
    return undefined;
  }
  const duration = readMotionDurationMs(list, 'fast');

  return duration > 0
    ? list.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: MOTION_EASING.exit, fill: 'forwards' })
    : undefined;
};

/**
 * Fades a whole list in, for changes that swap its items without per-item motion. It also rises 8px, except in the
 * `reduced` motion mode.
 */
export const fadeInList = (list: HTMLElement | undefined, motion: MotionMode) => {
  if (!list || !canAnimate(list) || motion === 'off') {
    return;
  }
  const duration = readMotionDurationMs(list, 'slow');
  if (duration <= 0) {
    return;
  }
  const keyframes: Keyframe[] =
    motion === 'reduced'
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [
          { opacity: 0, transform: `translateY(${MOTION_DISTANCE_PX.md}px)` },
          { opacity: 1, transform: 'none' },
        ];
  list.animate(keyframes, { duration, easing: MOTION_EASING.enter });
};

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Moves focus out of an item that is leaving (it is inert, so focus inside it would be lost). A keyboard user lands
 * on the next item, or the previous one; a pointer user just loses the focus ring.
 */
export const moveFocusOutOf = (item: HTMLElement) => {
  const root = item.getRootNode() as Document | ShadowRoot;
  const active = root.activeElement as HTMLElement | null;
  if (!active || !item.contains(active)) {
    return;
  }

  let isFocusVisible = false;
  try {
    isFocusVisible = active.matches(':focus-visible');
  } catch {
    // Environments without `:focus-visible` support.
  }

  if (isFocusVisible) {
    const isSettled = (element: Element | null): element is HTMLElement =>
      element instanceof HTMLElement && !element.hasAttribute('data-leaving');
    let sibling = item.nextElementSibling;
    while (sibling && !isSettled(sibling)) {
      sibling = sibling.nextElementSibling;
    }
    if (!sibling) {
      sibling = item.previousElementSibling;
      while (sibling && !isSettled(sibling)) {
        sibling = sibling.previousElementSibling;
      }
    }
    const target = sibling?.querySelector<HTMLElement>(FOCUSABLE);
    if (target) {
      target.focus({ preventScroll: true });

      return;
    }
  }

  active.blur();
};
