import React from 'react';
import { useRenderer } from '../context/RenderContext';
import { DefaultProps, DefaultInboxProps, WithChildrenProps } from '../utils/types';
import { Mounter } from './Mounter';
import { Renderer } from './Renderer';

export type InboxProps = DefaultProps | WithChildrenProps;

const DefaultInbox = ({
  open,
  renderNotification,
  renderBell,
  onNotificationClick,
  onPrimaryActionClick,
  onSecondaryActionClick,
}: DefaultInboxProps) => {
  const { novuUI, mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'Inbox',
        props: {
          open,
          mountNotification: renderNotification
            ? (el, { notification }) => mountElement(el, renderNotification({ notification }))
            : undefined,
          mountBell: renderBell ? (el, { unreadCount }) => mountElement(el, renderBell({ unreadCount })) : undefined,
          onNotificationClick,
          onPrimaryActionClick,
          onSecondaryActionClick,
        },
        element,
      });
    },
    [open, renderNotification, renderBell, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick]
  );

  return <Mounter mount={mount} />;
};

export const Inbox = React.memo((props: InboxProps) => {
  if (isWithChildrenProps(props)) {
    const { children, ...options } = props;

    return <Renderer options={options}>{children}</Renderer>;
  }

  const {
    open,
    renderNotification,
    renderBell,
    onNotificationClick,
    onPrimaryActionClick,
    onSecondaryActionClick,
    ...options
  } = props;

  return (
    <Renderer options={options}>
      <DefaultInbox
        open={open}
        renderNotification={renderNotification}
        renderBell={renderBell}
        onNotificationClick={onNotificationClick}
        onPrimaryActionClick={onPrimaryActionClick}
        onSecondaryActionClick={onSecondaryActionClick}
      />
    </Renderer>
  );
});

function isWithChildrenProps(props: InboxProps): props is WithChildrenProps {
  return 'children' in props;
}
