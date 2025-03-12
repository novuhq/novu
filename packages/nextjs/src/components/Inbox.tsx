'use client';

import React from 'react';
import { InboxProps, Inbox as RInbox } from '@novu/react';
import { useRouter } from 'next/compat/router';

export const Inbox = React.memo((props: InboxProps) => {
  let router = useRouter();

  /*
   * The compat version of useRouter returns null instead of throwing an error
   * when used inside app router instead of pages router
   * we use it to detect if the component is used inside pages or app router
   * so we can use the correct algorithm to get the path
   */

  if (!router) {
    router = require('next/navigation').useRouter();
  }

  return <RInbox routerPush={router!.push} {...props} />;
});
