'use client';

import React from 'react';
import { InboxProps, Inbox as RInbox } from '@novu/react';
import { useRouter } from 'next/navigation';

export const Inbox = React.memo((props: InboxProps) => {
  const router = useRouter();

  return (
    <RInbox {...props} routerPush={props.routerPush ?? router.push}>
      {props.children}
    </RInbox>
  );
});
