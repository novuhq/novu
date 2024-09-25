import React from 'react';
import type { NotificationClickHandler, NotificationActionClickHandler } from '@novu/js/ui';
import { Mounter } from './Mounter';
import { NotificationsRenderer } from '../utils/types';
import { useRenderer } from '../context/RendererContext';
import { useNovuUI } from '../context/NovuUIContext';
import { withRenderer } from './Renderer';

export type NotificationProps = {
  renderNotification?: NotificationsRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

const _Notifications = React.memo((props: NotificationProps) => {
  const { onNotificationClick, onPrimaryActionClick, renderNotification, onSecondaryActionClick } = props;
  const { novuUI } = useNovuUI();
  const { mountElement } = useRenderer();

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

export const Notifications = withRenderer(_Notifications);
