import React from 'react';
import type { NotificationClickHandler, NotificationActionClickHandler } from '@novu/js/ui';
import { Mounter } from './Mounter';
import { NoRendererProps, NotificationRendererProps, SubjectBodyRendererProps } from '../utils/types';
import { useRenderer } from '../context/RendererContext';
import { useNovuUI } from '../context/NovuUIContext';
import { withRenderer } from './Renderer';

export type NotificationProps = {
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
} & (NotificationRendererProps | SubjectBodyRendererProps | NoRendererProps);

const _Notifications = React.memo((props: NotificationProps) => {
  const {
    renderNotification,
    renderSubject,
    renderBody,
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
          renderSubject: renderSubject
            ? (el, notification) => mountElement(el, renderSubject(notification))
            : undefined,
          renderBody: renderBody ? (el, notification) => mountElement(el, renderBody(notification)) : undefined,
          onNotificationClick,
          onPrimaryActionClick,
          onSecondaryActionClick,
        },
      });
    },
    [renderNotification, renderSubject, renderBody, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick]
  );

  return <Mounter mount={mount} />;
});

export const Notifications = withRenderer(_Notifications);
