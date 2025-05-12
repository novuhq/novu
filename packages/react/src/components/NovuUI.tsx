import { Novu } from '@novu/js';
import type { NovuUIOptions as JsNovuUIOptions } from '@novu/js/ui';
import { NovuUI as NovuUIClass } from '@novu/js/ui';
import React, { useEffect, useMemo, useState } from 'react';
import { NovuUIProvider } from '../context/NovuUIContext';
import { useDataRef } from '../hooks/internal/useDataRef';
import type { ReactAppearance } from '../utils/types';
import { adaptAppearanceForJs } from '../utils/appearance';

type NovuUIProps = Omit<JsNovuUIOptions, 'appearance'> & {
  appearance?: ReactAppearance;
};

type RendererProps = React.PropsWithChildren<{
  options: NovuUIProps;
  novu?: Novu;
}>;

export const NovuUI = ({ options, novu, children }: RendererProps) => {
  const adaptedOptions = useMemo(() => {
    return {
      ...options,
      appearance: adaptAppearanceForJs(options.appearance),
      novu,
    };
  }, [options, novu]);

  const optionsRef = useDataRef(adaptedOptions);
  const [novuUI, setNovuUI] = useState<NovuUIClass | undefined>();

  useEffect(() => {
    const instance = new NovuUIClass(optionsRef.current as JsNovuUIOptions);
    setNovuUI(instance);

    return () => {
      instance.unmount();
    };
  }, []);

  const adaptedAppearanceForUpdate = useMemo(() => adaptAppearanceForJs(options.appearance), [options.appearance]);

  useEffect(() => {
    if (!novuUI) {
      return;
    }

    if (adaptedAppearanceForUpdate !== undefined) {
      novuUI.updateAppearance(adaptedAppearanceForUpdate);
    }
    novuUI.updateLocalization(options.localization);
    novuUI.updateTabs(options.tabs);
    novuUI.updateOptions(options.options);
    novuUI.updateRouterPush(options.routerPush);
  }, [novuUI, adaptedAppearanceForUpdate, options.localization, options.tabs, options.options, options.routerPush]);

  if (!novuUI) {
    return null;
  }

  return <NovuUIProvider value={{ novuUI }}>{children}</NovuUIProvider>;
};
