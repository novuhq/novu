import { ComponentType, PropsWithChildren, useCallback, useState } from 'react';
import { MountedElement, RendererProvider } from '../context/RendererContext';
import { createPortal } from 'react-dom';

type RendererProps = PropsWithChildren;
export const Renderer = (props: RendererProps) => {
  const { children } = props;
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

  return (
    <RendererProvider value={{ mountElement }}>
      {[...mountedElements].map(([element, mountedElement]) => {
        return createPortal(mountedElement, element);
      })}

      {children}
    </RendererProvider>
  );
};

export const withRenderer = <P extends object>(
  WrappedComponent: ComponentType<P>
): ComponentType<P & PropsWithChildren<{}>> => {
  const HOC = (props: P) => {
    return (
      <Renderer>
        <WrappedComponent {...props} />
      </Renderer>
    );
  };

  HOC.displayName = `WithRenderer(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return HOC;
};
