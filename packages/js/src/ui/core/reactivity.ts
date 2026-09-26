import { Accessor, observable } from 'solid-js';

/**
 * Subscribes a plain callback to a store accessor. Hosts without Solid's reactive runtime, such as React through
 * `useSyncExternalStore`, use this to re-render when core state changes. Returns the unsubscribe function.
 */
export const subscribeAccessor = <T>(accessor: Accessor<T>, onChange: () => void): (() => void) => {
  const { unsubscribe } = observable(accessor).subscribe(() => onChange());

  return unsubscribe;
};
