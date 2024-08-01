import React from 'react';
import { useRenderer } from '../context/RenderContext';
import { DefaultProps, DefaultInboxProps, WithChildrenProps } from '../utils/types';
import { Mounter } from './Mounter';
import { Renderer } from './Renderer';

export type InboxProps = DefaultProps | WithChildrenProps;

const DefaultInbox = (props: DefaultInboxProps) => {
  const { renderNotification, renderBell } = props;
  const { novuUI, mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'Inbox',
        props: {
          mountNotification: renderNotification
            ? (el, { notification }) => mountElement(el, renderNotification(notification))
            : undefined,
          mountBell: renderBell ? (el, { unreadCount }) => mountElement(el, renderBell({ unreadCount })) : undefined,
        },
        element,
      });
    },
    [renderNotification, renderBell]
  );

  return <Mounter mount={mount} />;
};

export const Inbox = React.memo((props: InboxProps) => {
  if (isWithChildrenProps(props)) {
    const { children, ...options } = props;

    return <Renderer options={options}>{children}</Renderer>;
  }

  const { renderNotification, renderBell, ...options } = props;

  return (
    <Renderer options={options}>
      <DefaultInbox renderNotification={renderNotification} renderBell={renderBell} />
    </Renderer>
  );
});

function isWithChildrenProps(props: InboxProps): props is WithChildrenProps {
  return 'children' in props;
}
