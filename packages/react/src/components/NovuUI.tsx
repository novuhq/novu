import { Novu } from '@novu/js';
import type { NovuUIOptions as JsNovuUIOptions } from '@novu/js/ui';
import { NovuUI as NovuUIClass } from '@novu/js/ui';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NovuUIProvider } from '../context/NovuUIContext';
import { useRenderer } from '../context/RendererContext';
import { useDataRef } from '../hooks/internal/useDataRef';
import { adaptAppearanceForJs } from '../utils/appearance';
import type { ReactAppearance } from '../utils/types';
import { ShadowRootDetector } from './ShadowRootDetector';

type NovuUIProps = Omit<JsNovuUIOptions, 'appearance'> & {
  appearance?: ReactAppearance;
};

type RendererProps = React.PropsWithChildren<{
  options: NovuUIProps;
  novu?: Novu;
}>;

const findParentShadowRoot = (child?: HTMLDivElement | null): Node | null => {
  if (!child) {
    return null;
  }

  let node: Node | null = child;

  while (node) {
    if (node instanceof Element && node.shadowRoot) {
      return node.shadowRoot;
    }

    if (node instanceof ShadowRoot) {
      return node;
    }

    node = node.parentNode;

    if (!node || node === document) {
      break;
    }
  }

  return null;
};

export const NovuUI = ({ options, novu, children }: RendererProps) => {
  const shadowRootDetector = useRef<HTMLDivElement>(null);
  const { mountElement } = useRenderer();

  const adaptedAppearanceForUpdate = useMemo(
    () => adaptAppearanceForJs(options.appearance || {}, mountElement),
    [options.appearance, mountElement]
  );

  const adaptedOptions = useMemo(() => {
    return {
      ...options,
      appearance: adaptedAppearanceForUpdate,
      novu,
    };
  }, [options, novu, adaptedAppearanceForUpdate]);

  const optionsRef = useDataRef(adaptedOptions);
  const [novuUI, setNovuUI] = useState<NovuUIClass | undefined>();

  useEffect(() => {
    const parentShadowRoot = findParentShadowRoot(shadowRootDetector.current);
    const instance = new NovuUIClass({
      ...optionsRef.current,
      container: optionsRef.current.container ?? parentShadowRoot,
    });
    setNovuUI(instance);

    return () => {
      instance.unmount();
    };
  }, []);

  useEffect(() => {
    if (!novuUI) {
      return;
    }

    const parentShadowRoot = findParentShadowRoot(shadowRootDetector.current);
    novuUI.updateContainer(options.container ?? parentShadowRoot);
    novuUI.updateAppearance(adaptedAppearanceForUpdate);
    novuUI.updateLocalization(options.localization);
    novuUI.updateTabs(options.tabs);
    novuUI.updateOptions(options.options);
    novuUI.updateRouterPush(options.routerPush);
  }, [
    shadowRootDetector,
    novuUI,
    adaptedAppearanceForUpdate,
    options.localization,
    options.tabs,
    options.options,
    options.routerPush,
  ]);

  return (
    <>
      <ShadowRootDetector ref={shadowRootDetector} />
      {novuUI && <NovuUIProvider value={{ novuUI }}>{children}</NovuUIProvider>}
    </>
  );
};
