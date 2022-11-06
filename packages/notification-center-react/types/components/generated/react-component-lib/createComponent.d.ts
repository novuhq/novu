import React from 'react';
export interface HTMLStencilElement extends HTMLElement {
  componentOnReady(): Promise<this>;
}
interface StencilReactInternalProps<ElementType> extends React.HTMLAttributes<ElementType> {
  forwardedRef: React.RefObject<ElementType>;
  ref?: React.Ref<any>;
}
export declare const createReactComponent: <
  PropType,
  ElementType extends HTMLStencilElement,
  ContextStateType = {},
  ExpandedPropsTypes = {}
>(
  tagName: string,
  ReactComponentContext?: React.Context<ContextStateType>,
  manipulatePropsFunction?: (
    originalProps: StencilReactInternalProps<ElementType>,
    propsToPass: any
  ) => ExpandedPropsTypes,
  defineCustomElement?: () => void
) => React.ForwardRefExoticComponent<
  React.PropsWithoutRef<
    PropType & Omit<React.HTMLAttributes<ElementType>, 'style'> & import('./interfaces').StyleReactProps
  > &
    React.RefAttributes<ElementType>
>;
export {};
