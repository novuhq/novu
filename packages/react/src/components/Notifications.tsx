import React from 'react';
import { useRenderer } from '../context/RendererContext';
import { NotificationsRenderProps } from '../utils/types';
import { Mounter } from './Mounter';

export type NotificationProps = {
  children?: never | NotificationsRenderProps;
};

export const Notifications = React.memo((props: NotificationProps) => {
  const { novuUI, mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'Notifications',
        element,
        props: props.children
          ? { mountNotification: (el, { notification }) => mountElement(el, props.children?.(notification)) }
          : undefined,
      });
    },
    [props.children]
  );

  return <Mounter mount={mount} />;
});
