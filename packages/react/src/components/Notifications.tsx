import React from 'react';
import type { InboxNotification } from '@novu/js';
import { useRenderer } from '../context/RenderContext';
import { Mounter } from './Mounter';

type NotificationsRenderProps = (notification: InboxNotification) => React.ReactNode;

type BellProps = {
  children?: never | NotificationsRenderProps;
};

export const Notifications = (props: BellProps) => {
  const { novuUI, mountElement } = useRenderer();

  const mount = React.useCallback((element: HTMLElement) => {
    return novuUI.mountComponent({
      name: 'Notifications',
      element,
      props: props.children
        ? { mountNotification: (el, { notification }) => mountElement(el, props.children?.(notification)) }
        : undefined,
    });
  }, []);

  return <Mounter mount={mount} />;
};
