import { createContextAndHook } from '@/utils/createContextAndHook';
import { ReactNode } from 'react';
import type { NovuUI } from '@novu/js/ui';

export type MountedElement = ReactNode;
export type MountedElements = Map<HTMLElement, MountedElement>;

type RendererContextValue = {
  mountElement: (el: HTMLElement, mountedElement: MountedElement) => () => void;
  novuUI: NovuUI;
};

const [RendererContext, useRendererContext] = createContextAndHook<RendererContextValue>('RendererContext');

const RendererProvider = (props: React.PropsWithChildren<{ value: RendererContextValue }>) => {
  return <RendererContext.Provider value={{ value: props.value }}>{props.children}</RendererContext.Provider>;
};

export { useRendererContext as useRenderer, RendererProvider };
