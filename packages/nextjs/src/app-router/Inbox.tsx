'use client';

import { Inbox as RInbox, type InboxProps } from '@novu/react';
import { useRouter } from 'next/navigation';

export function Inbox(props: InboxProps) {
  const router = useRouter();
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

function buildSubscriber(subscriberId: string | undefined, subscriber: any | string | undefined): any {
  let subscriberObj: any;

  if (subscriber) {
    subscriberObj = typeof subscriber === 'string' ? { subscriberId: subscriber } : subscriber;
  } else {
    subscriberObj = { subscriberId: subscriberId as string };
  }

  return subscriberObj;
}
