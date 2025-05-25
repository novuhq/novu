import React, { useMemo } from 'react';
import { Subscriber, StandardNovuOptions } from '@novu/js';
import { DefaultProps, DefaultInboxProps, WithChildrenProps } from '../utils/types';
import { Mounter } from './Mounter';
import { useNovuUI } from '../context/NovuUIContext';
import { useRenderer } from '../context/RendererContext';
import { InternalNovuProvider, useNovu, useUnsafeNovu } from '../hooks/NovuProvider';
import { NovuUI } from './NovuUI';
import { withRenderer } from './Renderer';

export type InboxProps = DefaultProps | WithChildrenProps;

const DefaultInbox = (props: DefaultInboxProps) => {
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

export const Inbox = React.memo((props: InboxProps) => {
  const { subscriberId, ...propsWithoutSubscriberId } = props;
  const subscriber = buildSubscriber(props.subscriber, props.subscriberId);
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
          subscriber: buildSubscriber(subscriber, subscriberId),
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
      props.subscriber,
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
  })
);

function isWithChildrenProps(props: InboxProps): props is WithChildrenProps {
  return 'children' in props;
}

function buildSubscriber(subscriber?: string | Subscriber | undefined, subscriberId?: string): Subscriber {
  // subscriber object
  if (subscriber) {
    return typeof subscriber === 'string' ? { subscriberId: subscriber } : subscriber;
  }

  // subscriberId
  if (subscriberId) {
    return { subscriberId };
  }

  // missing - keyless subscriber, the api will generate a subscriberId
  return { subscriberId: '' };
}
