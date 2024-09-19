import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { NovuUI } from '@novu/js/ui';
import type { NovuUIOptions } from '@novu/js/ui';
import { Novu } from '@novu/js';
import { MountedElement, RendererProvider } from '../context/RenderContext';
import { useDataRef } from '../hooks/internal/useDataRef';

type RendererProps = React.PropsWithChildren<{
  options: NovuUIOptions;
  novu?: Novu;
}>;

/**
 *
 * Renderer component that provides the NovuUI instance and mounts the elements on DOM in a portal
 */
export const Renderer = ({ options, novu, children }: RendererProps) => {
  const optionsRef = useDataRef({ ...options, novu });
  const [novuUI, setNovuUI] = useState<NovuUI | undefined>();
  const [mountedElements, setMountedElements] = useState(new Map<HTMLElement, MountedElement>());

  const mountElement = useCallback(
    (el: HTMLElement, mountedElement: MountedElement) => {
      setMountedElements((prev) => {
        const newMountedElements = new Map(prev);
        newMountedElements.set(el, mountedElement);

        return newMountedElements;
      });

      return () => {
        setMountedElements((prev) => {
          const newMountedElements = new Map(prev);
          newMountedElements.delete(el);

          return newMountedElements;
        });
      };
    },
    [setMountedElements]
  );

  useEffect(() => {
    const novu = new NovuUI(optionsRef.current);
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
    novuUI.updatePreferencesFilter(options.preferencesFilter);
  }, [options]);

  if (!novuUI) {
    return null;
  }

  return (
    <RendererProvider value={{ mountElement, novuUI }}>
      {[...mountedElements].map(([element, mountedElement]) => {
        return ReactDOM.createPortal(mountedElement, element);
      })}

      {children}
    </RendererProvider>
  );
};
