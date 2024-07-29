import type { InboxNotification } from '@novu/js';
import type { BaseNovuUIOptions } from '@novu/js/ui';
import React from 'react';
import { useRenderer } from '../context/RenderContext';

import { Mounter } from './Mounter';
import { Renderer } from './Renderer';

type InboxDefaultProps = {
  renderNotification?: (notification: InboxNotification) => React.ReactNode;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => React.ReactNode;
};

const InboxDefault = (props: InboxDefaultProps) => {
  const { renderNotification, renderBell, ...rest } = props;
  const { novuUI, mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'Inbox',
        props: {
          ...rest,
          mountNotification: renderNotification
            ? (el, { notification }) => {
                return mountElement(el, renderNotification(notification));
              }
            : undefined,
          mountBell: renderBell
            ? (el, { unreadCount }) => {
                return mountElement(el, renderBell({ unreadCount }));
              }
            : undefined,
        },
        element,
      });
    },
    [renderNotification]
  );

  return <Mounter mount={mount} />;
};

type InboxProps = BaseNovuUIOptions &
  (
    | ({
        children?: never;
      } & InboxDefaultProps)
    | {
        children: React.ReactNode;
      }
  );

export const Inbox = (props: InboxProps) => {
  if (props.children) {
    return <Renderer options={props}>{props.children}</Renderer>;
  }

  const { renderNotification, ...options } = props as BaseNovuUIOptions & InboxDefaultProps;

  return (
    <Renderer options={options}>
      <InboxDefault renderNotification={renderNotification} renderBell={options.renderBell} />
    </Renderer>
  );
};
