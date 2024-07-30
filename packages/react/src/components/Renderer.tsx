import React from 'react';
import ReactDOM from 'react-dom';
import type { NovuUI, NovuUIOptions } from '@novu/js/ui';
import { MountedElement, RendererProvider } from '../context/RenderContext';

type RendererProps = React.PropsWithChildren<{
  options: NovuUIOptions;
}>;

export const Renderer = (props: RendererProps) => {
  const { options, children } = props;
  const [novuUI, setNovuUI] = React.useState<NovuUI | undefined>();
  const [mountedElements, setMountedElements] = React.useState(new Map<HTMLElement, MountedElement>());

  const mountElement = React.useCallback(
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

  React.useEffect(() => {
    const loadNovuUI = async () => {
      const { NovuUI } = await import('@novu/js/ui');
      const ui = new NovuUI(options);
      setNovuUI(ui);
    };

    loadNovuUI();
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
