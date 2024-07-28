import { MountedElement, RendererProvider } from '@/context/RendererContext';
import type { NovuUI, NovuUIOptions } from '@novu/js/ui';
import { PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type RendererProps = PropsWithChildren<{
  options: NovuUIOptions;
}>;
export const Renderer = (props: RendererProps) => {
  const { options, children } = props;
  const [novuUI, setNovuUI] = useState<NovuUI | undefined>();
  const [mountedElements, setMountedElements] = useState(new Map<HTMLElement, MountedElement>());

  const mountElement = useCallback(
    (el: HTMLElement, mountedElement: MountedElement) => {
      setMountedElements((mountedElements) => {
        const newMountedElements = new Map(mountedElements);
        newMountedElements.set(el, mountedElement);
        return newMountedElements;
      });

      return () => {
        setMountedElements((mountedElements) => {
          const newMountedElements = new Map(mountedElements);
          newMountedElements.delete(el);
          return newMountedElements;
        });
      };
    },
    [setMountedElements]
  );

  useEffect(() => {
    //require here as it won't work in SSR.
    const { NovuUI } = require('@novu/js/ui');
    // we could import above and have types here but `mount` can't be async, since the unmount method is
    // returned and couldn't be used as a cleanup successfully.
    const ui = new (NovuUI as new (options: NovuUIOptions) => NovuUI)(options) as NovuUI;
    setNovuUI(ui);
  }, []);

  if (!novuUI) {
    return null;
  }

  return (
    <RendererProvider value={{ mountElement, novuUI }}>
      {[...mountedElements].map(([element, mountedElement]) => {
        return createPortal(mountedElement, element);
      })}
      {children}
    </RendererProvider>
  );
};
