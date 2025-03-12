'use client';

import type { InboxProps } from '@novu/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import the Novu Inbox component with SSR disabled
const NovuInbox = dynamic(
  async () => {
    const { Inbox: RInbox } = await import('@novu/react');

    return { default: RInbox };
  },
  { ssr: false }
);

export function Inbox(props: InboxProps) {
  const router = useRouter();

  return <NovuInbox {...props} routerPush={router.push} />;
}

export const Bell = dynamic(
  async () => {
    const { Bell: RBell } = await import('@novu/react');

    return { default: RBell };
  },
  { ssr: false }
);

export const InboxContent = dynamic(
  async () => {
    const { InboxContent: RInboxContent } = await import('@novu/react');

    return { default: RInboxContent };
  },
  { ssr: false }
);

export const Notifications = dynamic(
  async () => {
    const { Notifications: RNotifications } = await import('@novu/react');

    return { default: RNotifications };
  },
  { ssr: false }
);

export const Preferences = dynamic(
  async () => {
    const { Preferences: RPreferences } = await import('@novu/react');

    return { default: RPreferences };
  },
  { ssr: false }
);

export type {
  BaseProps,
  BellProps,
  BellRenderer,
  DefaultInboxProps,
  DefaultProps,
  InboxContentProps,
  InboxProps,
  NotificationProps,
  NotificationsRenderer,
  WithChildrenProps,
  Notification,
} from '@novu/react';
