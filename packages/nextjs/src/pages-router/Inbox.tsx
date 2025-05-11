'use client';

import { InboxProps, Inbox as RInbox } from '@novu/react';
import { useRouter as useAppRouter } from 'next/navigation';
import { useRouter } from 'next/compat/router';

function AppRouterInbox(props: InboxProps) {
  const router = useAppRouter();

  const inboxProps = {
    ...props,
    routerPush: router.push,
  };

  return <RInbox {...inboxProps} />;
}

export function Inbox(props: InboxProps) {
  const router = useRouter();

  if (!router) {
    return <AppRouterInbox {...props} />;
  }

  return <RInbox {...props} />;
}

export { Bell, Preferences, Notifications, InboxContent, NovuProvider } from '@novu/react';
