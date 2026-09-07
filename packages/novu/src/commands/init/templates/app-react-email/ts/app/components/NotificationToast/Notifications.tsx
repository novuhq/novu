'use client';

import { Inbox } from '@novu/nextjs';
import { useRouter } from 'next/navigation';

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
