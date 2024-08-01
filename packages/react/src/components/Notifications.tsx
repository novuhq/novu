import React from 'react';
import { useRenderer } from '../context/RendererContext';
import { NotificationsRenderProps } from '../utils/types';
import { Mounter } from './Mounter';
import type { NotificationClickHandler, NotificationActionClickHandler } from '@novu/js/ui';

export type NotificationProps = {
  children?: never | NotificationsRenderProps;
  onNotificationClick?: NotificationClickHandler;
  onActionClick?: NotificationActionClickHandler;
};

export const Notifications = React.memo(({ children, onNotificationClick, onActionClick }: NotificationProps) => {
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
              onActionClick,
            }
          : { onNotificationClick, onActionClick },
      });
    },
    [children, onNotificationClick, onActionClick]
  );

  return <Mounter mount={mount} />;
});
