import React, { useMemo } from 'react';
import { DefaultProps, DefaultInboxProps, WithChildrenProps } from '../utils/types';
import { Mounter } from './Mounter';
import { useNovuUI } from '../context/NovuUIContext';
import { useRenderer } from '../context/RendererContext';
import { InternalNovuProvider, useNovu, useUnsafeNovu } from '../hooks/NovuProvider';
import { NovuUI } from './NovuUI';
import { withRenderer } from './Renderer';

export type InboxProps = DefaultProps | WithChildrenProps;

const _DefaultInbox = (props: DefaultInboxProps) => {
  const {
    open,
    renderNotification,
    renderSubject,
    renderBody,
    renderBell,
    onNotificationClick,
    onPrimaryActionClick,
    onSecondaryActionClick,
    placement,
    placementOffset,
  } = props;
  const { novuUI } = useNovuUI();
  const { mountElement } = useRenderer();

  const mount = React.useCallback(
    (element: HTMLElement) => {
      if (renderNotification) {
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
            placementOffset,
            placement,
          },
          element,
        });
      }

      return novuUI.mountComponent({
        name: 'Inbox',
        props: {
          open,
          renderSubject: renderSubject
            ? (el, notification) => mountElement(el, renderSubject(notification))
            : undefined,
          renderBody: renderBody ? (el, notification) => mountElement(el, renderBody(notification)) : undefined,
          renderBell: renderBell ? (el, unreadCount) => mountElement(el, renderBell(unreadCount)) : undefined,
          onNotificationClick,
          onPrimaryActionClick,
          onSecondaryActionClick,
          placementOffset,
          placement,
        },
        element,
      });
    },
    [
      open,
      renderNotification,
      renderSubject,
      renderBody,
      renderBell,
      onNotificationClick,
      onPrimaryActionClick,
      onSecondaryActionClick,
    ]
  );

  return <Mounter mount={mount} />;
};

const DefaultInbox = withRenderer(_DefaultInbox);

export const Inbox = React.memo((props: InboxProps) => {
  const { applicationIdentifier, subscriberId, subscriberHash, backendUrl, socketUrl } = props;
  const novu = useUnsafeNovu();

  if (novu) {
    return <InboxChild {...props} />;
  }

  return (
    <InternalNovuProvider
      applicationIdentifier={applicationIdentifier}
      subscriberId={subscriberId}
      subscriberHash={subscriberHash}
      backendUrl={backendUrl}
      socketUrl={socketUrl}
      userAgentType="components"
    >
      <InboxChild {...props} />
    </InternalNovuProvider>
  );
});

const InboxChild = React.memo((props: InboxProps) => {
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
      <NovuUI options={options} novu={novu}>
        {props.children}
      </NovuUI>
    );
  }

  const {
    open,
    renderNotification,
    renderSubject,
    renderBody,
    renderBell,
    onNotificationClick,
    onPrimaryActionClick,
    onSecondaryActionClick,
    placementOffset,
    placement,
  } = props;

  return (
    <NovuUI options={options} novu={novu}>
      <DefaultInbox
        open={open}
        renderNotification={renderNotification}
        renderSubject={renderSubject}
        renderBody={renderBody}
        renderBell={renderBell}
        onNotificationClick={onNotificationClick}
        onPrimaryActionClick={onPrimaryActionClick}
        onSecondaryActionClick={onSecondaryActionClick}
        placement={placement}
        placementOffset={placementOffset}
      />
    </NovuUI>
  );
});

function isWithChildrenProps(props: InboxProps): props is WithChildrenProps {
  return 'children' in props;
}
