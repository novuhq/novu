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
  const socketUrl = 'socketUrl' in props ? props.socketUrl : undefined;
  const applicationIdentifier = 'applicationIdentifier' in props ? props.applicationIdentifier : undefined;
  const subscriberHash = 'subscriberHash' in props ? props.subscriberHash : undefined;
  const backendUrl = 'backendUrl' in props ? props.backendUrl : undefined;
  const subscriber = buildSubscriber(props);

  const novu = useUnsafeNovu();

  if (novu) {
    return <InboxChild {...props} />;
  }

  const providerProps = {
    applicationIdentifier: applicationIdentifier || '', // for keyless we provide an empty string, the api will generate a identifier
    subscriberHash,
    backendUrl,
    socketUrl,
    subscriber,
  } satisfies StandardNovuOptions;

  return (
    <InternalNovuProvider {...providerProps} userAgentType="components">
      <InboxChild {...props} />
    </InternalNovuProvider>
  );
});

const InboxChild = React.memo((props: InboxProps) => {
  const localization = 'localization' in props ? props.localization : undefined;
  const appearance = 'appearance' in props ? props.appearance : undefined;
  const tabs = 'tabs' in props ? props.tabs : undefined;
  const preferencesFilter = 'preferencesFilter' in props ? props.preferencesFilter : undefined;
  const routerPush = 'routerPush' in props ? props.routerPush : undefined;
  const applicationIdentifier = 'applicationIdentifier' in props ? props.applicationIdentifier : undefined;
  const subscriberId = 'subscriberId' in props ? props.subscriberId : undefined;
  const subscriberHash = 'subscriberHash' in props ? props.subscriberHash : undefined;
  const backendUrl = 'backendUrl' in props ? props.backendUrl : undefined;
  const socketUrl = 'socketUrl' in props ? props.socketUrl : undefined;
  const subscriber = 'subscriber' in props ? props.subscriber : undefined;

  const novu = useNovu();

  const options = useMemo(() => {
    return {
      localization,
      appearance,
      tabs,
      preferencesFilter,
      routerPush,
      options: {
        applicationIdentifier,
        subscriberHash,
        backendUrl,
        socketUrl,
        subscriber: buildSubscriber(props),
      },
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

function buildSubscriber(options: InboxProps): Subscriber {
  // subscriber object
  if ('subscriber' in options && options.subscriber) {
    return typeof options.subscriber === 'string' ? { subscriberId: options.subscriber } : options.subscriber;
  }

  // subscriberId
  if ('subscriberId' in options) {
    return { subscriberId: options.subscriberId as string };
  }

  // keyless subscriber - the api will generate a subscriberId
  return { subscriberId: '' };
}
