'use client';

import { Novu } from '@novu/js';
import { Inbox } from '@novu/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from './Notifications.module.css'; // You'll need to create this

const NotificationToast = () => {
  const novu = useMemo(
    () =>
      new Novu({
        subscriberId: process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID || '',
        applicationIdentifier: process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER || '',
      }),
    []
  );

  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const listener = ({ result: notification }: { result: any }) => {
      console.log('Received notification:', notification);
      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
      }, 2500);
    };

    console.log('Setting up Novu notification listener');
    novu.on('notifications.notification_received', listener);

    return () => {
      novu.off('notifications.notification_received', listener);
    };
  }, [novu]);

  if (!showToast) return null;

  return (
    <div className={styles.toast}>
      <div className={styles.toastContent}>New In-App Notification</div>
    </div>
  );
};

export default NotificationToast;

const novuConfig = {
  applicationIdentifier: process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER || '',
  subscriberId: process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID || '',
  appearance: {
    elements: {
      bellContainer: {
        width: '30px',
        height: '30px',
      },
      bellIcon: {
        width: '30px',
        height: '30px',
      },
    },
  },
};

export function NovuInbox() {
  const router = useRouter();

  return <Inbox {...novuConfig} routerPush={(path: string) => router.push(path)} />;
}
