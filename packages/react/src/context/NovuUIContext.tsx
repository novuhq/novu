import React from 'react';
import type { NovuUI } from '@novu/js/ui';
import { createContextAndHook } from '../utils/createContextAndHook';

type NovuUIContextValue = {
  novuUI: NovuUI;
};

const [NovuUIContext, useNovuUIContext, useUnsafeNovuUIContext] =
  createContextAndHook<NovuUIContextValue>('NovuUIContext');

const NovuUIProvider = (props: React.PropsWithChildren<{ value: NovuUIContextValue }>) => {
  return <NovuUIContext.Provider value={{ value: props.value }}>{props.children}</NovuUIContext.Provider>;
};

export { useNovuUIContext as useNovuUI, useUnsafeNovuUIContext as useUnsafeNovuUI, NovuUIProvider };
