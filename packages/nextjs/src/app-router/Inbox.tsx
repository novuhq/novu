'use client';

import { type InboxProps, Inbox as RInbox } from '@novu/react';
import { buildSubscriber } from '@novu/react/internal';
import { useRouter } from 'next/navigation';

export function Inbox(props: InboxProps) {
  const router = useRouter();
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
