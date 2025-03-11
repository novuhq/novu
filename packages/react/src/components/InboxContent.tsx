import React from 'react';
import type { NotificationClickHandler, NotificationActionClickHandler, InboxPage } from '@novu/js/ui';
import { Mounter } from './Mounter';
import { NoRendererProps, SubjectBodyRendererProps, NotificationRendererProps } from '../utils/types';
import { useRenderer } from '../context/RendererContext';
import { useNovuUI } from '../context/NovuUIContext';
import { withRenderer } from './Renderer';

export type InboxContentProps = {
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  initialPage?: InboxPage;
  hideNav?: boolean;
} & (NotificationRendererProps | SubjectBodyRendererProps | NoRendererProps);

const _InboxContent = React.memo((props: InboxContentProps) => {
  const {
    onNotificationClick,
    onPrimaryActionClick,
    renderNotification,
    renderSubject,
    renderBody,
    onSecondaryActionClick,
    initialPage,
    hideNav,
  } = props;
  const { novuUI } = useNovuUI();
  const { mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      if (renderNotification) {
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
      }

      return novuUI.mountComponent({
        name: 'InboxContent',
        element,
        props: {
          renderSubject: renderSubject
            ? (el, notification) => mountElement(el, renderSubject(notification))
            : undefined,
          renderBody: renderBody ? (el, notification) => mountElement(el, renderBody(notification)) : undefined,
          onNotificationClick,
          onPrimaryActionClick,
          onSecondaryActionClick,
          initialPage,
          hideNav,
        },
      });
    },
    [renderNotification, renderSubject, renderBody, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick]
  );

  return <Mounter mount={mount} />;
});

export const InboxContent = withRenderer(_InboxContent);
