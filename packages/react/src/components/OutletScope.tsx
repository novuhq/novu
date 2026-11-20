import { type PropsWithChildren, useMemo } from 'react';
import { OutletScopeProvider } from '../context/NovuUIContext';
import { OutletStore } from '../context/OutletStore';
import { OutletHost } from './OutletHost';

type OutletScopeProps = PropsWithChildren<{
  /** A store the parent already holds, because it built renderers on it during its own render; otherwise one is created. */
  store?: OutletStore;
}>;

/**
 * Hosts the outlets of the component that renders it, at that component's place in the React tree.
 *
 * React events from portal content bubble through the React tree, not the DOM. A custom bell rendered inside a
 * host's popover trigger only reaches the trigger's `onClick` when its portal sits beneath the trigger, so the
 * components a host can wrap in children mode (`Bell`, `Notifications`, `InboxContent`) carry their own scope
 * instead of leaving their outlets to the outermost scope in `NovuUI`.
 */
export const OutletScope = ({ store, children }: OutletScopeProps) => {
  const outlets = useMemo(() => store ?? new OutletStore(), [store]);

  return (
    <OutletScopeProvider value={outlets}>
      {children}
      {/* after the children on purpose: their render props update refs during render, the outlets read them */}
      <OutletHost store={outlets} />
    </OutletScopeProvider>
  );
};
