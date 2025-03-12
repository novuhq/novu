'use client';

import { InboxProps, Inbox as RInbox } from '@novu/react';
import { useRouter } from 'next/router';

export function Inbox(props: InboxProps) {
  const router = useRouter();

  if (!router) {
    throw new Error(
      `[@novu/nextjs]: Failed to resolve Next.js Page Router. Pleace contact support@novu.co.
      Meanwhile, try using @novu/react instead.`
    );
  }

  return <RInbox routerPush={router.push} {...props} />;
}
