import { type Accessor, createEffect, createMemo, createSignal, on, onCleanup, untrack } from 'solid-js';
import { whenExitAnimationEnds } from '../core/motion/presence';

export type PresenceState = 'open' | 'closed';

type CreatePresenceOptions = {
  present: Accessor<boolean>;
  /** The element that plays the exit animation. */
  element: Accessor<Element | null | undefined>;
  /**
   * Whether an element that is present from the start animates in. With `false` it renders no state until
   * `present` first changes, so dots and badges that are already there when a list loads stay still.
   */
  appear?: boolean;
};

/**
 * Keeps an element mounted while its exit animation plays.
 *
 * Render the element while `isMounted()` and give it `data-state={state()}`; a motion recipe
 * (`nt-motion-*`) animates `open` in and `closed` out. `isMounted` follows `present` up at once and follows it down
 * only when the exit animation has finished. Reopening during the exit keeps the element.
 */
export const createPresence = (options: CreatePresenceOptions) => {
  const initiallyPresent = untrack(options.present);
  const [isMounted, setIsMounted] = createSignal(initiallyPresent);
  let cancelExit: (() => void) | undefined;

  // A memo, not an effect: the element's `data-state` must be `closed` before the effect below reads its styles.
  let isInitial = true;
  const state = createMemo<PresenceState | undefined>(() => {
    const present = options.present();
    if (isInitial) {
      isInitial = false;
      if (present && options.appear === false) {
        return undefined;
      }
    }

    return present ? 'open' : 'closed';
  });

  // Not deferred: `present` can already have changed by the time effects first run (a parent effect that sets the
  // initial value), and that change must not be lost.
  createEffect(
    on(options.present, (present) => {
      cancelExit?.();
      cancelExit = undefined;

      if (present) {
        setIsMounted(true);

        return;
      }
      if (!untrack(isMounted)) {
        return;
      }

      cancelExit = whenExitAnimationEnds(untrack(options.element), () => {
        cancelExit = undefined;
        if (!untrack(options.present)) {
          setIsMounted(false);
        }
      });
    })
  );

  onCleanup(() => cancelExit?.());

  return { isMounted, state };
};
