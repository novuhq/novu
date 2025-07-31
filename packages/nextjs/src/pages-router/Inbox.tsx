'use client';

import { InboxProps, Inbox as RInbox } from '@novu/react';
import { buildSubscriber } from '@novu/react/internal';
import { useRouter } from 'next/compat/router';
import { useRouter as useAppRouter } from 'next/navigation';

function AppRouterInbox(props: InboxProps) {
  const router = useAppRouter();
  const { subscriber: subscriberProp, subscriberId: subscriberIdProp, ...restProps } = props;
  const subscriber = buildSubscriber({ subscriberId: subscriberIdProp, subscriber: subscriberProp });

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
  const subscriber = buildSubscriber({ subscriberId: subscriberIdProp, subscriber: subscriberProp });

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

export { Bell, InboxContent, Notifications, NovuProvider, Preferences } from '@novu/react';
