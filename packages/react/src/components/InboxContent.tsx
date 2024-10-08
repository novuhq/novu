import React from 'react';
import type { NotificationClickHandler, NotificationActionClickHandler, InboxPage } from '@novu/js/ui';
import { Mounter } from './Mounter';
import { NotificationsRenderer } from '../utils/types';
import { useRenderer } from '../context/RendererContext';
import { useNovuUI } from '../context/NovuUIContext';
import { withRenderer } from './Renderer';

export type InboxContentProps = {
  renderNotification?: NotificationsRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  initialPage?: InboxPage;
  hideNav?: boolean;
};

const _InboxContent = React.memo((props: InboxContentProps) => {
  const {
    onNotificationClick,
    onPrimaryActionClick,
    renderNotification,
    onSecondaryActionClick,
    initialPage,
    hideNav,
  } = props;
  const { novuUI } = useNovuUI();
  const { mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'InboxContent',
        element,
        props: {
          renderNotification: renderNotification
            ? (el, notification) => mountElement(el, renderNotification(notification))
            : undefined,
          onNotificationClick,
          onPrimaryActionClick,
          onSecondaryActionClick,
          initialPage,
          hideNav,
        },
      });
    },
    [renderNotification, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick]
  );

  return <Mounter mount={mount} />;
});

export const InboxContent = withRenderer(_InboxContent);
