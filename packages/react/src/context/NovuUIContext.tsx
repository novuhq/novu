import type { NovuUI } from '@novu/js/ui';
import React from 'react';
import { assertContextExists, createContextAndHook } from '../utils/createContextAndHook';
import type { ReactAllIconOverrides } from '../utils/types';
import type { OutletStore } from './OutletStore';

type NovuUIContextValue = {
  novuUI: NovuUI;
  /** The host's own icon overrides, so host-native blocks render them without a trip through the bridge. */
  icons: ReactAllIconOverrides;
};

const [NovuUIContext, useNovuUIContext, useUnsafeNovuUIContext] =
  createContextAndHook<NovuUIContextValue>('NovuUIContext');

const NovuUIProvider = (props: React.PropsWithChildren<{ value: NovuUIContextValue }>) => {
  return <NovuUIContext.Provider value={{ value: props.value }}>{props.children}</NovuUIContext.Provider>;
};

/**
 * The outlet store of the nearest `OutletScope`; `NovuUI` renders the outermost one. React events from portal content
 * bubble along the React tree, so a render prop is adapted inside a scope whose host sits beneath whatever the host
 * app wraps around the component. There is no fallback.
 */
const OutletScopeContext = React.createContext<OutletStore | undefined>(undefined);
OutletScopeContext.displayName = 'OutletScopeContext';
const OutletScopeProvider = OutletScopeContext.Provider;

/** The nearest scope, or `undefined` outside any; for code that only registers with a scope when there is one. */
const useOutletScope = () => React.useContext(OutletScopeContext);

const useOutlets = () => {
  const outlets = React.useContext(OutletScopeContext);
  assertContextExists(
    outlets,
    'Render props must be adapted inside an OutletScope, so the component that owns them hosts their portals'
  );

  return outlets;
};

export {
  useNovuUIContext as useNovuUI,
  useUnsafeNovuUIContext as useUnsafeNovuUI,
  NovuUIProvider,
  OutletScopeProvider,
  useOutlets,
  useOutletScope,
};
