'use client';

import React from 'react';
import { InboxProps, Inbox as RInbox } from '@novu/react';
import { useRouter as usePageRouter } from 'next/compat/router';
import { useRouter as useAppRouter } from 'next/navigation';

export const Inbox = React.memo((props: InboxProps) => {
  let router: ReturnType<typeof usePageRouter> | ReturnType<typeof useAppRouter> = usePageRouter();
  /*
   * The compat version of useRouter returns null instead of throwing an error
   * when used inside app router instead of pages router
   * we use it to detect if the component is used inside pages or app router
   * so we can use the correct algorithm to get the path
   */

  if (!router) {
    router = useAppRouter();
  }

  if (!router) {
    throw new Error(
      `[@novu/nextjs]: Failed to resolve Next.js Page or App Router. Pleace contact support@novu.co.
      Meanwhile, try using @novu/react instead.`
    );
  }

  return <RInbox routerPush={router.push} {...props} />;
});
