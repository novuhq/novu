import type { NovuUI } from '@novu/js/ui';
import React from 'react';
import { createContextAndHook } from '../utils/createContextAndHook';
import type { ReactAllIconOverrides } from '../utils/types';
import type { OutletStore } from './OutletStore';

type NovuUIContextValue = {
  novuUI: NovuUI;
  outlets: OutletStore;
  /** The host's own icon overrides, so host-native blocks render them without a trip through the bridge. */
  icons: ReactAllIconOverrides;
};

const [NovuUIContext, useNovuUIContext, useUnsafeNovuUIContext] =
  createContextAndHook<NovuUIContextValue>('NovuUIContext');

const NovuUIProvider = (props: React.PropsWithChildren<{ value: NovuUIContextValue }>) => {
  return <NovuUIContext.Provider value={{ value: props.value }}>{props.children}</NovuUIContext.Provider>;
};

const useOutlets = () => useNovuUIContext().outlets;

export { useNovuUIContext as useNovuUI, useUnsafeNovuUIContext as useUnsafeNovuUI, NovuUIProvider, useOutlets };
