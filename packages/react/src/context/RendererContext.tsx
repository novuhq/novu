import React from 'react';
import type { NovuUI } from '@novu/js/ui';
import { createContextAndHook } from '../utils/createContextAndHook';

export type MountedElement = React.ReactNode;
export type MountedElements = Map<HTMLElement, MountedElement>;

type RendererContextValue = {
  mountElement: (el: HTMLElement, mountedElement: MountedElement) => () => void;
};

const [RendererContext, useRendererContext, useUnsafeRendererContext] =
  createContextAndHook<RendererContextValue>('RendererContext');

const RendererProvider = (props: React.PropsWithChildren<{ value: RendererContextValue }>) => {
  return <RendererContext.Provider value={{ value: props.value }}>{props.children}</RendererContext.Provider>;
};

export { useRendererContext as useRenderer, useUnsafeRendererContext as useUnsafeRenderer, RendererProvider };
