'use client';

import { InboxProps, Inbox as RInbox } from '@novu/react';
import { useRouter } from 'next/compat/router';
import { useRouter as useAppRouter } from 'next/navigation';

function AppRouterInbox(props: InboxProps) {
  const router = useAppRouter();
  return <RInbox {...props} routerPush={router.push} />;
}

export function Inbox(props: InboxProps) {
  const router = useRouter();

  if (!router) {
    return <AppRouterInbox {...props} />;
  }

  return <RInbox {...props} />;
}

export { Bell, InboxContent, Notifications, NovuProvider, Preferences } from '@novu/react';
