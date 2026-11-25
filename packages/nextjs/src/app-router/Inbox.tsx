'use client';

import { type InboxProps, Inbox as RInbox } from '@novu/react';
import { useRouter } from 'next/navigation';

export function Inbox(props: InboxProps) {
  const router = useRouter();

  return <RInbox {...props} routerPush={router.push} />;
}
