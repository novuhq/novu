const noop = () => {};

/** The longest finite `delay + duration * iterations` among the element's CSS animations, in milliseconds. */
const longestAnimationMs = (style: CSSStyleDeclaration): number => {
  const names = style.animationName.split(',').map((name) => name.trim());
  const durations = style.animationDuration.split(',');
  const delays = style.animationDelay.split(',');
  const iterations = style.animationIterationCount.split(',');
  const toMs = (value: string | undefined) => {
    const trimmed = (value ?? '').trim();
    const number = Number.parseFloat(trimmed);
    if (Number.isNaN(number)) {
      return 0;
    }

    return trimmed.endsWith('ms') ? number : number * 1000;
  };

  return names.reduce((longest, name, index) => {
    if (!name || name === 'none') {
      return longest;
    }
    // CSS repeats the shorter lists to match the number of animation names.
    const count = iterations[index % iterations.length]?.trim();
    if (count === 'infinite') {
      return longest;
    }
    const total =
      toMs(delays[index % delays.length]) +
      toMs(durations[index % durations.length]) * (Number.parseFloat(count ?? '1') || 1);

    return Math.max(longest, total);
  }, 0);
};

const isCssAnimation = (animation: Animation) =>
  typeof CSSAnimation === 'undefined' || animation instanceof CSSAnimation;

/**
 * Calls `done` once the exit animation running on `el` has finished, so the caller can remove the element.
 * Calls it right away when nothing runs: no DOM (a server render, a detached node), no CSS animation on the element
 * (jsdom, the `off` motion mode, an element without an exit style). Returns a function that cancels the wait.
 *
 * The caller must commit the closing state (`data-state="closed"`) first. Reading the computed style here flushes
 * that state, so the exit animation it starts is visible to `getAnimations()`.
 */
export const whenExitAnimationEnds = (el: Element | null | undefined, done: () => void): (() => void) => {
  if (typeof window === 'undefined' || !el || !el.isConnected) {
    done();

    return noop;
  }

  const style = getComputedStyle(el);
  const totalMs = longestAnimationMs(style);
  if (style.display === 'none' || totalMs <= 0) {
    done();

    return noop;
  }

  let settled = false;
  const cleanups: Array<() => void> = [];
  const cancel = () => {
    settled = true;
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
  const finish = () => {
    if (settled) {
      return;
    }
    cancel();
    done();
  };

  // A cap for animations that never report back (the tab is hidden, the element was moved).
  const timeout = setTimeout(finish, Math.min(totalMs, 1000) + 50);
  cleanups.push(() => clearTimeout(timeout));

  if (typeof el.getAnimations === 'function') {
    const running = el
      .getAnimations()
      .filter(
        (animation) =>
          isCssAnimation(animation) && animation.playState !== 'finished' && animation.playState !== 'paused'
      );
    if (running.length === 0) {
      finish();

      return cancel;
    }
    // A cancelled animation (the element reopened) rejects `finished`; the caller checks whether it is still closed.
    void Promise.all(running.map((animation) => animation.finished.catch(noop))).then(finish);

    return cancel;
  }

  const onAnimationEnd = (event: Event) => {
    if (event.target === el) {
      finish();
    }
  };
  el.addEventListener('animationend', onAnimationEnd);
  el.addEventListener('animationcancel', onAnimationEnd);
  cleanups.push(() => {
    el.removeEventListener('animationend', onAnimationEnd);
    el.removeEventListener('animationcancel', onAnimationEnd);
  });

  return cancel;
};
