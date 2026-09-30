import { whenExitAnimationEnds } from '@novu/js/ui-core';
import { useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

type PresenceState = 'open' | 'closed';

/**
 * Keeps an element mounted while its exit animation plays: the React twin of the engine's `createPresence`, so a
 * block animates the same way in both renderers.
 *
 * Render the element while `isMounted`, with `ref` and `data-state={state}`; the core motion recipes animate `open`
 * in and `closed` out. With `appear: false` an element that is present from the start renders no state until
 * `present` first changes, so it does not animate on mount.
 */
export const usePresence = <T extends Element>(present: boolean, { appear = true }: { appear?: boolean } = {}) => {
  const ref = useRef<T>(null);
  const [isMounted, setIsMounted] = useState(present);
  const [hasChanged, setHasChanged] = useState(appear || !present);
  const [previous, setPrevious] = useState(present);

  // Adjusted while rendering, so the render that follows the change already carries `closed` for the exit to start.
  if (present !== previous) {
    setPrevious(present);
    setHasChanged(true);
    if (present) {
      setIsMounted(true);
    }
  }

  useIsomorphicLayoutEffect(() => {
    if (present) {
      return undefined;
    }

    return whenExitAnimationEnds(ref.current, () => setIsMounted(false));
  }, [present]);

  const state: PresenceState | undefined = hasChanged ? (present ? 'open' : 'closed') : undefined;

  return { ref, isMounted, state };
};
