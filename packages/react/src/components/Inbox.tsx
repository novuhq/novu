import React from 'react';
import type { InboxNotification } from '@novu/js';
import type { BaseNovuUIOptions } from '@novu/js/ui';
import { useRenderer } from '../context/RenderContext';
import { Mounter } from './Mounter';
import { Renderer } from './Renderer';

type InboxDefaultProps = {
  renderNotification?: (notification: InboxNotification) => React.ReactNode;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => React.ReactNode;
};

const InboxDefault = (props: InboxDefaultProps) => {
  const { renderNotification, renderBell } = props;
  const { novuUI, mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'Inbox',
        props: {
          renderNotification: renderNotification
            ? (el, { notification }) => mountElement(el, renderNotification(notification))
            : undefined,
          renderBell: renderBell ? (el, { unreadCount }) => mountElement(el, renderBell({ unreadCount })) : undefined,
        },
        element,
      });
    },
    [renderNotification, renderBell]
  );

  return <Mounter mount={mount} />;
};

type BaseProps = BaseNovuUIOptions;

type DefaultProps = BaseProps &
  InboxDefaultProps & {
    children?: never;
  };

type WithChildrenProps = BaseProps & {
  children: React.ReactNode;
};

type InboxProps = DefaultProps | WithChildrenProps;

export const Inbox = (props: InboxProps) => {
  if ('children' in props) {
    const { children, ...options } = props as WithChildrenProps;

    return <Renderer options={options}>{children}</Renderer>;
  }

  const { renderNotification, renderBell, ...options } = props;

  return (
    <Renderer options={options}>
      <InboxDefault renderNotification={renderNotification} renderBell={renderBell} />
    </Renderer>
  );
};
