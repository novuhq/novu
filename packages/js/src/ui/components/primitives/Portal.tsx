import { ComponentProps } from 'solid-js';
import { Portal as PortalPrimitive } from 'solid-js/web';
import { useAppearance } from '../../context/AppearanceContext';

export const Portal = (props: ComponentProps<typeof PortalPrimitive>) => {
  const appearance = useAppearance();
  let currentElement!: HTMLElement;

  return (
    <>
      <div
        style={{ display: 'none' }}
        ref={(el) => {
          currentElement = el;
        }}
      />
      <PortalPrimitive mount={closestNovuRootParent(currentElement, appearance.id())} {...props} />
    </>
  );
};

const closestNovuRootParent = (el: HTMLElement, id: string) => {
  let element = el;

  while (element && element.id !== `novu-root-${id}`) {
    element = element.parentElement!;
  }

  if (element && element.id === `novu-root-${id}`) {
    return element;
  }

  return undefined;
};
