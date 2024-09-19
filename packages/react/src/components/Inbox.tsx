import React, { useMemo } from 'react';
import { useRenderer } from '../context/RenderContext';
import { DefaultProps, DefaultInboxProps, WithChildrenProps } from '../utils/types';
import { NovuProvider, useNovu, useUnsafeNovu } from './index';
import { Mounter } from './Mounter';
import { Renderer } from './Renderer';

export type InboxProps = DefaultProps | WithChildrenProps;

const DefaultInbox = (props: DefaultInboxProps) => {
  const { open, renderNotification, renderBell, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick } =
    props;
  const { novuUI, mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'Inbox',
        props: {
          open,
          renderNotification: renderNotification
            ? (el, notification) => mountElement(el, renderNotification(notification))
            : undefined,
          renderBell: renderBell ? (el, unreadCount) => mountElement(el, renderBell(unreadCount)) : undefined,
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
  const { applicationIdentifier, subscriberId, subscriberHash, backendUrl, socketUrl } = props;
  const novu = useUnsafeNovu();

  if (novu) {
    return <InboxChild {...props} />;
  }

  return (
    <NovuProvider
      applicationIdentifier={applicationIdentifier}
      subscriberId={subscriberId}
      subscriberHash={subscriberHash}
      backendUrl={backendUrl}
      socketUrl={socketUrl}
    >
      <InboxChild {...props} />
    </NovuProvider>
  );
});

export const InboxChild = React.memo((props: InboxProps) => {
  const {
    localization,
    appearance,
    tabs,
    preferencesFilter,
    routerPush,
    applicationIdentifier,
    subscriberId,
    subscriberHash,
    backendUrl,
    socketUrl,
  } = props;
  const novu = useNovu();

  const options = useMemo(() => {
    return {
      localization,
      appearance,
      tabs,
      preferencesFilter,
      routerPush,
      options: { applicationIdentifier, subscriberId, subscriberHash, backendUrl, socketUrl },
    };
  }, [
    localization,
    appearance,
    tabs,
    preferencesFilter,
    applicationIdentifier,
    subscriberId,
    subscriberHash,
    backendUrl,
    socketUrl,
  ]);

  if (isWithChildrenProps(props)) {
    return (
      <Renderer options={options} novu={novu}>
        {props.children}
      </Renderer>
    );
  }

  const { open, renderNotification, renderBell, onNotificationClick, onPrimaryActionClick, onSecondaryActionClick } =
    props;

  return (
    <Renderer options={options} novu={novu}>
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
