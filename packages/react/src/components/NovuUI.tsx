import { Novu } from '@novu/js';
import type { NovuUIOptions } from '@novu/js/ui';
import { NovuUI as NovuUIClass } from '@novu/js/ui';
import React, { useEffect, useState } from 'react';
import { NovuUIProvider } from '../context/NovuUIContext';
import { useDataRef } from '../hooks/internal/useDataRef';

type RendererProps = React.PropsWithChildren<{
  options: NovuUIOptions;
  novu?: Novu;
}>;

export const NovuUI = ({ options, novu, children }: RendererProps) => {
  const optionsRef = useDataRef({ ...options, novu });
  const [novuUI, setNovuUI] = useState<NovuUIClass | undefined>();

  useEffect(() => {
    const novu = new NovuUIClass(optionsRef.current);
    setNovuUI(novu);

    return () => {
      novu.unmount();
    };
  }, []);

  useEffect(() => {
    if (!novuUI) {
      return;
    }

    novuUI.updateAppearance(options.appearance);
    novuUI.updateLocalization(options.localization);
    novuUI.updateTabs(options.tabs);
    novuUI.updateOptions(options.options);
    novuUI.updateRouterPush(options.routerPush);
  }, [options]);

  if (!novuUI) {
    return null;
  }

  return <NovuUIProvider value={{ novuUI }}>{children}</NovuUIProvider>;
};
