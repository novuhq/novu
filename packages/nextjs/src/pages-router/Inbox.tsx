'use client';

import { InboxProps, Inbox as RInbox } from '@novu/react';
import { useRouter as useAppRouter } from 'next/navigation';
import { useRouter } from 'next/compat/router';

function AppRouterInbox(props: InboxProps) {
  const router = useAppRouter();
  const { subscriber: subscriberProp, subscriberId: subscriberIdProp, ...restProps } = props;
  const subscriber = buildSubscriber(subscriberIdProp, subscriberProp);

  const inboxProps = {
    ...restProps,
    applicationIdentifier: props.applicationIdentifier!,
    subscriber,
    routerPush: router.push,
  };

  return <RInbox {...inboxProps} />;
}

export function Inbox(props: InboxProps) {
  const router = useRouter();
  const { subscriber: subscriberProp, subscriberId: subscriberIdProp, ...restProps } = props;
  const subscriber = buildSubscriber(subscriberIdProp, subscriberProp);

  const inboxProps = {
    ...restProps,
    applicationIdentifier: props.applicationIdentifier!,
    subscriber,
  };

  if (!router) {
    return <AppRouterInbox {...inboxProps} />;
  }

  return <RInbox {...inboxProps} />;
}

function buildSubscriber(subscriberId: string | undefined, subscriber: any | string | undefined): any {
  let subscriberObj: any;

  if (subscriber) {
    subscriberObj = typeof subscriber === 'string' ? { subscriberId: subscriber } : subscriber;
  } else {
    subscriberObj = { subscriberId: subscriberId as string };
  }

  return subscriberObj;
}

export { Bell, Preferences, Notifications, InboxContent, NovuProvider } from '@novu/react';
