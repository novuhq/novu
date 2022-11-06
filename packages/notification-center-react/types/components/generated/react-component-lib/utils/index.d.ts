import React from 'react';
import type { StyleReactProps } from '../interfaces';
export declare type StencilReactExternalProps<PropType, ElementType> = PropType &
  Omit<React.HTMLAttributes<ElementType>, 'style'> &
  StyleReactProps;
export declare type StencilReactForwardedRef<T> =
  | ((instance: T | null) => void)
  | React.MutableRefObject<T | null>
  | null;
export declare const setRef: (ref: StencilReactForwardedRef<any> | React.Ref<any> | undefined, value: any) => void;
export declare const mergeRefs: (
  ...refs: (StencilReactForwardedRef<any> | React.Ref<any> | undefined)[]
) => React.RefCallback<any>;
export declare const createForwardRef: <PropType, ElementType>(
  ReactComponent: any,
  displayName: string
) => React.ForwardRefExoticComponent<
  React.PropsWithoutRef<PropType & Omit<React.HTMLAttributes<ElementType>, 'style'> & StyleReactProps> &
    React.RefAttributes<ElementType>
>;
export declare const defineCustomElement: (tagName: string, customElement: any) => void;
export * from './attachProps';
export * from './case';
