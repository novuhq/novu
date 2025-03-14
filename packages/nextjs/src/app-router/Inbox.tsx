'use client';

import { Inbox as RInbox, type InboxProps } from '@novu/react';
import { useRouter } from 'next/navigation';

export function Inbox(props: InboxProps) {
  const router = useRouter();

  return <RInbox routerPush={router.push} {...props} />;
}

export { Bell, Preferences, Notifications, InboxContent, NovuProvider } from '@novu/react';
