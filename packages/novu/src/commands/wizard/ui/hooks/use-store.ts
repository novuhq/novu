import type { ReadableAtom } from 'nanostores';
import React from 'react';

/**
 * React hook that subscribes to a nanostores atom via `useSyncExternalStore`.
 * Returns the current value and triggers a re-render whenever the atom emits.
 *
 * We avoid importing `@nanostores/react` to keep the wizard bundle small —
 * the ~10 lines below cover everything we need.
 */
export function useStore<T>(atom: ReadableAtom<T>): T {
  const subscribe = React.useCallback(
    (cb: () => void) => {
      const unsubscribe = atom.subscribe(() => cb());

      return unsubscribe;
    },
    [atom]
  );
  const getSnapshot = React.useCallback(() => atom.get(), [atom]);

  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
