'use client';

import { InboxProps, Inbox as RInbox } from '@novu/react';
import { useRouter } from 'next/compat/router';
import { useRouter as useAppRouter } from 'next/navigation';

function AppRouterInbox(props: InboxProps) {
  const router = useAppRouter();
  const inboxProps = {
    ...props,
    applicationIdentifier: props.applicationIdentifier!,
    routerPush: router.push,
  };

  return <RInbox {...inboxProps} />;
}

export function Inbox(props: InboxProps) {
  const router = useRouter();

  const inboxProps = {
    ...props,
    applicationIdentifier: props.applicationIdentifier!,
  };

  if (!router) {
    return <AppRouterInbox {...inboxProps} />;
  }

  return <RInbox {...inboxProps} />;
}

export { Bell, InboxContent, Notifications, NovuProvider, Preferences } from '@novu/react';
