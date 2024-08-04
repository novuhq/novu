import React from 'react';
import { useRenderer } from '../context/RendererContext';
import { NotificationsRenderProps } from '../utils/types';
import { Mounter } from './Mounter';
import type { NotificationClickHandler, NotificationActionClickHandler } from '@novu/js/ui';

export type NotificationProps = {
  children?: never | NotificationsRenderProps;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

export const Notifications = React.memo(
  ({ children, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick }: NotificationProps) => {
    const { novuUI, mountElement } = useRenderer();

    const mount = React.useCallback(
      (element: HTMLElement) => {
        return novuUI.mountComponent({
          name: 'Notifications',
          element,
          props: children
            ? {
                mountNotification: (el, { notification }) => mountElement(el, children?.({ notification })),
                onNotificationClick,
                onPrimaryActionClick,
                onSecondaryActionClick,
              }
            : { onNotificationClick, onPrimaryActionClick, onSecondaryActionClick },
        });
      },
      [children, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick]
    );

    return <Mounter mount={mount} />;
  }
);
