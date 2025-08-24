import { StandardNovuOptions } from '@novu/js';
import { buildSubscriber } from '@novu/js/internal';
import React, { useMemo } from 'react';
import { useNovuUI } from '../context/NovuUIContext';
import { useRenderer } from '../context/RendererContext';
import { InternalNovuProvider, useNovu, useUnsafeNovu } from '../hooks/NovuProvider';
import { DefaultInboxProps, DefaultProps, WithChildrenProps } from '../utils/types';
import { Mounter } from './Mounter';
import { NovuUI } from './NovuUI';
import { withRenderer } from './Renderer';

export type InboxProps = DefaultProps | WithChildrenProps;

const DefaultInbox = (props: DefaultInboxProps) => {
  const {
    open,
    renderNotification,
    renderAvatar,
    renderSubject,
    renderBody,
    renderDefaultActions,
    renderCustomActions,
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
          renderAvatar: renderAvatar ? (el, notification) => mountElement(el, renderAvatar(notification)) : undefined,
          renderSubject: renderSubject
            ? (el, notification) => mountElement(el, renderSubject(notification))
            : undefined,
          renderBody: renderBody ? (el, notification) => mountElement(el, renderBody(notification)) : undefined,
          renderDefaultActions: renderDefaultActions
            ? (el, notification) => mountElement(el, renderDefaultActions(notification))
            : undefined,
          renderCustomActions: renderCustomActions
            ? (el, notification) => mountElement(el, renderCustomActions(notification))
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
    },
    [
      open,
      renderNotification,
      renderAvatar,
      renderSubject,
      renderBody,
      renderDefaultActions,
      renderCustomActions,
      renderBell,
      onNotificationClick,
      onPrimaryActionClick,
      onSecondaryActionClick,
    ]
  );

  return <Mounter mount={mount} />;
};

export const Inbox = React.memo((props: InboxProps) => {
  const { subscriberId, ...propsWithoutSubscriberId } = props;
  const subscriber = buildSubscriber({ subscriberId: props.subscriberId, subscriber: props.subscriber });
  const applicationIdentifier = props.applicationIdentifier ? props.applicationIdentifier : ''; // for keyless we provide an empty string, the api will generate a identifier
  const novu = useUnsafeNovu();

  if (novu) {
    return (
      <InboxChild {...propsWithoutSubscriberId} applicationIdentifier={applicationIdentifier} subscriber={subscriber} />
    );
  }

  const providerProps = {
    applicationIdentifier,
    subscriberHash: props.subscriberHash,
    backendUrl: props.backendUrl,
    socketUrl: props.socketUrl,
    subscriber,
  } satisfies StandardNovuOptions;

  return (
    <InternalNovuProvider {...providerProps} userAgentType="components">
      <InboxChild {...propsWithoutSubscriberId} applicationIdentifier={applicationIdentifier} subscriber={subscriber} />
    </InternalNovuProvider>
  );
});

const InboxChild = withRenderer(
  React.memo((props: InboxProps) => {
    const {
      localization,
      appearance,
      tabs,
      preferencesFilter,
      preferenceGroups,
      routerPush,
      applicationIdentifier = '', // for keyless we provide an empty string, the api will generate a identifier
      subscriberId,
      subscriberHash,
      backendUrl,
      socketUrl,
      subscriber,
    } = props;
    const novu = useNovu();

    const options = useMemo(() => {
      return {
        localization,
        appearance,
        tabs,
        preferencesFilter,
        preferenceGroups,
        routerPush,
        options: {
          applicationIdentifier,
          subscriberHash,
          backendUrl,
          socketUrl,
          subscriber: buildSubscriber({ subscriberId, subscriber }),
        },
      };
    }, [
      localization,
      appearance,
      tabs,
      preferencesFilter,
      preferenceGroups,
      applicationIdentifier,
      subscriberId,
      subscriberHash,
      backendUrl,
      socketUrl,
      subscriber,
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
      renderAvatar,
      renderSubject,
      renderBody,
      renderDefaultActions,
      renderCustomActions,
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
          renderAvatar={renderAvatar}
          renderSubject={renderSubject}
          renderBody={renderBody}
          renderDefaultActions={renderDefaultActions}
          renderCustomActions={renderCustomActions}
          renderBell={renderBell}
          onNotificationClick={onNotificationClick}
          onPrimaryActionClick={onPrimaryActionClick}
          onSecondaryActionClick={onSecondaryActionClick}
          placement={placement}
          placementOffset={placementOffset}
        />
      </NovuUI>
    );
  })
);

function isWithChildrenProps(props: InboxProps): props is WithChildrenProps {
  return 'children' in props;
}
