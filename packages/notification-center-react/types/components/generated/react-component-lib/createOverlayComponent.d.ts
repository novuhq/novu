import React from 'react';
import { OverlayEventDetail } from './interfaces';
import { StencilReactForwardedRef } from './utils';
interface OverlayElement extends HTMLElement {
  present: () => Promise<void>;
  dismiss: (data?: any, role?: string | undefined) => Promise<boolean>;
}
export interface ReactOverlayProps {
  children?: React.ReactNode;
  isOpen: boolean;
  onDidDismiss?: (event: CustomEvent<OverlayEventDetail>) => void;
  onDidPresent?: (event: CustomEvent<OverlayEventDetail>) => void;
  onWillDismiss?: (event: CustomEvent<OverlayEventDetail>) => void;
  onWillPresent?: (event: CustomEvent<OverlayEventDetail>) => void;
}
export declare const createOverlayComponent: <OverlayComponent extends object, OverlayType extends OverlayElement>(
  tagName: string,
  controller: {
    create: (options: any) => Promise<OverlayType>;
  },
  customElement?: any
) => React.ForwardRefExoticComponent<
  React.PropsWithoutRef<
    OverlayComponent &
      ReactOverlayProps & {
        forwardedRef?: StencilReactForwardedRef<OverlayType>;
      }
  > &
    React.RefAttributes<OverlayType>
>;
export {};
