import { subscribeAccessor } from '@novu/js/ui-core';
import { useCallback, useSyncExternalStore } from 'react';

/** Reads a core store accessor and re-renders when it changes. Accessors return stable references until they change. */
export function useEngineAccessor<T>(accessor: () => T): T {
  const subscribe = useCallback((onChange: () => void) => subscribeAccessor(accessor, onChange), [accessor]);

  return useSyncExternalStore(subscribe, accessor, accessor);
}
