import React from 'react';
import { useRenderer } from '../context/RenderContext';
import { Mounter } from './Mounter';
import type { NotificationClickHandler, NotificationActionClickHandler } from '@novu/js/ui';
import { NotificationsRenderer } from '../utils/types';

export type NotificationProps = {
  renderNotification?: NotificationsRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

export const Notifications = React.memo((props: NotificationProps) => {
  const { onNotificationClick, onPrimaryActionClick, renderNotification, onSecondaryActionClick } = props;
  const { novuUI, mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'Notifications',
        element,
        props: {
          renderNotification: renderNotification
            ? (el, notification) => mountElement(el, renderNotification(notification))
            : undefined,
          onNotificationClick,
          onPrimaryActionClick,
          onSecondaryActionClick,
        },
      });
    },
    [renderNotification, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick]
  );

  return <Mounter mount={mount} />;
});
