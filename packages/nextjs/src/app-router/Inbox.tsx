'use client';

import { Inbox as RInbox, type InboxProps } from '@novu/react';
import { useRouter } from 'next/navigation';

export function Inbox(props: InboxProps) {
  const router = useRouter();

  const inboxProps = {
    ...props,
    routerPush: router.push,
  };

  return <RInbox {...inboxProps} />;
}
