import type { NotificationActionClickHandler, NotificationClickHandler } from '@novu/js/ui';
import React from 'react';
import { useNovuUI } from '../context/NovuUIContext';
import { useRenderer } from '../context/RendererContext';
import { NoRendererProps, NotificationRendererProps, SubjectBodyRendererProps } from '../utils/types';
import { Mounter } from './Mounter';
import { withRenderer } from './Renderer';

export type NotificationProps = {
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
} & (NotificationRendererProps | SubjectBodyRendererProps | NoRendererProps);

const _Notifications = React.memo((props: NotificationProps) => {
  const {
    renderNotification,
    renderAvatar,
    renderSubject,
    renderBody,
    renderDefaultActions,
    renderCustomActions,
    onNotificationClick,
    onPrimaryActionClick,
    onSecondaryActionClick,
  } = props;
  const { novuUI } = useNovuUI();
  const { mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      if (renderNotification) {
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
      }

      return novuUI.mountComponent({
        name: 'Notifications',
        element,
        props: {
          renderAvatar: renderAvatar ? (el, notification) => mountElement(el, renderAvatar(notification)) : undefined,
          renderSubject: renderSubject
            ? (el, notification) => mountElement(el, renderSubject(notification))
            : undefined,
          renderBody: renderBody ? (el, notification) => mountElement(el, renderBody(notification)) : undefined,
          renderDefaultActions: renderDefaultActions
            ? (el, notification) => mountElement(el, renderDefaultActions(notification))
            : undefined,
          renderCustomActions: renderCustomActions
            ? (el, notification) => mountElement(el, renderCustomActions(notification))
            : undefined,
          onNotificationClick,
          onPrimaryActionClick,
          onSecondaryActionClick,
        },
      });
    },
    [
      renderNotification,
      renderAvatar,
      renderSubject,
      renderBody,
      renderDefaultActions,
      renderCustomActions,
      onNotificationClick,
      onPrimaryActionClick,
      onSecondaryActionClick,
    ]
  );

  return <Mounter mount={mount} />;
});

export const Notifications = withRenderer(_Notifications);
