import React, { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { OutletEntry, OutletStore } from '../context/OutletStore';

const OutletContent = ({ entry }: { entry: OutletEntry }) => {
  return <>{entry.render(...entry.args)}</>;
};

/**
 * Renders every outlet of one engine instance as a keyed portal. Keys are outlet ids, so removing one outlet
 * never shifts the others onto a different container, and a data change re-renders the content in place.
 */
export const OutletHost = ({ store }: { store: OutletStore }) => {
  const { entries } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  return (
    <>{Array.from(entries.values(), (entry) => createPortal(<OutletContent entry={entry} />, entry.el, entry.id))}</>
  );
};
