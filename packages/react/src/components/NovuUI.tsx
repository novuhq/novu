import { Novu } from '@novu/js';
import type { NovuUIOptions as JsNovuUIOptions } from '@novu/js/ui';
import { NovuUI as NovuUIClass } from '@novu/js/ui';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NovuUIProvider } from '../context/NovuUIContext';
import { OutletStore } from '../context/OutletStore';
import { useDataRef } from '../hooks/internal/useDataRef';
import { useIsomorphicLayoutEffect } from '../hooks/internal/useIsomorphicLayoutEffect';
import { adaptAppearanceForJs } from '../utils/appearance';
import type {
  ReactAllAppearance,
  ReactAllIconOverrides,
  ReactInboxAppearance,
  ReactSubscriptionAppearance,
} from '../utils/types';
import { OutletHost } from './OutletHost';
import { ShadowRootDetector } from './ShadowRootDetector';

export type NovuUIOptions = Omit<JsNovuUIOptions, 'appearance'> & {
  appearance?: ReactInboxAppearance | ReactSubscriptionAppearance | ReactAllAppearance;
};

type NovuUIProps = React.PropsWithChildren<{
  options: NovuUIOptions;
  novu: Novu;
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

/**
 * Owns one engine instance and the outlet store that goes with it. Everything rendered below, portals into
 * outlets included, can reach both through `useNovuUI()`.
 */
export const NovuUI = ({ options, novu, children }: NovuUIProps) => {
  const shadowRootDetector = useRef<HTMLDivElement>(null);
  const outlets = useMemo(() => new OutletStore(), []);

  const adaptedAppearanceForUpdate = useMemo(
    () => adaptAppearanceForJs(options.appearance || {}, outlets),
    [options.appearance, outlets]
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

  useIsomorphicLayoutEffect(() => {
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
    novuUI.updateNovu(novu);
  }, [
    shadowRootDetector,
    novuUI,
    adaptedAppearanceForUpdate,
    options.localization,
    options.tabs,
    options.options,
    options.routerPush,
    novu,
  ]);

  const icons = options.appearance?.icons;
  const contextValue = useMemo(
    () => (novuUI ? { novuUI, outlets, icons: (icons ?? {}) as ReactAllIconOverrides } : undefined),
    [novuUI, outlets, icons]
  );

  return (
    <>
      <ShadowRootDetector ref={shadowRootDetector} />
      {contextValue && (
        <NovuUIProvider value={contextValue}>
          {children}
          {/* after the children on purpose: their render props update refs during render, the outlets read them */}
          <OutletHost store={outlets} />
        </NovuUIProvider>
      )}
    </>
  );
};
