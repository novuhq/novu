import React from 'react';
import { useRenderer } from '../context/RenderContext';
import { Mounter } from './Mounter';
import type { InboxNotification } from '@novu/js';

type NotificationsRenderProps = (notification: InboxNotification) => React.ReactNode;

type BellProps = {
  children?: never | NotificationsRenderProps;
};

export const Notifications = (props: BellProps) => {
  const { novuUI, mountElement } = useRenderer();

  const mount = React.useCallback((element: HTMLElement) => {
    return novuUI.mountComponent({
      name: 'NotificationList',
      element,
      props: props.children
        ? { mountNotification: (el, { notification }) => mountElement(el, props.children?.(notification)) }
        : undefined,
    });
  }, []);

  return <Mounter mount={mount} />;
};
